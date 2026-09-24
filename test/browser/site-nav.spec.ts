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

test("width grips stay aligned with input tops at different widths and heights", async ({
  page,
}) => {
  await page.goto("/#lab");
  const labGrip = page.getByRole("slider", { name: "Resize preview input" });
  const topAligned = async (grip: typeof labGrip, control: typeof labGrip) => {
    await expect
      .poll(async () => {
        const a = (await grip.boundingBox())!;
        const b = (await control.boundingBox())!;
        return Math.abs(a.y - b.y);
      })
      .toBeLessThanOrEqual(1);
  };
  const labInput = labGrip.locator("..").locator(".datetime-neo");
  await topAligned(labGrip, labInput);
  await labGrip.focus();
  await page.keyboard.press("ArrowLeft");
  await topAligned(labGrip, labInput);
  await page.goto("/#/docs/styling");
  for (const id of ["paper", "midnight", "mint", "compact", "seamless"]) {
    const preview = page.locator(`[data-theme-preview=${id}]`);
    const grip = preview.getByRole("slider");
    const control = preview.locator("[data-preview-state=editable] .datetime-neo");
    for (const key of ["Home", "End"]) {
      await grip.focus();
      await page.keyboard.press(key);
      await topAligned(grip, control);
    }
  }
});

for (const preview of ["lab", "gallery"] as const) {
  test(`${preview} grip stays at the input top through wrapping and mouseup`, async ({ page }) => {
    await page.goto(`/temporal-polyfill/${preview === "gallery" ? "#/docs/styling" : ""}`);
    const grip = page.getByRole("slider", {
      name: preview === "lab" ? "Resize preview input" : "Resize Midnight previews",
    });
    const control = grip.locator("..").locator(".datetime-neo");
    await page.evaluate(() => document.fonts.ready);
    await grip.focus();
    await page.keyboard.press("End");
    await expect
      .poll(() => page.evaluate(() => document.documentElement.style.overflowAnchor))
      .toBe("");
    await grip.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
    await grip.hover();
    const bounds = (await grip.boundingBox())!;
    const scrollY = await page.evaluate(() => window.scrollY);
    const wideHeight = (await control.boundingBox())!.height;
    const width = Number(await grip.getAttribute("aria-valuenow"));
    const x = bounds.x + 3;
    const y = bounds.y + bounds.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (const nextWidth of [100, width, 100]) {
      await page.mouse.move(x + nextWidth - width, y, { steps: 5 });
      await expect(grip).toHaveAttribute("aria-valuenow", String(nextWidth));
      if (nextWidth === 100) {
        await expect
          .poll(async () => (await control.boundingBox())!.height)
          .toBeGreaterThan(wideHeight);
      } else {
        await expect.poll(async () => (await control.boundingBox())!.height).toBe(wideHeight);
      }
      expect(Math.abs((await grip.boundingBox())!.y - bounds.y)).toBeLessThanOrEqual(0.5);
      expect(
        Math.abs((await grip.boundingBox())!.y - (await control.boundingBox())!.y),
      ).toBeLessThanOrEqual(0.5);
      // Check the release after both wrapping and unwrapping, including consecutive frames.
      await page.mouse.up();
      for (let frame = 0; frame < 4; frame++) {
        await page.evaluate(() => new Promise(requestAnimationFrame));
        expect(Math.abs((await grip.boundingBox())!.y - bounds.y)).toBeLessThanOrEqual(0.5);
        expect(
          Math.abs((await grip.boundingBox())!.y - (await control.boundingBox())!.y),
        ).toBeLessThanOrEqual(0.5);
        if (preview === "lab") expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
      }
      await page.mouse.down();
    }
    await page.mouse.up();
  });
}
