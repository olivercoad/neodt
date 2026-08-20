import { DateTime } from "luxon";
import { isServer, renderToString } from "solid-js/web";
import { describe, expect, it } from "vitest";

import Neodt from "../src";

describe("environment", () => {
  it("runs on server", () => {
    expect(typeof window).toBe("undefined");
    expect(isServer).toBe(true);
  });
});

describe("Neodt", () => {
  it("renders a segmented editor on the server", () => {
    const html = renderToString(() => (
      <Neodt
        referenceTime={DateTime.fromISO("2026-08-17T15:30:00Z")}
        locale="en-GB"
        value={DateTime.fromISO("2026-08-17T15:30:00Z")}
      />
    ));
    expect(html).toContain("datetime-neo__segment");
    expect(html).toContain('type="datetime-local"');
  });
});
