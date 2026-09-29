import { expect, test, type Page } from "@playwright/test";

import packageJson from "../../package.json" with { type: "json" };

const framework = (page: Page) => page.getByRole("combobox", { name: /^Framework:/ });
const library = (page: Page) => page.getByRole("combobox", { name: /^Datetime library:/ });
const go = (page: Page) => page.getByRole("button", { name: "Go", exact: true });

async function settled(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document
            .getAnimations()
            .filter((animation) => animation.playState === "running" || animation.pending).length,
      ),
    )
    .toBe(0);
}

async function open(page: Page, path = "/") {
  await page.goto(path);
  await page.evaluate(() => document.fonts.ready);
  await settled(page);
}

test.beforeEach(async ({ page }) => {
  await page.clock.install();
  await page.clock.pauseAt(new Date());
});

test("landing words rotate and pause for hover, keyboard focus, and manual selection", async ({
  page,
}) => {
  await open(page);
  await expect(framework(page)).toHaveText("Typescript");
  await expect(library(page)).toHaveText("Temporal");
  await page.clock.fastForward(2000);
  await expect(framework(page)).toHaveText("Solid");
  await settled(page);
  await page.clock.fastForward(2000);
  await expect(library(page)).toHaveText("temporal-polyfill");
  await framework(page).hover();
  await page.clock.fastForward(8000);
  await expect(framework(page)).toHaveText("Solid");
  await expect(go(page)).toBeVisible();
  await page.getByRole("heading", { level: 1 }).hover();
  await expect(go(page)).toBeHidden();
  await page.clock.fastForward(2000);
  await expect(framework(page)).toHaveText("React");
  await framework(page).focus();
  await framework(page).press("Enter");
  await page.clock.fastForward(8000);
  await expect(framework(page)).toHaveText("React");
  await framework(page).press("End");
  await framework(page).press("Enter");
  await expect(framework(page)).toHaveText("Lit");
  await page.getByRole("button", { name: "Copy @olicoad/neodt" }).focus();
  await page.clock.fastForward(8000);
  await expect(framework(page)).toHaveText("Lit");
});

test("selection navigates to the real demo and stays fixed on reload", async ({ page }) => {
  await open(page);
  await framework(page).click();
  await page.getByRole("option", { name: "React", exact: true }).click();
  await library(page).click();
  await page.getByRole("option", { name: "@internationalized/date", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await go(page).click();
  await expect(page).toHaveURL(/\/react\/internationalized-date\/$/);
  await expect(framework(page)).toHaveText("React");
  await expect(library(page)).toHaveText("@internationalized/date");
  await expect(page.locator("html")).toHaveAttribute("data-framework", "react");
  await expect(page.locator("html")).toHaveAttribute("data-adapter", "internationalized-date");
  await page.reload();
  await framework(page).hover();
  await expect(go(page)).toBeDisabled();
  await page.getByRole("heading", { level: 1 }).hover();
  await page.clock.fastForward(12000);
  await expect(framework(page)).toHaveText("React");
  await expect(library(page)).toHaveText("@internationalized/date");
});

test("keyboard typeahead, wrapping, dismissal, and reverting a selection", async ({ page }) => {
  await open(page, "/solid/luxon/");
  const picker = framework(page);
  await picker.focus();
  await picker.press("ArrowDown");
  await picker.press("Home");
  await picker.press("ArrowUp");
  const active = async () =>
    page.locator(`[id="${await picker.getAttribute("aria-activedescendant")}"]`);
  await expect(await active()).toHaveText("Lit");
  await picker.press("v");
  await picker.press("a");
  await expect(await active()).toContainText("Plain JavaScript / TypeScript");
  await picker.press("Enter");
  await expect(picker).toHaveAccessibleName("Framework: Vanilla");
  await expect(picker).toHaveText("Typescript");
  await expect(go(page)).toBeEnabled();
  await picker.click();
  await page.getByRole("option", { name: "Solid", exact: true }).click();
  await expect(go(page)).toBeDisabled();
  for (const key of ["Escape", "Tab"]) {
    await picker.click();
    await picker.press("ArrowDown");
    await picker.press(key);
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(picker).toHaveText("Solid");
  }
  await picker.click();
  await page.getByRole("heading", { level: 1 }).click();
  await expect(page.getByRole("listbox")).toHaveCount(0);
});

test("an interrupted outgoing animation cannot restore stale letters", async ({ page }) => {
  await open(page);
  await page.clock.fastForward(2000);
  await framework(page).evaluate((element) => (element as HTMLElement).focus());
  await framework(page).press("Enter");
  await framework(page).press("End");
  await framework(page).press("Enter");
  await settled(page);
  await expect(framework(page)).toHaveText("Lit");
  await page.clock.fastForward(4000);
  await expect(framework(page)).toHaveText("Lit");
});

for (const width of [320, 390, 1024, 1440]) {
  test(`all library options fit the hero and dropdown at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await open(page, "/vanilla/native-temporal/");
    for (const name of [
      "@internationalized/date",
      "@js-temporal/polyfill",
      "temporal-polyfill",
      "Luxon",
    ]) {
      await library(page).click();
      const menu = page.getByRole("listbox");
      const menuBox = await menu.boundingBox();
      expect(menuBox!.x).toBeGreaterThanOrEqual(0);
      expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(width);
      await page.getByRole("option", { name, exact: true }).click();
      await settled(page);
      const pickerBox = await library(page).boundingBox();
      const heroBox = await page
        .getByRole("form", { name: "Choose your framework and datetime library" })
        .boundingBox();
      expect(pickerBox!.x).toBeGreaterThanOrEqual(heroBox!.x);
      expect(pickerBox!.x + pickerBox!.width).toBeLessThanOrEqual(heroBox!.x + heroBox!.width);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      await expect(go(page)).toBeVisible();
    }
  });
}

test("reduced motion changes words without animations", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  await page.clock.fastForward(2000);
  await expect(framework(page)).toHaveText("Solid");
  await library(page).click();
  await page.getByRole("option", { name: "@internationalized/date", exact: true }).click();
  await expect(library(page)).toHaveText("@internationalized/date");
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
});

test("package name copies and the version comes from package metadata", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (text: string) => {
          (window as any).copiedPackage = text;
        },
      },
    });
  });
  await open(page);
  await page.getByRole("button", { name: "Copy @olicoad/neodt" }).click();
  await expect(page.getByRole("status")).toHaveText("Copied!");
  expect(await page.evaluate(() => (window as any).copiedPackage)).toBe("@olicoad/neodt");
  await expect(page.getByRole("link", { name: /on npm/ })).toContainText(`v${packageJson.version}`);
});
