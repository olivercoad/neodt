import { expect, test } from "@playwright/test";

import { themes } from "../../dev/docs/themes";

for (const theme of themes) {
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
    await expect(root).toHaveAttribute("part", /readonly/);
    await expect(host).toHaveClass(new RegExp(`theme-${theme.id}`));
    if (theme.id === "midnight")
      await expect(root).toHaveCSS("background-color", "rgb(37, 39, 56)");
    if (theme.id === "seamless")
      await expect(root).toHaveCSS("border-top-color", "rgba(0, 0, 0, 0)");
  });
}
