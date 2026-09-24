import { expect, test } from "@playwright/test";

test("library panel works with keyboard, dismisses, and fits narrow screens", async ({ page }) => {
  await page.goto("/internationalized-date/#/docs/styling");
  const trigger = page.getByLabel("Datetime library", { exact: true });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const selected = page.getByRole("link", { name: "@internationalized/date", exact: true });
  await expect(selected).toHaveAttribute("aria-current", "true");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Native Temporal", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(selected).toBeHidden();
  for (const width of [320, 390, 760, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await trigger.click();
    const panel = page.locator("details > div");
    const bounds = (await panel.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    await page.mouse.click(5, 5);
    await expect(selected).toBeHidden();
  }
  await expect(page.locator('a[href="#top"]')).toHaveCount(0);
  await page.getByRole("link", { name: "neodt home" }).click();
  await expect(page).toHaveURL(/\/internationalized-date\/$/);
});

test("width grips stay centered on inputs at different widths and heights", async ({ page }) => {
  await page.goto("/#lab");
  const labGrip = page.getByRole("button", { name: "Resize preview input" });
  const centered = async (grip: typeof labGrip, control: typeof labGrip) => {
    await expect
      .poll(async () => {
        const a = (await grip.boundingBox())!;
        const b = (await control.boundingBox())!;
        return Math.abs(a.y + a.height / 2 - b.y - b.height / 2);
      })
      .toBeLessThanOrEqual(1);
  };
  const labInput = labGrip.locator("..").locator(".datetime-neo");
  await centered(labGrip, labInput);
  await labGrip.focus();
  await page.keyboard.press("ArrowLeft");
  await centered(labGrip, labInput);
  await page.goto("/#/docs/styling");
  for (const id of ["paper", "midnight", "mint", "compact", "seamless"]) {
    const preview = page.locator(`[data-theme-preview=${id}]`);
    const grip = preview.getByRole("slider");
    const control = preview.locator("[data-preview-state=editable] .datetime-neo");
    for (const key of ["Home", "End"]) {
      await grip.focus();
      await page.keyboard.press(key);
      await centered(grip, control);
    }
  }
});
