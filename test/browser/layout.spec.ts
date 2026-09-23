import { expect, test, type Locator, type Page } from "@playwright/test";

import { themes } from "../../dev/docs/themes";

const control = (page: Page) => page.locator("#host > .datetime-neo");
const content = (page: Page) => control(page).locator(":scope > .datetime-neo__content");
const editor = (page: Page) => content(page).locator(".datetime-neo__editor");

async function box(locator: Locator) {
  const bounds = await locator.boundingBox();
  expect(bounds).not.toBeNull();
  return bounds!;
}

async function rows(page: Page, wrapped: boolean) {
  if (wrapped) await expect(content(page)).toHaveAttribute("data-wrapped", "");
  else await expect(content(page)).not.toHaveAttribute("data-wrapped");
  // Check rendered geometry, not just the component's layout flag.
  await expect
    .poll(async () => {
      const first = await box(content(page).getByRole("spinbutton", { name: "day", exact: true }));
      const second = await box(
        content(page).getByRole("spinbutton", { name: "minute", exact: true }),
      );
      return second.y - first.y;
    })
    .toBeGreaterThanOrEqual(wrapped ? 10 : -1);
  if (!wrapped) {
    await expect
      .poll(async () => {
        const first = await box(
          content(page).getByRole("spinbutton", { name: "day", exact: true }),
        );
        const second = await box(
          content(page).getByRole("spinbutton", { name: "minute", exact: true }),
        );
        return Math.abs(second.y - first.y);
      })
      .toBeLessThan(1);
  }
}

async function contained(inner: Locator, outer: Locator) {
  await expect
    .poll(async () => {
      const i = await box(inner);
      const o = await box(outer);
      return Math.max(
        o.x - i.x,
        i.x + i.width - o.x - o.width,
        o.y - i.y,
        i.y + i.height - o.y - o.height,
      );
    })
    .toBeLessThanOrEqual(1);
}

for (const locale of ["en-GB", "en-US", "de-DE", "ja-JP"]) {
  test(`${locale}: resize, focus and natural entry preserve the chosen rows`, async ({ page }) => {
    await page.goto(`/layout.html?locale=${locale}&offset`);
    await rows(page, false);
    await page.getByLabel("Width", { exact: true }).fill("210");
    await rows(page, true);
    await content(page).getByRole("spinbutton").first().focus();
    await rows(page, true);
    await contained(content(page).locator(".datetime-neo__actions"), control(page));
    await content(page).getByRole("button", { name: "Enter date and time naturally" }).click();
    await expect(content(page)).toHaveAttribute("data-wrapped", "");
    const input = content(page).locator(".datetime-neo__natural-input");
    await input.fill("tomorrow 9am");
    await expect(content(page).locator(".datetime-neo__natural-preview")).not.toBeEmpty();
    await contained(content(page).locator(".datetime-neo__natural-result"), editor(page));
    await input.press("Escape");
    await rows(page, true);
    await page.getByLabel("Width", { exact: true }).fill("420");
    await rows(page, false);
    // Hidden measurement elements must not create scrollbars on the parent.
    expect(
      await page.locator("#host").evaluate((el) => el.scrollWidth - el.clientWidth),
    ).toBeLessThanOrEqual(1);
  });
}

for (const theme of themes) {
  test(`${theme.id}: wrapped actions stay centered without adding an empty row`, async ({
    page,
  }) => {
    await page.goto("/layout.html?width=110");
    await page.addStyleTag({ content: theme.css });
    await control(page).evaluate((el, id) => el.classList.add(`theme-${id}`), theme.id);
    for (const offset of [false, true]) {
      await page.getByLabel("Offset", { exact: true }).setChecked(offset);
      await rows(page, true);
      await control(page).hover();
      await expect
        .poll(() =>
          content(page).evaluate((el) => {
            const bounds = el.getBoundingClientRect();
            const actions = el.querySelector(".datetime-neo__actions")!.getBoundingClientRect();
            const timezone = el.querySelector(".datetime-neo__timezone")?.getBoundingClientRect();
            const offsetHeight =
              el.querySelector(".datetime-neo__timezone-minutes")?.getBoundingClientRect().height ??
              0;
            const expectedTop =
              bounds.top + Math.max(offsetHeight, (bounds.height - actions.height) / 2);
            return Math.max(
              Math.abs(actions.top - expectedTop),
              timezone ? Math.abs(timezone.top - bounds.top) : 0,
            );
          }),
        )
        .toBeLessThanOrEqual(1);
      const excessHeight = await content(page).evaluate((el) => {
        const editor = el.querySelector(".datetime-neo__editor")!;
        const style = getComputedStyle(editor);
        const valueHeight = editor
          .querySelector(".datetime-neo__value")!
          .getBoundingClientRect().height;
        const editorHeight =
          valueHeight + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
        const actionsHeight = el
          .querySelector(".datetime-neo__actions")!
          .getBoundingClientRect().height;
        const offsetHeight =
          el.querySelector(".datetime-neo__timezone-minutes")?.getBoundingClientRect().height ?? 0;
        return (
          el.getBoundingClientRect().height - Math.max(editorHeight, actionsHeight + offsetHeight)
        );
      });
      expect(excessHeight).toBeLessThanOrEqual(1);
    }
  });
}

test("hover reveals actions without changing height or wrapping", async ({ page }) => {
  await page.goto("/layout.html?width=420");
  await rows(page, false);
  const actions = content(page).locator(".datetime-neo__actions");
  await expect(actions).toHaveCSS("opacity", "0");
  const height = (await box(control(page))).height;
  await control(page).hover();
  await expect(actions).toHaveCSS("opacity", "1");
  await contained(actions, control(page));
  await rows(page, false);
  expect((await box(control(page))).height).toBeCloseTo(height, 0);
  await page.getByRole("button", { name: "Outside", exact: true }).hover();
  await expect(actions).toHaveCSS("opacity", "0");
});

for (const zone of ["UTC", "Asia/Kolkata", "Asia/Kathmandu"]) {
  test(`${zone}: only whole-hour offset minutes collapse`, async ({ page }) => {
    await page.goto(`/layout.html?width=420&offset&zone=${zone}`);
    const minutes = content(page).locator(".datetime-neo__timezone-minutes");
    await expect(minutes).toHaveCSS("opacity", "1");
    await control(page).hover();
    await expect(minutes).toHaveCSS("opacity", zone === "UTC" ? "0" : "1");
    await contained(content(page).locator(".datetime-neo__trailing"), control(page));
    await page.getByLabel("Width", { exact: true }).fill("210");
    await control(page).hover();
    await rows(page, true);
    await expect(minutes).toHaveCSS("opacity", "1");
    await page.getByRole("button", { name: "Outside", exact: true }).hover();
    await expect(minutes).toHaveCSS("opacity", zone === "UTC" ? "0" : "1");
  });
}

test("empty placeholders appear on focus and typing emits a date", async ({ page }) => {
  await page.goto("/layout.html?empty");
  await expect(content(page).locator(".datetime-neo__value")).toHaveCSS("opacity", "0");
  await content(page).getByRole("spinbutton").first().focus();
  await expect(content(page).locator(".datetime-neo__value")).toHaveCSS("opacity", "1");
  await page.keyboard.press("@");
  await content(page).locator(".datetime-neo__natural-input").fill("tomorrow 9am");
  await page.keyboard.press("Enter");
  await expect(page.locator("output")).toHaveText("2026-08-18T09:00:00.000+10:00");
});

test("custom metrics align completion text and preserve wrapped row height", async ({ page }) => {
  await page.goto("/layout.html?metrics&width=200");
  await rows(page, true);
  const height = (await box(control(page))).height;
  await content(page).getByRole("spinbutton").first().focus();
  await page.keyboard.press("@");
  const input = content(page).locator(".datetime-neo__natural-input");
  await input.fill("tom");
  const ghost = content(page).locator(".datetime-neo__natural-ghost");
  await expect(ghost).toBeVisible();
  const inputBox = await box(input);
  const ghostBox = await box(ghost);
  expect(ghostBox.x).toBeCloseTo(inputBox.x, 0);
  expect(Math.abs(ghostBox.y - inputBox.y)).toBeLessThanOrEqual(1);
  expect(Math.abs((await box(control(page))).height - height)).toBeLessThanOrEqual(1);
  await input.fill("tomorrow");
  expect(Math.abs((await box(control(page))).height - height)).toBeLessThanOrEqual(1);
});

test("narrow editors scroll focused segments into view", async ({ page }) => {
  await page.goto("/layout.html?width=140");
  await rows(page, true);
  const year = content(page).getByRole("spinbutton", { name: "year", exact: true });
  await year.focus();
  await contained(year, editor(page));
  // Keep the focused segment visible when the editor's width changes after focus.
  await page.locator("#host").evaluate((el) => (el.style.width = "180px"));
  await contained(year, editor(page));
  await page.locator("#host").evaluate((el) => (el.style.width = "140px"));
  await contained(year, editor(page));
  await page.keyboard.press("Home");
  await contained(content(page).getByRole("spinbutton").first(), editor(page));
});

for (const state of ["readonly", "disabled"]) {
  test(`${state}: actions are removed and keyboard editing is unavailable`, async ({ page }) => {
    await page.goto(`/layout.html?state=${state}&offset`);
    await expect(content(page).locator(".datetime-neo__actions")).toHaveCount(0);
    await page.getByRole("button", { name: "Outside", exact: true }).focus();
    await content(page)
      .getByRole("spinbutton")
      .first()
      .evaluate((el) => (el as HTMLElement).focus());
    await expect(page.getByRole("button", { name: "Outside", exact: true })).toBeFocused();
    await page.getByLabel("State", { exact: true }).selectOption("editable");
    await content(page).getByRole("spinbutton").first().focus();
    await expect(content(page).locator(".datetime-neo__actions")).toHaveCSS("opacity", "1");
    await contained(content(page).locator(".datetime-neo__actions"), control(page));
  });
}

test("reduced motion removes layout transitions and keeps a static placeholder", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/layout.html?offset");
  await expect(control(page)).not.toHaveAttribute("data-layout-changing");
  await expect(editor(page)).toHaveCSS("transition-duration", "0s");
  await content(page).getByRole("spinbutton").first().focus();
  await page.keyboard.press("@");
  const input = content(page).getByRole("textbox", { name: "Natural-language date and time" });
  await expect(input).toHaveAttribute("placeholder", /.+/);
  const placeholder = await input.getAttribute("placeholder");
  // Longer than a typing step: a reduced-motion placeholder must not animate.
  await page.waitForTimeout(150);
  await expect(input).toHaveAttribute("placeholder", placeholder!);
});

test("natural entry becomes readonly when the prop changes", async ({ page }) => {
  await page.goto("/layout.html");
  await content(page).getByRole("spinbutton").first().focus();
  await page.keyboard.press("@");
  const input = content(page).getByRole("textbox", { name: "Natural-language date and time" });
  await input.fill("tomorrow");
  await page.getByLabel("State", { exact: true }).selectOption("readonly");
  await expect(input).not.toBeEditable();
  await expect(content(page).locator(".datetime-neo__actions")).toHaveCount(0);
});

test("layout recomputes when consumer font metrics and locale change", async ({ page }) => {
  await page.goto("/layout.html?width=300");
  await rows(page, false);
  await control(page).evaluate((el) => {
    el.style.fontSize = "36px";
  });
  await rows(page, true);
  await control(page).evaluate((el) => {
    el.style.fontSize = "12px";
  });
  await rows(page, false);
  await page.getByLabel("Locale", { exact: true }).selectOption("ja-JP");
  await rows(page, false);
  await page.getByLabel("Offset", { exact: true }).check();
  await contained(content(page).locator(".datetime-neo__timezone"), control(page));
});

for (const width of [420, 210]) {
  test(`clicking control gaps repeatedly focuses the first segment at width ${width}`, async ({
    page,
  }) => {
    await page.goto(`/layout.html?offset&width=${width}`);
    await rows(page, width === 210);
    await control(page).hover();
    const first = content(page).getByRole("spinbutton").first();
    const last = content(page).getByRole("spinbutton").last();
    const bounds = await box(control(page));
    const offset = await box(content(page).locator(".datetime-neo__timezone"));
    const points = [
      { x: bounds.x + 2, y: bounds.y + bounds.height / 2 },
      { x: bounds.x + bounds.width - 2, y: bounds.y + bounds.height / 2 },
      { x: offset.x + offset.width / 2, y: bounds.y + 2 },
      { x: offset.x + offset.width / 2, y: bounds.y + bounds.height - 2 },
    ];
    if (width === 420) {
      const empty = await box(editor(page).locator(".datetime-neo__empty-area"));
      points.push({ x: empty.x + empty.width / 2, y: empty.y + empty.height / 2 });
    }
    for (const point of points) {
      await last.click();
      await expect(last).toBeFocused();
      for (let repeat = 0; repeat < 3; repeat++) {
        await page.mouse.move(point.x, point.y);
        await page.mouse.down();
        await expect(first).toBeFocused();
        await page.mouse.up();
        await expect(first).toBeFocused();
        expect(await control(page).evaluate((el) => el.matches(":focus-within"))).toBe(true);
      }
    }
    await content(page).getByRole("button", { name: "Enter date and time naturally" }).click();
    const input = content(page).getByRole("textbox");
    await expect(input).toBeFocused();
    await page.mouse.click(bounds.x + 2, bounds.y + bounds.height / 2);
    await expect(input).toBeFocused();
  });
}

for (const width of [420, 210]) {
  test(`value separators focus the closest segment on mouse-down at width ${width}`, async ({
    page,
  }) => {
    await page.goto(`/layout.html?locale=en-GB&offset&width=${width}`);
    await rows(page, width === 210);
    await control(page).hover();
    const separators = content(page).locator(".datetime-neo__separator");
    const cases = [
      { separator: separators.filter({ hasText: "/" }).nth(1), left: "month", right: "year" },
      { separator: separators.filter({ hasText: ":" }), left: "hour", right: "minute" },
      {
        separator: separators.filter({ hasText: "," }),
        left: "year",
        right: width === 420 ? "hour" : "year",
        // Chromium includes collapsed trailing whitespace in this inline box.
        rightFraction: width === 210 ? 0.4 : 0.9,
      },
    ];
    for (const { separator, left, right, rightFraction = 0.9 } of cases) {
      const bounds = await box(separator);
      for (const [fraction, name] of [
        [0.1, left],
        [rightFraction, right],
      ] as const) {
        await page.getByRole("button", { name: "Outside", exact: true }).focus();
        await page.mouse.move(bounds.x + bounds.width * fraction, bounds.y + bounds.height / 2);
        await page.mouse.down();
        const segment = content(page).getByRole("spinbutton", { name, exact: true });
        await expect(segment).toBeFocused();
        await expect(segment).toHaveClass(/datetime-neo__segment--selected/);
        await page.mouse.up();
        await expect(segment).toBeFocused();
      }
    }
  });
}

for (const theme of [
  undefined,
  ...themes,
  {
    id: "custom-metrics",
    css: `.theme-custom-metrics {
      font: 20px Georgia, serif;
      --datetime-neo-segment-line-height: 1;
      --datetime-neo-segment-padding: 0.3rem 0.25rem;
    }`,
  },
]) {
  test(`${theme?.id ?? "default"}: editing modes share row heights`, async ({ page }) => {
    await page.goto("/layout.html?width=420");
    await page.emulateMedia({ reducedMotion: "reduce" });
    // Exercise the consumer reset used by the gallery as well as the bare
    // component covered by the other layout tests.
    await page.addStyleTag({ content: "* { box-sizing: border-box; }" });
    if (theme) {
      await page.addStyleTag({ content: theme.css });
      await control(page).evaluate((el, id) => el.classList.add(`theme-${id}`), theme.id);
    }
    for (const offset of [false, true]) {
      await page.getByLabel("Offset", { exact: true }).setChecked(offset);
      for (const width of [420, 200]) {
        await page.getByLabel("Width", { exact: true }).fill(String(width));
        // Wait for the resize observer and rendered geometry to settle before
        // recording the height, rather than comparing against the previous width.
        await control(page).hover();
        await content(page).getByRole("spinbutton").first().focus();
        const height = (await box(control(page))).height;
        const wrapped = await content(page).getAttribute("data-wrapped");
        await page.keyboard.press("@");
        const input = content(page).getByRole("textbox", {
          name: "Natural-language date and time",
        });
        for (const text of ["", "tom", "tomorrow 9am", "invalid date"]) {
          await input.fill(text);
          await expect
            .poll(async () => Math.abs((await box(control(page))).height - height))
            .toBeLessThanOrEqual(1);
          expect(await content(page).getAttribute("data-wrapped")).toBe(wrapped);
        }
        await input.press("Escape");
        expect(Math.abs((await box(control(page))).height - height)).toBeLessThanOrEqual(1);
      }
    }
  });
}

for (const font of ["ui-monospace, monospace", '"Courier New", monospace', "Arial, sans-serif"]) {
  test(`${font}: painted digits are vertically centered`, async ({ page }) => {
    await page.goto("/layout.html?state=readonly&offset");
    const compact = themes.find((theme) => theme.id === "compact")!;
    await page.addStyleTag({ content: compact.css });
    await control(page).evaluate((el) => el.classList.add("theme-compact"));
    for (const size of [11, 13, 20]) {
      await control(page).evaluate(
        (el, style) => {
          el.style.fontFamily = style.font;
          el.style.fontSize = `${style.size}px`;
        },
        { font, size },
      );
      for (const width of [264, 140]) {
        await page.getByLabel("Width", { exact: true }).fill(String(width));
        await control(page).hover();
        const segment = content(page).getByRole("spinbutton").first();
        // Inspect painted glyphs, not the font's invisible ascent/descent box.
        // This avoids platform-specific golden images and catches visual drift
        // that equal-height geometry assertions cannot detect.
        const png = await segment.screenshot({ scale: "css" });
        const ink = await paintedTextCenter(
          page,
          `data:image/png;base64,${png.toString("base64")}`,
        );
        expect(ink.count).toBeGreaterThan(0);
        expect(ink.error, JSON.stringify({ font, size, width, ink })).toBeLessThanOrEqual(1.5);
        if ((await content(page).getAttribute("data-wrapped")) === null) {
          const textBox = await box(segment);
          const inputBox = await box(control(page));
          expect(
            Math.abs(textBox.y + textBox.height / 2 - inputBox.y - inputBox.height / 2),
          ).toBeLessThanOrEqual(1);
        }
      }
    }
  });
}

async function paintedTextCenter(page: Page, image: string) {
  return await page.evaluate(async (data) => {
    const image = new Image();
    image.src = data;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    const { data: pixels } = ctx.getImageData(0, 0, image.width, image.height);
    const rows: number[] = [];
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        const i = (y * image.width + x) * 4;
        if (pixels[i]! < 240 && pixels[i + 1]! < 240 && pixels[i + 2]! < 240) {
          rows.push(y);
          break;
        }
      }
    }
    return {
      count: rows.length,
      error: Math.abs((rows[0]! + rows[rows.length - 1]! + 1) / 2 - image.height / 2),
    };
  }, image);
}

for (const font of ["ui-monospace, monospace", '"Courier New", monospace', "Arial, sans-serif"]) {
  test(`${font}: natural input and placeholder digits are vertically centered`, async ({
    page,
  }) => {
    await page.goto("/layout.html?offset");
    await page.emulateMedia({ reducedMotion: "reduce" });
    const compact = themes.find((theme) => theme.id === "compact")!;
    await page.addStyleTag({ content: compact.css });
    await control(page).evaluate((el) => el.classList.add("theme-compact"));
    await content(page).getByRole("spinbutton").first().focus();
    await page.keyboard.press("@");
    const input = content(page).getByRole("textbox", { name: "Natural-language date and time" });
    for (const size of [11, 13, 20]) {
      await control(page).evaluate(
        (el, style) => {
          el.style.fontFamily = style.font;
          el.style.fontSize = `${style.size}px`;
        },
        { font, size },
      );
      for (const width of [264, 140]) {
        await page.getByLabel("Width", { exact: true }).fill(String(width));
        await control(page).hover();
        for (const value of ["11:11", ""]) {
          await input.fill(value);
          if (!value) {
            const placeholder = content(page).locator(".datetime-neo__natural-ghost--placeholder");
            await expect(placeholder).toHaveText((await input.getAttribute("placeholder"))!);
            // Use the same lining digits in both rendering paths to compare ink,
            // independent of the animated example's mixture of letter shapes.
            await placeholder.evaluate((el) => {
              el.textContent = "11:11";
            });
            await input.evaluate((el) => {
              (el as HTMLInputElement).placeholder = "11:11";
            });
          }
          const png = await input.screenshot({ scale: "css" });
          const ink = await paintedTextCenter(
            page,
            `data:image/png;base64,${png.toString("base64")}`,
          );
          expect(ink.count).toBeGreaterThan(0);
          expect(ink.error, JSON.stringify({ font, size, width, value, ink })).toBeLessThanOrEqual(
            1.5,
          );
        }
      }
    }
  });
}
