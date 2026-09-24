import { fromAbsolute } from "@internationalized/date";
import { Temporal as JsTemporal } from "@js-temporal/polyfill";
import { toDate } from "date-fns/toDate";
import dayjs from "dayjs";
import { DateTime } from "luxon";
import moment from "moment";
import { createSignal, type JSX } from "solid-js";
import { render } from "solid-js/web";
import spacetime from "spacetime";
import { Temporal as Ponyfill } from "temporal-polyfill";
import { describe, expect, it, vi } from "vitest";

import * as native from "../src";
import type { ConfiguredNeodtProps, ConfiguredNaturalDateParseOptions } from "../src/configured";
import * as dates from "../src/date-fns";
import * as days from "../src/dayjs";
import * as internationalized from "../src/internationalized-date";
import * as jsTemporal from "../src/js-temporal-polyfill";
import * as luxon from "../src/luxon";
import * as moments from "../src/moment";
import * as spaces from "../src/spacetime";
import * as temporal from "../src/temporal-polyfill";

const milliseconds = JsTemporal.Instant.from("2026-04-15T12:30Z").epochMilliseconds;

function contract<T, TZone>(
  name: string,
  entry: {
    default: (props: ConfiguredNeodtProps<T, TZone>) => JSX.Element;
    Neodt: (props: ConfiguredNeodtProps<T, TZone>) => JSX.Element;
    parseNaturalDate: (
      value: string,
      options: ConfiguredNaturalDateParseOptions<T, TZone>,
    ) => T | undefined;
  },
  referenceTime: T,
  epoch: (value: T) => number,
) {
  describe(name, () => {
    it("binds the parser to the selected implementation", () => {
      const result = entry.parseNaturalDate("in 1 hour", { referenceTime });
      expect(result).toBeInstanceOf((referenceTime as object).constructor);
      expect(epoch(result!)).toBe(milliseconds + 3_600_000);
      expect(entry.Neodt).toBe(entry.default);
    });

    it("edits, clears and responds to controlled replacements without an adapter prop", () => {
      const [value, setValue] = createSignal<T | null>(referenceTime);
      const Neodt = entry.default;
      const host = document.createElement("div");
      document.body.append(host);
      const dispose = render(
        () => <Neodt referenceTime={referenceTime} value={value()} onValueChange={setValue} />,
        host,
      );
      const hour = () => host.querySelector('[role="spinbutton"][aria-label="hour"]')!;
      try {
        hour().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
        expect(value()).toBeInstanceOf((referenceTime as object).constructor);
        expect(epoch(value()!)).toBe(milliseconds + 3_600_000);
        expect(epoch(referenceTime)).toBe(milliseconds);
        setValue(() => referenceTime);
        hour().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
        expect(epoch(value()!)).toBe(milliseconds + 3_600_000);
        hour().dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true }));
        expect(value()).toBeNull();
      } finally {
        dispose();
        host.remove();
      }
    });
  });
}

contract(
  "@internationalized/date",
  internationalized,
  fromAbsolute(milliseconds, "America/New_York"),
  (value) => value.toDate().getTime(),
);
contract("luxon", luxon, DateTime.fromMillis(milliseconds), (value) => value.toMillis());
contract("moment", moments, moment(milliseconds), (value) => value.valueOf());
contract("dayjs", days, dayjs(milliseconds), (value) => value.valueOf());
contract("date-fns", dates, toDate(milliseconds), (value) => value.getTime());
contract("spacetime", spaces, spacetime(milliseconds), (value) => value.epoch);
contract(
  "temporal-polyfill",
  temporal,
  Ponyfill.Instant.fromEpochMilliseconds(milliseconds).toZonedDateTimeISO("UTC"),
  (value) => value.epochMilliseconds,
);
contract(
  "js-temporal-polyfill",
  jsTemporal,
  JsTemporal.Instant.fromEpochMilliseconds(milliseconds).toZonedDateTimeISO("UTC"),
  (value) => value.epochMilliseconds,
);

it("resolves global Temporal lazily and never installs a polyfill", () => {
  const referenceTime =
    Ponyfill.Instant.fromEpochMilliseconds(milliseconds).toZonedDateTimeISO("UTC");
  try {
    vi.stubGlobal("Temporal", undefined);
    expect(native.parseNaturalDate("now", { referenceTime })).toBeUndefined();
    expect(temporal.parseNaturalDate("now", { referenceTime })).toBeInstanceOf(
      Ponyfill.ZonedDateTime,
    );
    expect(globalThis.Temporal).toBeUndefined();
    vi.stubGlobal("Temporal", Ponyfill);
    const result = native.parseNaturalDate("in 1 hour", { referenceTime });
    expect(result).toBeInstanceOf(Ponyfill.ZonedDateTime);
    expect(result?.epochMilliseconds).toBe(milliseconds + 3_600_000);
  } finally {
    vi.unstubAllGlobals();
  }
});
