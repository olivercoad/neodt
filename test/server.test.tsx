import { isServer, renderToString } from "solid-js/web";
import { Temporal } from "temporal-polyfill";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Neodt from "../src/generic";
import { builtInAdapters } from "./helpers/adapters";
import { forEachConfiguredEntry } from "./helpers/entries";

describe("environment", () => {
  it("runs on server", () => {
    expect(typeof window).toBe("undefined");
    expect(isServer).toBe(true);
  });
});

for (const implementation of builtInAdapters)
  implementation.run(({ adapter, date }) => {
    describe(implementation.name, () => {
      it("renders a segmented editor and native value on the server", () => {
        const referenceTime = date("2026-08-17T15:30:00Z", "Australia/Sydney");
        const html = renderToString(() => (
          <Neodt
            adapter={adapter}
            referenceTime={referenceTime}
            locale="en-GB"
            value={referenceTime}
          />
        ));
        expect(html).toContain("datetime-neo__segment");
        expect(html).toContain('type="datetime-local"');
        expect(html).toContain('value="2026-08-18T01:30"');
      });
    });
  });

forEachConfiguredEntry((name, entry, referenceTime, _epoch, nativeEntry) => {
  describe(`${name} configured entry`, () => {
    if (nativeEntry) {
      beforeEach(() => vi.stubGlobal("Temporal", Temporal));
      afterEach(() => vi.unstubAllGlobals());
    }
    it("renders the configured component on the server", () => {
      const Neodt = entry.default;
      const html = renderToString(() => (
        <Neodt referenceTime={referenceTime} value={referenceTime} locale="en-GB" />
      ));
      expect(html).toContain("datetime-neo__segment");
      expect(html).toContain('type="datetime-local"');
      expect(html).toContain("2026");
    });
  });
});
