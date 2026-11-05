import { execFileSync } from "node:child_process";
const git = (...args) =>
  execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["inherit", "pipe", "inherit"],
  }).trim();
const branch = process.argv[2] ?? git("branch", "--show-current");
if (!/^(main|develop|feature\/[a-z0-9-]+|fix\/[a-z0-9-]+)$/.test(branch))
  throw new Error("Gebruik main, develop, feature/naam of fix/naam.");
const remotes = git("remote").split("\n");
if (!remotes.includes("origin") || !remotes.includes("gitlab"))
  throw new Error("Koppel eerst zowel origin (GitHub) als gitlab. Zie README.");
// No force pushes, no automatic merges, no deletion: a divergent remote rejects the push.
for (const remote of ["origin", "gitlab"]) {
  process.stdout.write(`Synchroniseren: ${branch} → ${remote}\n`);
  git(
    "push",
    ...(remote === "origin" ? ["--set-upstream"] : []),
    remote,
    `${branch}:${branch}`,
  );
}
process.stdout.write("Beide remotes zijn bijgewerkt.\n");
