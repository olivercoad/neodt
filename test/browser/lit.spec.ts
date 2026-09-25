import { expect, test } from "@playwright/test";

import { createThemes } from "../../dev/docs/themes";

for (const theme of createThemes(true)) {
  test(`Lit ${theme.id}: themes reach shadow parts and readonly states`, async ({ page }) => {
    await page.goto("/lit/luxon/?fixture=layout&width=210");
    const host = page.locator("neodt-demo-lit");
    const root = host.locator('[part~="root"]');
    await expect(root).toBeVisible();
    await page.addStyleTag({ content: theme.css });
    await host.evaluate((element, id) => element.classList.add(`theme-${id}`), theme.id);
    const backgrounds = {
      paper: "rgb(255, 252, 245)",
      midnight: "rgb(25, 27, 42)",
      mint: "rgb(238, 250, 243)",
      compact: "rgb(242, 245, 249)",
      seamless: "rgba(0, 0, 0, 0)",
    };
    await expect(root).toHaveCSS(
      "background-color",
      backgrounds[theme.id as keyof typeof backgrounds],
    );
    if (theme.id === "seamless") {
      // The same part styles must reach both the visible and measurement editors.
      for (const editor of await host.locator('[part="editor"]').all()) {
        await expect(editor).toHaveCSS("padding-left", "3px");
        await expect(editor).toHaveCSS("padding-top", "0px");
      }
    }
    await page.getByLabel("State", { exact: true }).selectOption("readonly");
    await expect(root).toHaveAttribute("part", "root");
    await expect
      .poll(() => host.evaluate((element) => element.matches(":state(readonly)")))
      .toBe(true);
    await expect(host).toHaveClass(new RegExp(`theme-${theme.id}`));
    if (theme.id === "midnight")
      await expect(root).toHaveCSS("background-color", "rgb(37, 39, 56)");
    if (theme.id === "seamless")
      await expect(root).toHaveCSS("border-top-color", "rgba(0, 0, 0, 0)");
  });
}

test("Lit custom states follow props, editing mode, and measured layout", async ({ page }) => {
  await page.goto("/lit/luxon/?fixture=layout&width=600&empty");
  const host = page.locator("neodt-demo-lit");
  const root = host.locator('[part="root"]');
  const state = (name: string) =>
    expect.poll(() => host.evaluate((element, value) => element.matches(`:state(${value})`), name));
  await expect(root).toBeVisible();
  await state("empty").toBe(true);
  await state("wrapped").toBe(false);
  await page.addStyleTag({
    content: `
    neodt-demo-lit:state(disabled)::part(root) { border-top-color: rgb(255, 0, 0); }
    neodt-demo-lit:state(readonly):state(wrapped)::part(root) { border-top-color: rgb(0, 128, 0); }
  `,
  });
  await page.getByLabel("State", { exact: true }).selectOption("disabled");
  await state("disabled").toBe(true);
  await expect(root).toHaveCSS("border-top-color", "rgb(255, 0, 0)");
  await page.getByLabel("State", { exact: true }).selectOption("readonly");
  await state("disabled").toBe(false);
  await state("readonly").toBe(true);
  await page.getByLabel("Width", { exact: true }).fill("120");
  await state("wrapped").toBe(true);
  await expect(root).toHaveCSS("border-top-color", "rgb(0, 128, 0)");
  await page.getByLabel("Width", { exact: true }).fill("600");
  await state("wrapped").toBe(false);
  await page.getByLabel("State", { exact: true }).selectOption("editable");
  await state("readonly").toBe(false);
  await page.getByLabel("Offset", { exact: true }).check();
  await state("time-offset").toBe(true);
  await page.getByLabel("Offset", { exact: true }).uncheck();
  await state("time-offset").toBe(false);
  await root.getByRole("spinbutton").first().press("@");
  await state("natural").toBe(true);
  const input = root.getByRole("textbox", { name: "Natural-language date and time" });
  await input.fill("tomorrow 9am");
  await input.press("Enter");
  await state("natural").toBe(false);
  await state("empty").toBe(false);
});
