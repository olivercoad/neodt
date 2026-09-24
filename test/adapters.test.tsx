import { fromAbsolute, toCalendar, BuddhistCalendar } from "@internationalized/date";
import { Temporal } from "@js-temporal/polyfill";
import { toDate } from "date-fns/toDate";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { DateTime } from "luxon";
import moment from "moment";
import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import spacetime from "spacetime";
import { Temporal as OtherTemporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import { createDateFnsAdapter } from "../src/adapters/date-fns";
import { createDayjsAdapter } from "../src/adapters/dayjs";
import { createInternationalizedDateAdapter } from "../src/adapters/internationalized-date";
import { createLuxonAdapter } from "../src/adapters/luxon";
import { createMomentAdapter } from "../src/adapters/moment";
import { createSpacetimeAdapter } from "../src/adapters/spacetime";
import { createTemporalAdapter } from "../src/adapters/temporal";
import Neodt, { parseNaturalDate, type DateAdapter } from "../src/generic";

dayjs.extend(utc);
dayjs.extend(timezone);
const zone = "America/New_York";
const referenceMs = Date.parse("2026-03-07T17:00:00Z");

function contract<T, TZone>(name: string, adapter: DateAdapter<T, TZone>, nativeZone: TZone) {
  describe(name, () => {
    const referenceTime = adapter.fromEpochMilliseconds(referenceMs, nativeZone);
    const parse = (input: string, reference = referenceTime) => {
      const value = parseNaturalDate(input, { adapter, referenceTime: reference });
      return value === undefined
        ? undefined
        : new Date(adapter.toEpochMilliseconds(value)).toISOString();
    };

    it("round-trips instants and uses the reference zone", () => {
      expect(adapter.toEpochMilliseconds(referenceTime)).toBe(referenceMs);
      expect(adapter.getZoneId(adapter.getZone(referenceTime)).toLowerCase()).toBe(
        zone.toLowerCase(),
      );
      expect(parse("tomorrow at 9:30am")).toBe("2026-03-08T13:30:00.000Z");
      expect(parse("tomorrow at 9:30am Pacific/Auckland")).toBe("2026-03-08T20:30:00.000Z");
    });

    it("distinguishes calendar days from elapsed hours across DST", () => {
      expect(parse("in 1 day")).toBe("2026-03-08T16:00:00.000Z");
      expect(parse("in 24 hours")).toBe("2026-03-08T17:00:00.000Z");
      expect(parse("march 8 2026 2:30am")).toBe("2026-03-08T07:30:00.000Z");
      expect(parse("november 1 2026 1:30am")).toBe("2026-11-01T05:30:00.000Z");
    });

    it("clamps month/year arithmetic and rejects overflowing dates", () => {
      expect(parse("january 31 2026 plus 1 month")).toBe("2026-02-28T05:00:00.000Z");
      expect(parse("february 29 2024 plus 1 year")).toBe("2025-02-28T05:00:00.000Z");
      expect(parse("february 30 2026")).toBeUndefined();
      expect(parse("2026-02-30T09:00")).toBeUndefined();
      expect(parse("5pm America/Invalid")).toBeUndefined();
      expect(parse("2026-03-08T09:30")).toBe("2026-03-08T13:30:00.000Z");
      expect(parse("2026-03-08T09:30+05:45")).toBe("2026-03-08T03:45:00.000Z");
    });

    it("does not mutate the reference value", () => {
      const before = adapter.toEpochMilliseconds(referenceTime);
      parse("in 1 month");
      parse("tomorrow 9am");
      expect(adapter.toEpochMilliseconds(referenceTime)).toBe(before);
    });

    it("edits, echoes, clears and replaces controlled values in the adapter type", () => {
      const [value, setValue] = createSignal<T | null>(referenceTime);
      const host = document.createElement("div");
      document.body.append(host);
      const dispose = render(
        () => (
          <Neodt
            adapter={adapter}
            referenceTime={referenceTime}
            value={value()}
            onValueChange={setValue}
            locale="en-GB"
            formatOptions={{ hour12: false }}
          />
        ),
        host,
      );
      try {
        const hour = host.querySelector<HTMLElement>('[role="spinbutton"][aria-label="hour"]')!;
        hour.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
        expect(adapter.toEpochMilliseconds(value()!)).toBe(referenceMs + 3_600_000);
        expect(value()?.constructor).toBe(referenceTime?.constructor);
        expect(adapter.toEpochMilliseconds(referenceTime)).toBe(referenceMs);
        const native = host.querySelector<HTMLInputElement>('input[type="datetime-local"]')!;
        native.value = "2026-03-08T09:30";
        native.dispatchEvent(new Event("input", { bubbles: true }));
        expect(adapter.toEpochMilliseconds(value()!)).toBe(Date.parse("2026-03-08T13:30Z"));
        native.value = "";
        native.dispatchEvent(new Event("input", { bubbles: true }));
        expect(value()).toBeNull();
        setValue(() => adapter.fromEpochMilliseconds(referenceMs, nativeZone));
        expect(hour.getAttribute("aria-valuenow")).toBe("12");
        const year = host.querySelector<HTMLElement>('[role="spinbutton"][aria-label="year"]')!;
        for (const key of ["Backspace", ..."2028"])
          year.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
        expect(new Date(adapter.toEpochMilliseconds(value()!)).getUTCFullYear()).toBe(2028);
        expect(hour.getAttribute("aria-valuenow")).toBe("12");
      } finally {
        dispose();
        host.remove();
      }
    });
  });
}

contract("@internationalized/date", createInternationalizedDateAdapter(fromAbsolute), zone);
contract("Luxon", createLuxonAdapter(DateTime), DateTime.now().setZone(zone).zone);
contract("Moment", createMomentAdapter(moment, { zone }), zone);
contract("Day.js", createDayjsAdapter(dayjs, { zone }), zone);
contract("date-fns", createDateFnsAdapter(toDate, { zone }), zone);
contract("Spacetime", createSpacetimeAdapter(spacetime), zone);
contract("Temporal @js-temporal/polyfill", createTemporalAdapter(Temporal), zone);
contract("Temporal temporal-polyfill ponyfill", createTemporalAdapter(OtherTemporal), zone);

it("constructs Temporal values only through the supplied implementation", () => {
  class CustomZoned {
    constructor(
      readonly epochMilliseconds: number,
      readonly timeZoneId: string,
    ) {}
  }
  const adapter = createTemporalAdapter({
    Instant: {
      fromEpochMilliseconds: (ms: number) => ({
        toZonedDateTimeISO: (zone: string) => new CustomZoned(ms, zone),
      }),
    },
  });
  const value = parseNaturalDate("tomorrow", {
    adapter,
    referenceTime: new CustomZoned(referenceMs, zone),
  });
  expect(value).toBeInstanceOf(CustomZoned);
  expect(value?.timeZoneId).toBe(zone);
});

it("retains date-fns Date subclasses", () => {
  class CustomDate extends Date {
    readonly tag = "custom";
  }
  const adapter = createDateFnsAdapter<CustomDate>((ms) => new CustomDate(ms), { zone });
  const value = parseNaturalDate("tomorrow", {
    adapter,
    referenceTime: new CustomDate(referenceMs),
  });
  expect(value).toBeInstanceOf(CustomDate);
});

it("accepts native Luxon Zone objects for parser zones", () => {
  const adapter = createLuxonAdapter(DateTime);
  const referenceTime = DateTime.fromISO("2026-04-15T12:00Z");
  const zone = DateTime.now().setZone("Asia/Kathmandu").zone;
  const result = parseNaturalDate("tomorrow 9am", { adapter, referenceTime, zone });
  expect(result?.zone).toBe(zone);
  expect(result?.toISO()).toBe("2026-04-16T09:00:00.000+05:45");
});

it("retains an opaque native zone unchanged through parsing and component callbacks", () => {
  const zone = { id: "America/New_York", applicationMetadata: Symbol("native zone") };
  type Zone = typeof zone;
  type Value = { ms: number; zone: Zone };
  const adapter: DateAdapter<Value, Zone> = {
    getZone: (value) => value.zone,
    getZoneId: (zone) => zone.id,
    toEpochMilliseconds: (value) => value.ms,
    fromEpochMilliseconds: (ms, zone) => ({ ms, zone }),
  };
  const referenceTime = { ms: referenceMs, zone };
  const parsed = parseNaturalDate("tomorrow 9am Pacific/Auckland", {
    adapter,
    referenceTime,
    zone,
  });
  expect(parsed?.zone).toBe(zone);
  expect(parsed?.ms).toBe(Date.parse("2026-03-08T20:00Z"));

  const host = document.createElement("div");
  document.body.append(host);
  let output: Value | null = null;
  const dispose = render(
    () => (
      <Neodt
        adapter={adapter}
        referenceTime={referenceTime}
        defaultValue={referenceTime}
        onValueChange={(value) => {
          output = value;
        }}
      />
    ),
    host,
  );
  try {
    host
      .querySelector('[role="spinbutton"][aria-label="hour"]')!
      .dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    expect(output).toEqual({ ms: referenceMs + 3_600_000, zone });
    expect((output as Value | null)?.zone).toBe(zone);
  } finally {
    dispose();
    host.remove();
  }
});

it("passes an explicitly supplied null zone to adapters that support it", () => {
  type Value = { ms: number; zone: string | null };
  const adapter: DateAdapter<Value, string | null> = {
    getZone: (value) => value.zone,
    getZoneId: (zone) => zone ?? "UTC",
    toEpochMilliseconds: (value) => value.ms,
    fromEpochMilliseconds: (ms, zone) => ({ ms, zone }),
  };
  const result = parseNaturalDate("tomorrow", {
    adapter,
    referenceTime: { ms: referenceMs, zone: "America/New_York" },
    zone: null,
  });
  expect(result?.zone).toBeNull();
  expect(result?.ms).toBe(Date.parse("2026-03-08T00:00Z"));
});

it("converts non-Gregorian internationalized dates by instant and returns Gregorian values", () => {
  const adapter = createInternationalizedDateAdapter(fromAbsolute);
  const referenceTime = toCalendar(fromAbsolute(referenceMs, zone), new BuddhistCalendar());
  const result = parseNaturalDate("in 1 day", { adapter, referenceTime });
  expect(result?.calendar.identifier).toBe("gregory");
  expect(result?.year).toBe(2026);
  expect(result?.timeZone).toBe(zone);
  expect(result?.toAbsoluteString()).toBe("2026-03-08T16:00:00.000Z");
  expect(referenceTime.calendar.identifier).toBe("buddhist");
  expect(referenceTime.year).toBe(2569);
  expect(referenceTime.toDate().getTime()).toBe(referenceMs);
});

it("accepts an explicit internationalized date parser timezone", () => {
  const adapter = createInternationalizedDateAdapter(fromAbsolute);
  const result = parseNaturalDate("tomorrow 9am", {
    adapter,
    referenceTime: fromAbsolute(referenceMs, zone),
    zone: "Asia/Kathmandu",
  });
  expect(result?.timeZone).toBe("Asia/Kathmandu");
  expect(result?.toAbsoluteString()).toBe("2026-03-08T03:15:00.000Z");
});
