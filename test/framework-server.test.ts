import { DateTime } from "luxon";
import { describe, expect, it, vi } from "vitest";

import { frameworks } from "../frameworks";
import * as vanilla from "../generated/vanilla/index";
import { parseNaturalDate as parseVanilla } from "../generated/vanilla/luxon";
import type { CoreProps } from "../src/core/props";
import { builtInAdapters } from "./helpers/adapters";

it("Vanilla imports without browser globals and its parser works on the server", () => {
  expect(typeof document).toBe("undefined");
  expect(typeof vanilla.default).toBe("function");
  const referenceTime = DateTime.fromISO("2026-08-17T15:30", { zone: "UTC" });
  expect(parseVanilla("tomorrow", { referenceTime })?.day).toBe(18);
});
const hosts = import.meta.glob<{
  renderServer: <T, TZone>(props: CoreProps<T, TZone>) => string | Promise<string>;
}>("../frameworks/*/test.{ts,tsx}", { eager: true });
for (const framework of frameworks.filter(({ serverRendering }) => serverRendering)) {
  const host = Object.entries(hosts).find(([path]) => path.includes(`/${framework.id}/`))![1];
  describe(framework.label, () => {
    for (const implementation of builtInAdapters)
      implementation.run(({ adapter, date }) => {
        it(`${implementation.name}: renders deterministic values without browser globals or change callbacks`, async () => {
          const referenceTime = date("2026-08-17T15:30:00Z", "Australia/Sydney");
          const changed = vi.fn();
          const html = await host.renderServer({
            adapter,
            referenceTime,
            value: referenceTime,
            locale: "en-GB",
            onValueChange: changed,
          });
          expect(html).toContain('role="spinbutton"');
          expect(html).toContain('value="2026-08-18T01:30"');
          expect(html).toContain('aria-label="day"');
          expect(changed).not.toHaveBeenCalled();
        });
      });
  });
}
