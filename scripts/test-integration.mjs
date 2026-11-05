import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer as httpServer } from "node:http";
import { createServer as netServer } from "node:net";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { config } from "dotenv";
import EmbeddedPostgres from "embedded-postgres";
import { SMTPServer } from "smtp-server";
import { PrismaClient } from "@prisma/client";

config({ quiet: true });
const live = process.argv.includes("--live-claude");
const mobile = process.argv.includes("--mobile");
const mobileFilter = process.argv
  .find((arg) => arg.startsWith("--grep="))
  ?.slice(7);
if (live && !process.env.ANTHROPIC_API_KEY)
  throw new Error("Zet ANTHROPIC_API_KEY lokaal in .env voor de live-test.");
const root = process.cwd();
const runDir = resolve(root, ".test-data", `integration-${Date.now()}`);
await mkdir(runDir, { recursive: true });
async function freePort() {
  const server = netServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = server.address().port;
  await new Promise((r) => server.close(r));
  return port;
}
const [pgPort, smtpPort, apiPort, aiPort, webPort] = await Promise.all([
  freePort(),
  freePort(),
  freePort(),
  freePort(),
  freePort(),
]);
const password = randomBytes(24).toString("hex");
const databaseUrl = `postgresql://sterk:${password}@127.0.0.1:${pgPort}/sterk_test`;
const origin = mobile ? `http://127.0.0.1:${webPort}` : "http://127.0.0.1:5173";
const env = {
  ...process.env,
  DATABASE_URL: databaseUrl,
  JWT_SECRET: randomBytes(32).toString("hex"),
  WEB_ORIGIN: origin,
  PORT: String(apiPort),
  NODE_ENV: "test",
  SMTP_HOST: "127.0.0.1",
  SMTP_PORT: String(smtpPort),
  SMTP_USER: "",
  SMTP_PASS: "",
  SMTP_FROM: "Sterk Test <noreply@example.test>",
  ANTHROPIC_API_KEY: "local-contract-test",
  ANTHROPIC_BASE_URL: `http://127.0.0.1:${aiPort}`,
  AI_DAILY_LIMIT: "2",
  API_RATE_LIMIT: "1000",
};
const pg = new EmbeddedPostgres({
  databaseDir: resolve(runDir, "postgres"),
  user: "sterk",
  password,
  port: pgPort,
  persistent: true,
  authMethod: "scram-sha-256",
  initdbFlags: ["--encoding=UTF8"],
  postgresFlags: ["-h", "127.0.0.1"],
  onLog: () => {},
  onError: () => {},
});
const mail = [];
const smtp = new SMTPServer({
  secure: false,
  disabledCommands: ["AUTH", "STARTTLS"],
  onData(stream, _session, callback) {
    let raw = "";
    stream.on("data", (chunk) => (raw += chunk.toString()));
    stream.on("end", () => {
      mail.push(raw.replace(/=\r?\n/g, "").replace(/=3D/g, "="));
      callback();
    });
  },
});
const fixture = JSON.parse(
  await readFile(resolve(root, "apps/web/src/nl.json"), "utf8"),
).demoPlan;
let aiCalls = 0,
  aiMode = "retry";
const mock = httpServer(async (req, res) => {
  let body = "";
  for await (const chunk of req) body += chunk;
  const request = JSON.parse(body);
  assert.equal(req.url, "/v1/messages");
  assert.ok(JSON.parse(request.messages[0].content).nutrition.calories > 0);
  aiCalls++;
  if (aiMode === "provider-error") {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        type: "error",
        error: {
          type: "invalid_request_error",
          message:
            "Your credit balance is too low to access the Anthropic API.",
        },
      }),
    );
    return;
  }
  const text =
    aiMode === "invalid" || (aiMode === "retry" && aiCalls === 1)
      ? "{invalid json"
      : JSON.stringify(fixture);
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      id: "msg_test",
      type: "message",
      role: "assistant",
      model: "local-test",
      content: [{ type: "text", text }],
      stop_reason: "end_turn",
      stop_sequence: null,
      usage: { input_tokens: 100, output_tokens: 200 },
    }),
  );
});
let apiProcess,
  webProcess,
  db,
  pgStarted = false;
const checks = [];
function passed(label) {
  checks.push(label);
  process.stdout.write(`PASS ${label}\n`);
}
async function command(args, extra = {}) {
  const child = spawn(process.execPath, args, {
    cwd: root,
    env: { ...env, ...extra },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (c) => {
    output += c;
    if (args[0].includes("playwright")) process.stdout.write(c);
  });
  child.stderr.on("data", (c) => (output += c));
  const [code] = await once(child, "exit");
  if (code !== 0)
    throw new Error(`Subcommand failed: ${args[0]}\n${output.slice(-2200)}`);
}
async function startApi(extra = {}) {
  apiProcess = spawn(
    process.execPath,
    ["--import", "tsx", "apps/api/src/index.ts"],
    {
      cwd: root,
      env: { ...env, ...extra },
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let errors = "";
  apiProcess.stderr.on("data", (chunk) => (errors += chunk));
  for (let i = 0; i < 100; i++) {
    if (apiProcess.exitCode !== null)
      throw new Error(`API failed to start: ${errors.slice(-1000)}`);
    try {
      if ((await fetch(`http://127.0.0.1:${apiPort}/api/health`)).ok) return;
    } catch {
      /* wait for the server */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("API start timed out.");
}
async function stopApi() {
  if (apiProcess && apiProcess.exitCode === null) {
    const stopped = once(apiProcess, "exit");
    apiProcess.kill();
    await stopped;
  }
  apiProcess = undefined;
}
let cookies = new Map();
async function request(
  path,
  method = "GET",
  body,
  expected = 200,
  custom = {},
) {
  const response = await fetch(`http://127.0.0.1:${apiPort}/api${path}`, {
    method,
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; "),
      ...custom,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  for (const item of response.headers.getSetCookie()) {
    const pair = item.split(";")[0];
    const idx = pair.indexOf("=");
    cookies.set(pair.slice(0, idx), pair.slice(idx + 1));
  }
  const data = await response.json();
  assert.equal(
    response.status,
    expected,
    `${method} ${path}: ${data?.error ?? response.status}`,
  );
  return { data, response };
}
function emailToken(kind) {
  const raw = mail.at(-1) ?? "";
  const match = raw.match(new RegExp(`/${kind}\\?token=([a-f0-9]{64})`));
  assert.ok(match, `${kind} email contains usable link`);
  return match[1];
}
const email = `integration-${Date.now()}@example.test`,
  oldPassword = "Only-A-Fictitious-Test-Password-927!",
  newPassword = "Changed-Fictitious-Test-Password-638!";
try {
  await pg.initialise();
  await pg.start();
  pgStarted = true;
  await pg.createDatabase("sterk_test");
  await command(["node_modules/prisma/build/index.js", "migrate", "deploy"]);
  await command(["--import", "tsx", "prisma/seed.ts"]);
  db = new PrismaClient({ datasourceUrl: databaseUrl });
  assert.ok((await db.exercise.count()) >= 50);
  passed("PostgreSQL migrations and exercise seed");
  await new Promise((r) => smtp.listen(smtpPort, "127.0.0.1", r));
  mock.listen(aiPort, "127.0.0.1");
  await once(mock, "listening");
  await startApi();
  await request(
    "/auth/register",
    "POST",
    { email, password: oldPassword, name: "Testgebruiker" },
    202,
  );
  assert.equal(mail.length, 1);
  const verification = emailToken("verify");
  const created = await db.user.findUniqueOrThrow({ where: { email } });
  assert.notEqual(created.password, oldPassword);
  assert.notEqual((await db.actionToken.findFirst()).hash, verification);
  await request("/auth/login", "POST", { email, password: oldPassword }, 403);
  await request("/auth/verify", "POST", { token: verification });
  await request("/auth/verify", "POST", { token: verification }, 400);
  passed("Registration, SMTP verification delivery and single-use token");
  const login = await request("/auth/login", "POST", {
    email,
    password: oldPassword,
  });
  assert.ok(
    login.response.headers
      .getSetCookie()
      .every((c) => c.includes("HttpOnly") && c.includes("SameSite=Strict")),
  );
  assert.equal((await request("/me")).data.email, email);
  await request("/admin", "GET", undefined, 403);
  passed("Login, httpOnly cookies and admin authorization");
  const staleAccess = cookies.get("access"),
    oldRefresh = cookies.get("refresh");
  await request("/auth/refresh", "POST", {});
  assert.notEqual(cookies.get("refresh"), oldRefresh);
  const validCookies = new Map(cookies);
  cookies = new Map([["refresh", oldRefresh]]);
  await request("/auth/refresh", "POST", {}, 401);
  cookies = new Map([["access", staleAccess]]);
  await request("/me", "GET", undefined, 401);
  cookies = validCookies;
  passed("Refresh rotation rejects replay and replaced access session");
  const { defaultProfile } = await import("../packages/shared/schema.ts");
  await request("/profile", "PUT", defaultProfile);
  await request("/profile", "PUT", { ...defaultProfile, age: 17 }, 400);
  await request("/profile", "PUT", defaultProfile, 403, {
    Origin: "https://example.invalid",
  });
  await request(
    "/progress",
    "POST",
    { weight: 81.2, waist: 84, notes: "Fictieve testmeting" },
    201,
  );
  passed("Intake validation, Origin protection and progress storage");
  const generated = (await request("/generate", "POST", {})).data;
  assert.equal(aiCalls, 2);
  assert.equal(generated.version, 1);
  assert.equal(await db.workoutPlan.count(), 1);
  assert.equal(await db.mealPlan.count(), 1);
  assert.equal((await request("/plan")).data.version, 1);
  passed("Claude SDK contract: invalid JSON retry and relational plan version");
  aiMode = "invalid";
  await request("/generate", "POST", { feedback: "Fictieve aanpassing" }, 500);
  assert.equal(aiCalls, 4);
  assert.equal(await db.aIGeneration.count({ where: { status: "failed" } }), 1);
  assert.equal(await db.workoutPlan.count(), 1);
  passed("Invalid AI output leaves failed audit record, no partial plans");
  await stopApi();
  await startApi();
  await request("/generate", "POST", {}, 429);
  passed("Daily AI quota survives API restart");
  await request("/workout-log", "PUT", {
    dayKey: "2026-11-05:v1:w0:d0",
    completed: true,
    sets: [{ exercise: "Bankdrukken", number: 1, reps: 10, weight: 40 }],
  });
  await request("/meal-log", "PUT", { mealKey: "0", checked: true });
  await request("/meal-log", "PUT", { mealKey: "0", checked: true });
  const activity = (await request("/activity")).data;
  assert.equal(activity.workouts.length, 1);
  assert.equal(activity.workouts[0].sets.length, 1);
  assert.equal(activity.meals.length, 1);
  const exported = (await request("/export")).data;
  assert.equal(exported.progress.length, 1);
  assert.equal(exported.workouts.length, 1);
  assert.equal("password" in exported, false);
  assert.equal("tokens" in exported, false);
  passed(
    "Workout sets, idempotent meal logging and complete private data export",
  );
  const preResetAccess = cookies.get("access");
  await request("/auth/forgot", "POST", { email });
  const reset = emailToken("reset");
  await request("/auth/reset", "POST", { token: reset, password: newPassword });
  await request("/me", "GET", undefined, 401, {
    Cookie: `access=${preResetAccess}`,
  });
  await request("/auth/login", "POST", { email, password: oldPassword }, 401);
  await request("/auth/login", "POST", { email, password: newPassword });
  passed(
    "SMTP password reset invalidates password and existing access sessions",
  );
  const beforeLogout = cookies.get("access");
  await request("/auth/logout", "POST", {});
  await request("/me", "GET", undefined, 401, {
    Cookie: `access=${beforeLogout}`,
  });
  await request("/auth/login", "POST", { email, password: newPassword });
  passed("Logout invalidates copied access cookie");
  if (mobile) {
    const authState = resolve(runDir, "browser-session.json");
    const state = () => ({
      cookies: [...cookies].map(([name, value]) => ({
        name,
        value,
        domain: "127.0.0.1",
        path: "/api",
        expires: -1,
        httpOnly: true,
        secure: false,
        sameSite: "Strict",
      })),
      origins: [],
    });
    await writeFile(authState, JSON.stringify(state()));
    const savedCookies = new Map(cookies);
    const adminUser = await db.user.create({
      data: {
        email: `admin-${Date.now()}@example.test`,
        name: "Testbeheerder",
        password: created.password,
        verified: true,
        role: "admin",
      },
    });
    cookies = new Map();
    await request("/auth/login", "POST", {
      email: adminUser.email,
      password: oldPassword,
    });
    const adminState = resolve(runDir, "admin-session.json");
    await writeFile(adminState, JSON.stringify(state()));
    cookies = savedCookies;
    webProcess = spawn(
      process.execPath,
      [
        resolve(root, "node_modules/vite/bin/vite.js"),
        "--config",
        resolve(root, "apps/web/vite.config.ts"),
        "--host",
        "127.0.0.1",
        "--port",
        String(webPort),
        "--strictPort",
      ],
      {
        cwd: resolve(root, "apps/web"),
        env: { ...env, API_PROXY_TARGET: `http://127.0.0.1:${apiPort}` },
        windowsHide: true,
        stdio: "ignore",
      },
    );
    // Resolve executable/config paths from the workspace while Vite serves apps/web.
    for (let i = 0; i < 100; i++) {
      if (webProcess.exitCode !== null)
        throw new Error("Vite test server failed to start.");
      try {
        if ((await fetch(origin)).ok) break;
      } catch {
        /* wait */
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    await command(
      [
        "node_modules/@playwright/test/cli.js",
        "test",
        ...(mobileFilter ? ["--grep", mobileFilter] : []),
      ],
      {
        TEST_BASE_URL: origin,
        TEST_AUTH_STATE: authState,
        TEST_ADMIN_STATE: adminState,
        TEST_USER_EMAIL: email,
        TEST_USER_PASSWORD: newPassword,
        PLAYWRIGHT_BROWSERS_PATH: resolve(root, ".test-data/browsers"),
      },
    );
    passed(
      `Mobile browser suite at 320, 375, 768 and 1440 pixels${mobileFilter ? ` (filter: ${mobileFilter})` : ""}`,
    );
  }
  await stopApi();
  await startApi({ AI_DAILY_LIMIT: "5" });
  aiMode = "provider-error";
  const providerFailure = await request("/generate", "POST", {}, 503);
  assert.equal(
    providerFailure.data.error,
    "De AI-dienst is tijdelijk niet beschikbaar. Je vorige schema blijft bewaard.",
  );
  assert.equal((await request("/plan")).data.version, 1);
  assert.equal(await db.workoutPlan.count(), 1);
  passed("Provider credit errors are sanitized and preserve the previous plan");
  if (live) {
    await stopApi();
    await startApi({
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      ANTHROPIC_BASE_URL: "https://api.anthropic.com",
      AI_DAILY_LIMIT: "5",
    });
    await request("/generate", "POST", {
      feedback:
        "Dit is een fictief integratietestprofiel. Genereer het gevraagde veilige schema.",
    });
    assert.equal(await db.workoutPlan.count(), 2);
    passed("LIVE Claude API and persisted second plan version");
  }
  const other = await db.user.create({
    data: {
      email: `other-${Date.now()}@example.test`,
      name: "Andere testgebruiker",
      password: created.password,
      verified: true,
    },
  });
  const primaryCookies = new Map(cookies);
  cookies = new Map();
  await request("/auth/login", "POST", {
    email: other.email,
    password: oldPassword,
  });
  assert.equal((await request("/progress")).data.length, 0);
  assert.equal((await request("/plan")).data, null);
  await request("/export").then((r) => assert.equal(r.data.email, other.email));
  cookies = primaryCookies;
  passed("User isolation across plans, logs and exports");
  await request("/account", "DELETE", { confirmation: "VERWIJDER" });
  assert.equal(await db.user.count({ where: { id: created.id } }), 0);
  for (const model of [
    "profile",
    "progressLog",
    "workoutLog",
    "mealLog",
    "refreshToken",
    "actionToken",
    "aIGeneration",
    "workoutPlan",
    "mealPlan",
  ])
    assert.equal(await db[model].count({ where: { userId: created.id } }), 0);
  passed("Account deletion cascades through personal data and sessions");
  let throttled = false;
  for (let attempt = 0; attempt < 20; attempt++) {
    const response = await fetch(`http://127.0.0.1:${apiPort}/api/auth/login`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "missing@example.test",
        password: oldPassword,
      }),
    });
    if (response.status === 429) {
      assert.equal(typeof (await response.json()).error, "string");
      throttled = true;
      break;
    }
    assert.equal(response.status, 401);
  }
  assert.equal(throttled, true);
  passed("Login throttling returns a readable JSON error");
  await mkdir(resolve(root, "test-results"), { recursive: true });
  await writeFile(
    resolve(root, "test-results", "integration.json"),
    JSON.stringify(
      {
        date: new Date().toISOString(),
        checks,
        liveClaude: live,
        status: "passed",
      },
      null,
      2,
    ),
  );
} catch (error) {
  process.exitCode = 1;
  process.stderr.write(`FAIL ${error.message}\n`);
  await mkdir(resolve(root, "test-results"), { recursive: true });
  await writeFile(
    resolve(
      root,
      "test-results",
      live ? "integration-live.json" : "integration.json",
    ),
    JSON.stringify(
      {
        date: new Date().toISOString(),
        checks,
        liveClaude: live,
        status: "failed",
        failure: error.message.split("\n")[0],
      },
      null,
      2,
    ),
  );
} finally {
  if (webProcess && webProcess.exitCode === null) {
    const stopped = once(webProcess, "exit");
    webProcess.kill();
    await stopped;
  }
  await stopApi();
  await db?.$disconnect();
  await new Promise((r) => (smtp.server.listening ? smtp.close(r) : r()));
  await new Promise((r) => (mock.listening ? mock.close(r) : r()));
  if (pgStarted) await pg.stop();
  process.stdout.write(
    `Completed ${checks.length} integration checks. Live Claude: ${live ? "enabled" : "not requested"}.\n`,
  );
}
