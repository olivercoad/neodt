import { expect, test } from "@playwright/test";

import { frameworks } from "../../frameworks";
for (const framework of frameworks.filter(({ serverRendering }) => serverRendering)) {
  test(`${framework.id}: hydrates server markup without replacing segments or emitting changes`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (/hydration|did not match/i.test(message.text()) && message.type() === "error")
        errors.push(message.text());
    });
    await page.goto(`/@neodt/hydration/${framework.id}`);
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
    expect(
      await page.evaluate(
        () => (window as unknown as { hydrationPreservedNode: boolean }).hydrationPreservedNode,
      ),
    ).toBe(true);
    expect(await page.evaluate(() => (window as unknown as { changes: number }).changes)).toBe(0);
    const day = page.getByRole("spinbutton", { name: "day", exact: true });
    await day.press("ArrowUp");
    expect(await page.evaluate(() => (window as unknown as { changes: number }).changes)).toBe(1);
    expect(errors).toEqual([]);
  });
}
