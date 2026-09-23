import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

test("uses native Temporal without installing a polyfill on the page", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { originalTemporal: unknown }).originalTemporal = globalThis.Temporal;
  });
  await page.goto("/layout.html");
  const available = await page.evaluate(() =>
    Boolean((window as unknown as { originalTemporal: unknown }).originalTemporal),
  );
  test.skip(!available, "This browser does not provide native Temporal");
  const result = await page.evaluate(
    async (entryPath) => {
      const { parseNaturalDate } = (await import(
        /* @vite-ignore */ entryPath
      )) as typeof import("../../src");
      const referenceTime: Temporal.ZonedDateTime = Temporal.ZonedDateTime.from(
        "2026-03-07T12:00-05:00[America/New_York]",
      );
      const value = parseNaturalDate("tomorrow 9:30am", { referenceTime });
      return {
        native: value instanceof Temporal.ZonedDateTime,
        iso: value?.toString(),
        sameImplementation:
          Temporal === (window as unknown as { originalTemporal: unknown }).originalTemporal,
      };
    },
    `/@fs${fileURLToPath(new URL("../../src/index.tsx", import.meta.url))}`,
  );
  expect(result).toEqual({
    native: true,
    iso: "2026-03-08T09:30:00-04:00[America/New_York]",
    sameImplementation: true,
  });
});
