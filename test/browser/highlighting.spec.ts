import { expect, test } from "@playwright/test";

import { libraries } from "../../dev/libraries";

for (const library of libraries) {
  test.describe(library.id, () => {
    test.use({ baseURL: `http://127.0.0.1:3000/${library.id}/` });
    test.beforeEach(async ({ page }) => {
      test.skip(
        library.id === "native-temporal" &&
          !(await page.evaluate(() => typeof Temporal !== "undefined")),
        "This browser does not provide native Temporal",
      );
    });

    test("configuration TSX highlighting follows live options", async ({ page }) => {
      // Let Playwright scroll to the controls without racing the #lab smooth scroll.
      await page.goto("./");
      const code = page.locator('#lab code[data-language="tsx"]');
      await expect(code.locator(".token.keyword").first()).toHaveText("import");
      await expect(code.locator(".token.tag").first()).toContainText("Neodt");
      await page.getByLabel("Time offset", { exact: true }).check();
      await expect(
        code.locator(".token.attr-name").filter({ hasText: "showTimeOffset" }),
      ).toBeVisible();
      await page.getByRole("combobox", { name: "Clock", exact: true }).selectOption("12");
      await expect(code.locator(".token.boolean")).toHaveText("true");
      await page.getByLabel("Time offset", { exact: true }).uncheck();
      await expect(code).not.toContainText("showTimeOffset");
    });

    test("CSS highlighting updates while native editing, undo, copy and reset work", async ({
      page,
    }) => {
      await page.goto("./#/docs/styling");
      const paper = page.getByRole("article", { name: "Paper & ink" });
      const input = paper.getByRole("textbox", { name: "Editable CSS" });
      const code = paper.locator('pre code[data-language="css"]');
      await expect(code.locator(".token.selector")).toHaveText(".theme-paper");
      await expect(code.locator(".token.variable").first()).toHaveText("--datetime-neo-background");
      await expect(code.locator(".token.color").first()).toHaveText("#fffcf5");
      await expect(code.locator(".token.unit").first()).toHaveText("px");
      const original = await input.inputValue();
      await input.focus();
      await input.press("ControlOrMeta+End");
      await input.press("Enter");
      await input.pressSequentially("/* live comment */");
      await expect(code.locator(".token.comment")).toHaveText("/* live comment */");
      expect(await input.evaluate((el) => (el as HTMLTextAreaElement).selectionStart)).toBe(
        (await input.inputValue()).length,
      );
      const edited = await input.inputValue();
      await input.press("ControlOrMeta+z");
      await expect(input).not.toHaveValue(edited);
      await expect(code).toHaveText(await input.inputValue());
      // Highlighting is presentational: the accessible editor remains a single textarea.
      await expect(paper.locator('[data-code-editor] [aria-hidden="true"]')).toHaveCount(1);
      await paper.getByRole("button", { name: "Reset", exact: true }).click();
      await expect(input).toHaveValue(original);
      await expect(code).toHaveText(original);
      await expect(paper.locator('[data-language="tsx"] .token.tag').first()).toContainText(
        "Neodt",
      );
    });

    test("highlighted CSS keeps text metrics and scrolling aligned, including trailing lines", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("./#/docs/styling");
      const paper = page.getByRole("article", { name: "Paper & ink" });
      const input = paper.getByRole("textbox", { name: "Editable CSS" });
      const overlay = paper.locator("[data-code-editor] pre");
      const longCss = `.theme-paper { --datetime-neo-background: #fffcf5; }\n${"/* a deliberately long line for horizontal scrolling ".repeat(8)}*/\n${"/* another line */\n".repeat(60)}\n`;
      await input.fill(longCss);
      await expect(overlay.locator("code")).toHaveText(longCss);
      const metrics = await input.evaluate((el) => {
        const front = getComputedStyle(el);
        const back = getComputedStyle(el.previousElementSibling!);
        return ["fontFamily", "fontSize", "lineHeight", "padding", "whiteSpace", "tabSize"].map(
          (key) => [
            front[key as keyof CSSStyleDeclaration],
            back[key as keyof CSSStyleDeclaration],
          ],
        );
      });
      for (const [front, back] of metrics) expect(front).toEqual(back);
      await input.evaluate((el) => {
        el.scrollTop = 400;
        el.scrollLeft = 100;
      });
      await expect
        .poll(() => overlay.evaluate((el) => [el.scrollTop, el.scrollLeft]))
        .toEqual([400, 100]);
      await input.evaluate((el) => {
        el.style.height = "420px";
      });
      await expect
        .poll(() => overlay.evaluate((el) => el.clientHeight))
        .toBe(await input.evaluate((el) => el.clientHeight));
      await input.focus();
      await input.press("ControlOrMeta+End");
      await input.pressSequentially("/* end */");
      await expect(overlay.locator(".token.comment").last()).toHaveText("/* end */");
      await expect
        .poll(async () =>
          Math.abs(
            (await overlay.evaluate((el) => el.scrollTop)) -
              (await input.evaluate((el) => el.scrollTop)),
          ),
        )
        .toBeLessThanOrEqual(1);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
      ).toBeLessThanOrEqual(1);
    });

    test("highlighting treats markup in edited CSS as text", async ({ page }) => {
      await page.goto("./#/docs/styling");
      const paper = page.getByRole("article", { name: "Paper & ink" });
      const value =
        '/* <img src=x onerror="window.highlightExecuted=true"> */\n.theme-paper { content: "<script>alert(1)</script>"; }';
      await paper.getByRole("textbox", { name: "Editable CSS" }).fill(value);
      const code = paper.locator('pre code[data-language="css"]');
      await expect(code).toHaveText(value);
      await expect(code.locator("img, script")).toHaveCount(0);
      expect(await page.evaluate(() => "highlightExecuted" in window)).toBe(false);
    });
  });
}
