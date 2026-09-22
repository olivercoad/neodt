import { expect, test } from "@playwright/test";

test("documentation routes survive reload and browser navigation", async ({ page }) => {
  await page.goto("/#/docs/getting-started");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Date and time");
  await page
    .getByRole("navigation", { name: "Documentation" })
    .getByRole("link", { name: "API reference" })
    .click();
  await page.reload();
  await expect(page).toHaveTitle("API reference · neodt");
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Date and time");
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Playground" })
    .click();
  await expect(page.locator("#playground")).toBeInViewport();
});

test("theme CSS edits update only that preview, can be copied, and reset", async ({ page }) => {
  await page.goto("/#/docs/styling");
  const paper = page.getByRole("article", { name: "Paper & ink" });
  const midnight = page.getByRole("article", { name: "Midnight", exact: true });
  const input = paper.locator("[data-preview-state=editable] .datetime-neo");
  const css = paper.getByRole("textbox", { name: "Editable CSS" });
  const original = await css.inputValue();
  await expect(input).toHaveCSS("background-color", "rgb(255, 252, 245)");
  await css.fill(
    ".theme-paper { --datetime-neo-background: rgb(255, 0, 0); width: 100%; } body { display: none; }",
  );
  await expect(input).toHaveCSS("background-color", "rgb(255, 0, 0)");
  await expect(midnight.locator("[data-preview-state=editable] .datetime-neo")).toHaveCSS(
    "background-color",
    "rgb(25, 27, 42)",
  );
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // Capture the actual copied text, without depending on OS clipboard permissions.
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          document.documentElement.dataset.copied = value;
        },
      },
    });
  });
  await paper.getByRole("button", { name: "Copy CSS" }).click();
  await expect(paper.getByRole("status", { name: "Copy status" })).toHaveText("Copied CSS");
  expect(await page.locator("html").getAttribute("data-copied")).toBe(await css.inputValue());
  await paper.getByRole("button", { name: "Reset" }).click();
  await expect(css).toHaveValue(original);
  await expect(input).toHaveCSS("background-color", "rgb(255, 252, 245)");
});

test("copy failure selects the CSS for manual copying", async ({ page }) => {
  await page.goto("/#/docs/styling");
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("Clipboard unavailable");
        },
      },
    });
  });
  const paper = page.getByRole("article", { name: "Paper & ink" });
  await paper.getByRole("button", { name: "Copy CSS" }).click();
  await expect(paper.getByRole("status", { name: "Copy status" })).toContainText("CSS selected");
  const css = paper.getByRole("textbox", { name: "Editable CSS" });
  await expect(css).toBeFocused();
  expect(await css.evaluate((el) => (el as HTMLTextAreaElement).selectionEnd)).toBe(
    (await css.inputValue()).length,
  );
});

test("docs and every styled preview fit a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/docs/styling");
  await expect(
    page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Docs", exact: true }),
  ).toBeVisible();
  for (const id of ["paper", "midnight", "mint", "compact", "super-compact"]) {
    const preview = page.locator(`[data-theme-preview=${id}]`);
    const control = preview.locator("[data-preview-state=editable] .datetime-neo");
    await control.scrollIntoViewIfNeeded();
    await expect(control).toBeVisible();
    // The width grip sits beside the preview column; all three controls must fit their hosts.
    for (const state of ["editable", "readonly", "disabled"]) {
      const variant = preview.locator(`[data-preview-state=${state}]`);
      await expect(variant.locator(".datetime-neo")).toBeVisible();
      const bounds = (await variant.boundingBox())!;
      const controlBounds = (await variant.locator(".datetime-neo").boundingBox())!;
      expect(controlBounds.x + controlBounds.width).toBeLessThanOrEqual(
        bounds.x + bounds.width + 1,
      );
    }
    await control.getByRole("spinbutton").first().focus();
    await expect(
      control.getByRole("button", { name: "Enter date and time naturally" }),
    ).toBeVisible();
  }
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
  ).toBeLessThanOrEqual(1);
});

test("gallery formatting controls update every state in every theme", async ({ page }) => {
  await page.goto("/#/docs/styling");
  const nav = page.getByRole("navigation", { name: "Documentation" });
  const controls = page.locator("[data-theme-preview] .datetime-neo");
  await expect(controls).toHaveCount(15);
  await expect(
    page.locator("[data-preview-state=readonly] .datetime-neo[data-readonly]"),
  ).toHaveCount(5);
  await expect(
    page.locator("[data-preview-state=disabled] .datetime-neo[data-disabled]"),
  ).toHaveCount(5);
  const css = page
    .getByRole("article", { name: "Paper & ink" })
    .getByRole("textbox", { name: "Editable CSS" });
  await css.fill((await css.inputValue()) + "\n/* keep this edit */");
  await nav.getByRole("combobox", { name: "Locale", exact: true }).selectOption("en-US");
  for (const control of await controls.all()) {
    await expect(
      control.locator(".datetime-neo__content [role=spinbutton]").first(),
    ).toHaveAttribute("aria-label", "month");
  }
  await nav.getByRole("combobox", { name: "Hour12", exact: true }).selectOption("12");
  await expect(controls.locator(".datetime-neo__content [aria-label=dayPeriod]")).toHaveCount(15);
  await nav.getByRole("combobox", { name: "Hour12", exact: true }).selectOption("24");
  await expect(controls.locator(".datetime-neo__content [aria-label=dayPeriod]")).toHaveCount(0);
  await nav.getByRole("combobox", { name: "Hour12", exact: true }).selectOption("locale");
  await expect(controls.locator(".datetime-neo__content [aria-label=dayPeriod]")).toHaveCount(15);
  await nav.getByRole("combobox", { name: "Locale", exact: true }).selectOption("ja-JP");
  await expect(controls.locator(".datetime-neo__content [aria-label=dayPeriod]")).toHaveCount(0);
  for (const control of await controls.all()) {
    await expect(
      control.locator(".datetime-neo__content [role=spinbutton]").first(),
    ).toHaveAttribute("aria-label", "year");
  }
  await nav.getByLabel("Show time offset").uncheck();
  await expect(controls.locator(".datetime-neo__content .datetime-neo__timezone")).toHaveCount(0);
  await nav.getByLabel("Show time offset").check();
  await expect(controls.locator(".datetime-neo__content .datetime-neo__timezone")).toHaveCount(15);
  await expect(css).toHaveValue(/keep this edit/);
  await nav.getByRole("link", { name: "API reference" }).click();
  await expect(nav.getByRole("group", { name: "All previews" })).toHaveCount(0);
});

test("every width grip resizes the entire gallery with pointer and keyboard", async ({ page }) => {
  await page.goto("/#/docs/styling");
  const preview = page.locator("[data-theme-preview=paper]");
  const grip = page.getByRole("slider", { name: "Resize Paper & ink previews" });
  await grip.scrollIntoViewIfNeeded();
  const start = Number(await grip.getAttribute("aria-valuenow"));
  const bounds = (await grip.boundingBox())!;
  await page.mouse.move(bounds.x + 3, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x - 47, bounds.y + bounds.height / 2, { steps: 5 });
  await page.mouse.up();
  await expect(grip).toHaveAttribute("aria-valuenow", String(start - 50));
  for (const control of await page.locator("[data-theme-preview] .datetime-neo").all()) {
    const capped = await control.evaluate((el) => el.classList.contains("theme-super-compact"));
    expect((await control.boundingBox())!.width).toBeCloseTo(
      capped ? Math.min(start - 50, 240) : start - 50,
      0,
    );
  }
  for (const thumb of await page.getByRole("slider").all()) {
    await expect(thumb).toHaveAttribute("aria-valuenow", String(start - 50));
  }
  const otherGrip = page.getByRole("slider", { name: "Resize Midnight previews" });
  await otherGrip.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(grip).toHaveAttribute("aria-valuenow", String(start - 60));
  await page.keyboard.press("ArrowRight");
  await grip.focus();
  await page.keyboard.press("ArrowRight");
  await expect(grip).toHaveAttribute("aria-valuenow", String(start - 40));
  await page.keyboard.press("Home");
  await expect(grip).toHaveAttribute("aria-valuenow", "100");
  await page.keyboard.press("ArrowLeft");
  await expect(grip).toHaveAttribute("aria-valuenow", "100");
  await page.keyboard.press("End");
  await expect(grip).toHaveAttribute("aria-valuenow", (await grip.getAttribute("aria-valuemax"))!);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => (await preview.boundingBox())!.width).toBeLessThan(300);
});

test("super-compact previews use compact typography and stay within a 125px sizer", async ({
  page,
}) => {
  await page.goto("/#/docs/styling");
  await page.evaluate(() => document.fonts.ready);
  const preview = page.locator("[data-theme-preview=super-compact]");
  for (const control of await preview.locator(".datetime-neo").all()) {
    await expect(control).toHaveCSS("font-size", "16px");
    await expect(control).toHaveCSS("line-height", "normal");
    // Font rasterisation and fallback fonts may differ slightly across hosts.
    await expect.poll(async () => (await control.boundingBox())!.height).toBeLessThanOrEqual(26);
  }
  // Set the exact reproduction width without relying on pointer rounding.
  await preview.evaluate((el) => (el.style.width = "125px"));
  const nav = page.getByRole("navigation", { name: "Documentation" });
  for (const showOffset of [false, true]) {
    await nav.getByLabel("Show time offset").setChecked(showOffset);
    const control = preview.locator("[data-preview-state=editable] .datetime-neo");
    await control.hover();
    await control.getByRole("spinbutton").first().focus();
    await expect.poll(async () => (await control.boundingBox())!.width).toBe(125);
    for (const variant of await preview.locator("[data-preview-state]").all()) {
      expect((await variant.boundingBox())!.width).toBe(125);
    }
    await control.getByRole("button", { name: "Enter date and time naturally" }).click();
    await expect.poll(async () => (await control.boundingBox())!.width).toBe(125);
    await page.keyboard.press("Escape");
  }
});

test("Midnight readonly keeps its dark surface and readable foreground", async ({ page }) => {
  await page.goto("/#/docs/styling");
  const readonly = page.locator(
    "[data-theme-preview=midnight] [data-preview-state=readonly] .datetime-neo",
  );
  await expect(readonly).toHaveCSS("background-color", "rgb(37, 39, 56)");
  await expect(readonly).toHaveCSS("color", "rgb(240, 237, 249)");
  await expect(readonly.locator(".datetime-neo__content .datetime-neo__actions")).toHaveCount(0);
});

for (const input of ["pointer", "keyboard"] as const) {
  test(`resizing a lower gallery example with ${input} keeps the active grip in place`, async ({
    page,
  }) => {
    // Stacked cards expose height changes in the earlier examples as their inputs wrap.
    await page.setViewportSize({ width: 1000, height: 800 });
    await page.goto("/#/docs/styling");
    const grip = page.getByRole("slider", { name: "Resize Compact console previews" });
    await page.evaluate(() => document.fonts.ready);
    await grip.focus();
    await page.keyboard.press("End");
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.style.getPropertyValue("overflow-anchor")),
      )
      .toBe("");
    await grip.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
    const bounds = (await grip.boundingBox())!;
    const initialDocumentTop = bounds.y + (await page.evaluate(() => window.scrollY));
    if (input === "pointer") {
      const x = bounds.x + 3;
      const y = bounds.y + bounds.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      const width = Number(await grip.getAttribute("aria-valuenow"));
      for (const nextWidth of [240, 160, 100, width, 100]) {
        await page.mouse.move(x + nextWidth - width, y);
        await expect(grip).toHaveAttribute("aria-valuenow", String(nextWidth));
        // Check consecutive frames too: settling in the right place alone can hide a flicker.
        const positions = await grip.evaluate(
          (el) =>
            new Promise<number[]>((resolve) => {
              const values: number[] = [];
              const sample = () => {
                values.push(el.getBoundingClientRect().top);
                if (values.length === 3) resolve(values);
                else requestAnimationFrame(sample);
              };
              requestAnimationFrame(sample);
            }),
        );
        for (const top of positions) expect(Math.abs(top - bounds.y)).toBeLessThanOrEqual(1);
        expect(
          (await grip.boundingBox())!.y + (await page.evaluate(() => window.scrollY)),
        ).toBeCloseTo(initialDocumentTop, 0);
      }
      await page.mouse.up();
    } else {
      for (const key of ["Home", "End", "Home"]) {
        await page.keyboard.press(key);
        await page.evaluate(
          () =>
            new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
        );
        expect(Math.abs((await grip.boundingBox())!.y - bounds.y)).toBeLessThanOrEqual(1);
      }
    }
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    expect(Math.abs((await grip.boundingBox())!.y - bounds.y)).toBeLessThanOrEqual(1);
    // Releasing restores the taller upstream cards while keeping the grip at the same screen position.
    expect(
      (await grip.boundingBox())!.y + (await page.evaluate(() => window.scrollY)),
    ).toBeGreaterThan(initialDocumentTop + 10);
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.style.getPropertyValue("overflow-anchor")),
      )
      .toBe("");
    await expect(page.locator("article[style*=height]")).toHaveCount(0);
    // Releasing the grip must not lock normal scrolling.
    await page.evaluate(() => window.scrollBy({ top: 100, behavior: "instant" }));
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    expect((await grip.boundingBox())!.y).toBeLessThan(bounds.y - 90);
  });
}
