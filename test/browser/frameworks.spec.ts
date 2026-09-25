import { expect, test } from "@playwright/test";

import { frameworks, demoPath, packageEntry } from "../../frameworks";
import { libraries } from "../../libraries";
for (const framework of frameworks) {
  test(`${framework.id}: framework dropdown preserves the library and documentation section`, async ({
    page,
  }) => {
    await page.goto(`${demoPath(framework.id, "luxon")}#/docs/frameworks`);
    const trigger = page.getByLabel("Frontend framework", { exact: true });
    await expect(trigger).toContainText(framework.label);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Choose your frontend framework.",
    );
    for (const target of frameworks) {
      await trigger.click();
      await page
        .getByRole("navigation", { name: "Main navigation" })
        .getByRole("link", {
          name: [target.label, target.description].filter(Boolean).join(" "),
          exact: true,
        })
        .click();
      await expect(page).toHaveURL(`${demoPath(target.id, "luxon")}#/docs/frameworks`);
      await expect(page.locator("html")).toHaveAttribute("data-framework", target.id);
      await expect(page.getByLabel("Datetime library", { exact: true })).toContainText("Luxon");
      await expect(page.locator("pre")).toContainText(packageEntry(target.id, "/luxon"));
    }
  });
  test(`${framework.id}: framework picker supports keyboard and fits narrow screens`, async ({
    page,
  }) => {
    await page.goto(`${demoPath(framework.id, "internationalized-date")}#/docs/frameworks`);
    const trigger = page.getByLabel("Frontend framework", { exact: true });
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("details[open]")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    for (const width of [320, 390, 760, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      await trigger.click();
      const bounds = (await page.locator("details[open] > div").boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      await page.keyboard.press("Escape");
    }
  });
  for (const library of libraries.filter(({ id }) => id !== "native-temporal")) {
    test(`${framework.id}/${library.id}: edits, switches modes and responds to parent changes`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(`${demoPath(framework.id, library.id)}?fixture=layout`);
      const control = page.locator("#host .datetime-neo");
      const day = control.getByRole("spinbutton", { name: "day", exact: true });
      await expect(day).toHaveText("17");
      await day.press("ArrowUp");
      await expect(day).toHaveText("18");
      await expect(day).toBeFocused();
      await day.press("@");
      const input = control.getByRole("textbox", { name: "Natural-language date and time" });
      await expect(input).toBeFocused();
      await input.fill("tomorrow 9am");
      await input.press("Enter");
      await expect(input).toHaveCount(0);
      await expect(day).toBeFocused();
      await page.getByLabel("State", { exact: true }).selectOption("readonly");
      await expect(control).toHaveAttribute("data-readonly", "");
      await expect(control.locator(".datetime-neo__trigger")).toHaveCount(0);
      expect(errors).toEqual([]);
    });
  }
}
