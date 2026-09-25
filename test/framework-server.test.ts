import { describe, expect, it, vi } from "vitest";

import { frameworks } from "../frameworks";
import type { CoreProps } from "../src/core/props";
import { builtInAdapters } from "./helpers/adapters";
const hosts = import.meta.glob<{
  renderServer: <T, TZone>(props: CoreProps<T, TZone>) => string | Promise<string>;
}>("../frameworks/*/test.{ts,tsx}", { eager: true });
for (const framework of frameworks) {
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
