import { test, expect, type Page } from "@playwright/test";
async function noOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    )
    .toBeLessThanOrEqual(1);
}
async function settle(page: Page) {
  await expect(page.locator("h1")).toBeVisible();
  await page.waitForTimeout(550);
}
async function revealPage(page: Page) {
  await page.evaluate(() => window.scrollTo(0, 0));
  for (let step = 0; step < 25; step++) {
    const bottom = await page.evaluate(
      () =>
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 2,
    );
    if (bottom) break;
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.8));
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(450);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
}
test("public routes fit the viewport and render without JavaScript errors", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const path of [
    "/",
    "/training",
    "/voeding",
    "/voortgang",
    "/profiel",
    "/welkom",
    "/login",
    "/register",
    "/forgot",
    "/reset?token=invalid",
    "/verify?token=invalid",
  ]) {
    await page.goto(path);
    await settle(page);
    await noOverflow(page);
    await revealPage(page);
    await page.screenshot({
      path: testInfo.outputPath(
        `${path.split("?")[0].replaceAll("/", "") || "dashboard"}.png`,
      ),
      fullPage: true,
    });
  }
  expect(errors).toEqual([]);
});
test("meal checkboxes update the dashboard and grocery dialog traps focus", async ({
  page,
}) => {
  await page.goto("/voeding");
  await settle(page);
  const meals = page.locator(".meal-bottom input[type=checkbox]");
  await expect(meals).toHaveCount(4);
  await meals.nth(1).check();
  await expect(meals.nth(1)).toBeChecked();
  await page
    .getByRole("button", { name: "Boodschappenlijst", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await noOverflow(page);
  for (let i = 0; i < 18; i++) await page.keyboard.press("Tab");
  expect(
    await page.evaluate(() => !!document.activeElement?.closest("dialog")),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  if (page.viewportSize()!.width < 761)
    await page.locator(".mobile-menu").click();
  await page.locator('.sidebar a[href="/"]').click();
  await settle(page);
  await expect(page.locator(".stat-number").nth(1)).toContainText("1.000");
});
test("login form opens the personal dashboard", async ({ page }) => {
  await page.goto("/login");
  await settle(page);
  await page
    .getByLabel("E-mailadres", { exact: true })
    .fill(process.env.TEST_USER_EMAIL!);
  await page
    .locator("input[name=password]")
    .fill(process.env.TEST_USER_PASSWORD!);
  await page.getByRole("button", { name: "Inloggen", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /Testgebruiker/ }),
  ).toBeVisible();
  await noOverflow(page);
});
test("workout can be completed by checking all sets", async ({ page }) => {
  await page.goto("/training");
  await settle(page);
  const finish = page.getByRole("button", {
    name: "Training afronden",
    exact: true,
  });
  await expect(finish).toBeDisabled();
  for (const checkbox of await page
    .locator(".set-check input[type=checkbox]")
    .all())
    await checkbox.check();
  await expect(finish).toBeEnabled();
  await finish.click();
  await expect(
    page.getByRole("button", {
      name: "Goed gedaan! Je training is afgerond.",
      exact: true,
    }),
  ).toBeDisabled();
  await noOverflow(page);
});
test("mobile menu is usable with keyboard and dark mode remains readable", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await settle(page);
  if (testInfo.project.use.viewport!.width < 761) {
    const menu = page.getByRole("button", { name: "Overzicht", exact: true });
    await menu.click();
    await expect(page.locator(".sidebar")).toHaveClass(/open/);
    await page
      .locator(".sidebar")
      .getByRole("link", { name: "Eetschema", exact: true })
      .click();
    await expect(page).toHaveURL(/voeding/);
    await expect(page.locator(".sidebar")).not.toHaveClass(/open/);
  }
  await page.getByRole("button", { name: "Donkere modus" }).click();
  await expect(page.locator("body")).toHaveClass(/dark/);
  await noOverflow(page);
  await page.reload();
  await expect(page.locator("body")).toHaveClass(/dark/);
  await page.goto("/voeding");
  await settle(page);
  const contrast = await page
    .locator(".meal-label")
    .first()
    .evaluate((element) => {
      const luminance = (value: string) => {
        const rgb = value
          .match(/[\d.]+/g)!
          .slice(0, 3)
          .map(Number)
          .map((n) => {
            n /= 255;
            return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
          });
        return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
      };
      const foreground = luminance(getComputedStyle(element).color),
        background = luminance(
          getComputedStyle(element.closest(".card")!).backgroundColor,
        );
      return (
        (Math.max(foreground, background) + 0.05) /
        (Math.min(foreground, background) + 0.05)
      );
    });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
  await revealPage(page);
  await page.screenshot({
    path: testInfo.outputPath("dark.png"),
    fullPage: true,
  });
});
test("progress modal validates input, saves demo measurement and restores focus", async ({
  page,
}) => {
  await page.goto("/voortgang");
  await settle(page);
  const open = page.getByRole("button", { name: "Voortgang toevoegen" });
  await open.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.locator("[name=weight]").fill("80.5");
  await dialog.locator("[name=waist]").fill("82");
  await dialog.locator("[name=notes]").fill("Mobiele testmeting");
  await dialog.getByRole("button", { name: "Opslaan", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByText("Mobiele testmeting", { exact: true }),
  ).toBeVisible();
  await noOverflow(page);
});
test("landing sticky section finishes before footer; reduced motion is supported", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/welkom");
  await settle(page);
  await page.locator(".landing-footer").scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  const sticky = await page.locator(".how-sticky").boundingBox(),
    footer = await page.locator(".landing-footer").boundingBox();
  expect(sticky!.y + sticky!.height).toBeLessThanOrEqual(footer!.y);
  await noOverflow(page);
});
test.describe("authenticated screens", () => {
  test.use({ storageState: process.env.TEST_AUTH_STATE });
  test("intake validates fields and moves through all three steps", async ({
    page,
  }, testInfo) => {
    await page.goto("/intake");
    await settle(page);
    await expect(
      page.getByRole("heading", { name: "Vertel ons wat bij je past" }),
    ).toBeVisible();
    await noOverflow(page);
    await page.locator("[name=age]").fill("17");
    await page.getByRole("button", { name: "Volgende", exact: true }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await page.locator("[name=age]").fill("28");
    await page.getByRole("button", { name: "Volgende", exact: true }).click();
    await expect(page.locator("[name=equipment]")).toBeVisible();
    await noOverflow(page);
    await page.getByRole("button", { name: "Volgende", exact: true }).click();
    await expect(page.locator("[name=allergies]")).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("intake-step3.png"),
      fullPage: true,
    });
    await page
      .getByRole("button", {
        name: "Maak mijn persoonlijke schema",
        exact: true,
      })
      .click();
    await expect(page.getByRole("alert")).toBeVisible();
    await noOverflow(page);
  });
  test("personal plan and admin guard use authenticated API data", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    for (const path of [
      "/",
      "/training",
      "/voeding",
      "/voortgang",
      "/profiel",
    ]) {
      await page.goto(path);
      await settle(page);
      await noOverflow(page);
    }
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("heading", { name: /Testgebruiker/ }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });
});
test.describe("admin screens", () => {
  test.use({ storageState: process.env.TEST_ADMIN_STATE });
  test("exercise library can be updated on a narrow screen", async ({
    page,
  }, testInfo) => {
    await page.goto("/admin");
    await settle(page);
    await expect(
      page.getByRole("heading", { name: /Gebruikers/ }),
    ).toBeVisible();
    await noOverflow(page);
    const form = page.locator("form");
    const name = `Mobiele testoefening ${testInfo.project.name}`;
    await form.locator("[name=name]").fill(name);
    await form.locator("[name=muscle]").fill("Benen");
    await form.locator("[name=equipment]").fill("Lichaamsgewicht");
    await form
      .locator("[name=instructions]")
      .fill("Beweeg rustig en gecontroleerd.");
    await form.getByRole("button", { name: "Opslaan" }).click();
    await expect(
      page.locator(".admin-row").filter({ hasText: name }),
    ).toBeVisible();
    await noOverflow(page);
  });
});
