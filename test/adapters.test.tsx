import { fromAbsolute, toCalendar, BuddhistCalendar } from "@internationalized/date";
import { Temporal } from "@js-temporal/polyfill";
import { DateTime, Zone } from "luxon";
import moment from "moment-timezone";
import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import spacetime from "spacetime";
import { Temporal as OtherTemporal } from "temporal-polyfill";
import { describe, expect, it, vi } from "vitest";

import Neodt, { parseNaturalDate, type DateAdapter } from "../src/generic";
import { createDateFnsAdapter } from "../src/libraries/date-fns";
import { createInternationalizedDateAdapter } from "../src/libraries/internationalized-date";
import { createLuxonAdapter } from "../src/libraries/luxon";
import { createMomentAdapter } from "../src/libraries/moment";
import { createTemporalAdapter, type TemporalZonedValue } from "../src/libraries/native-temporal";
import { createSpacetimeAdapter } from "../src/libraries/spacetime";
import { builtInAdapters } from "./helpers/adapters";

const zone = "America/New_York";
const referenceMs = Temporal.Instant.from("2026-03-07T17:00:00Z").epochMilliseconds;

function contract<T, TZone>(
  name: string,
  adapter: DateAdapter<T, TZone>,
  nativeZone: TZone,
  behavior: { gapInstant?: string; earlyYears?: boolean } = {},
) {
  describe(name, () => {
    const referenceTime = adapter.fromEpochMilliseconds(referenceMs, nativeZone);
    const parse = (input: string, reference = referenceTime) => {
      const value = parseNaturalDate(input, { adapter, referenceTime: reference });
      return value === undefined
        ? undefined
        : Temporal.Instant.fromEpochMilliseconds(adapter.toEpochMilliseconds(value)).toString({
            fractionalSecondDigits: 3,
          });
    };

    it("round-trips instants and uses the reference zone", () => {
      expect(adapter.toEpochMilliseconds(referenceTime)).toBe(referenceMs);
      expect(adapter.getFields(referenceTime)).toMatchObject({
        year: 2026,
        month: 3,
        day: 7,
        hour: 12,
      });
      expect(adapter.getOffset(referenceTime)).toBe(-300);
      expect(parse("tomorrow at 9:30am")).toBe("2026-03-08T13:30:00.000Z");
      expect(parse("tomorrow at 9:30am Pacific/Auckland")).toBe("2026-03-08T20:30:00.000Z");
    });

    it("distinguishes calendar days from elapsed hours across DST", () => {
      expect(parse("in 1 day")).toBe("2026-03-08T16:00:00.000Z");
      expect(parse("in 24 hours")).toBe("2026-03-08T17:00:00.000Z");
      expect(parse("march 8 2026 2:30am")).toBe(behavior.gapInstant ?? "2026-03-08T07:30:00.000Z");
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

    it("formats library wall-clock fields and zone labels without mutating values", () => {
      const value = adapter.add(referenceTime, { days: 1 });
      const before = adapter.toEpochMilliseconds(value);
      const formatter = adapter.createFormatter(adapter.getZone(value), "en-US", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hourCycle: "h23",
        timeZoneName: "short",
      });
      const parts = formatter.formatToParts(value);
      const part = (type: string) => parts.find((part) => part.type === type)?.value;
      expect(part("year")).toBe("2026");
      expect(part("month")).toBe("3");
      expect(part("day")).toBe("8");
      expect(part("hour")).toBe("12");
      expect(part("minute")).toBe("00");
      expect(part("timeZoneName")).toBe("EDT");
      expect(adapter.toEpochMilliseconds(value)).toBe(before);
      expect(adapter.getOffset(value)).toBe(-240);
      const earlierParts = formatter.formatToParts(referenceTime);
      expect(earlierParts.find((part) => part.type === "hour")?.value).toBe("12");
      expect(earlierParts.find((part) => part.type === "timeZoneName")?.value).toBe("EST");
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
            showTimeOffset
            locale="en-GB"
            formatOptions={{ hour12: false }}
          />
        ),
        host,
      );
      try {
        expect(host.querySelector(".datetime-neo__timezone")?.textContent).toBe("-5:00");
        const hour = host.querySelector<HTMLElement>('[role="spinbutton"][aria-label="hour"]')!;
        hour.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
        expect(adapter.toEpochMilliseconds(value()!)).toBe(referenceMs + 3_600_000);
        expect(value()?.constructor).toBe(referenceTime?.constructor);
        expect(adapter.toEpochMilliseconds(referenceTime)).toBe(referenceMs);
        const native = host.querySelector<HTMLInputElement>('input[type="datetime-local"]')!;
        native.value = "2026-03-08T09:30";
        native.dispatchEvent(new Event("input", { bubbles: true }));
        expect(adapter.toEpochMilliseconds(value()!)).toBe(
          Temporal.Instant.from("2026-03-08T13:30Z").epochMilliseconds,
        );
        expect(host.querySelector(".datetime-neo__timezone")?.textContent).toBe("-4:00");
        native.value = "";
        native.dispatchEvent(new Event("input", { bubbles: true }));
        expect(value()).toBeNull();
        setValue(() => adapter.fromEpochMilliseconds(referenceMs, nativeZone));
        expect(hour.getAttribute("aria-valuenow")).toBe("12");
        if (behavior.earlyYears !== false) {
          const year = host.querySelector<HTMLElement>('[role="spinbutton"][aria-label="year"]')!;
          for (const key of ["Backspace", ..."2028"])
            year.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
          expect(
            Temporal.Instant.fromEpochMilliseconds(
              adapter.toEpochMilliseconds(value()!),
            ).toZonedDateTimeISO("UTC").year,
          ).toBe(2028);
          expect(hour.getAttribute("aria-valuenow")).toBe("12");
        }
      } finally {
        dispose();
        host.remove();
      }
    });
  });
}

for (const implementation of builtInAdapters)
  implementation.run(({ name, adapter, zone: nativeZone, behavior }) => {
    contract(name, adapter, nativeZone(zone), behavior);
  });

it("formats Moment zones that are absent from Intl's database", () => {
  const zone = "Neodt/Custom";
  moment.tz.add(`${zone}|NDT|-5J|0|`);
  const adapter = createMomentAdapter(moment);
  const value = adapter.fromEpochMilliseconds(0, zone);
  const parts = adapter
    .createFormatter(zone, "en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZoneName: "short",
    })
    .formatToParts(value);
  expect(parts.find((part) => part.type === "hour")?.value).toBe("05");
  expect(parts.find((part) => part.type === "minute")?.value).toBe("45");
  expect(parts.find((part) => part.type === "timeZoneName")?.value).toBe("UTC+05:45");
});

it("retains Spacetime's own historical offsets when formatting", () => {
  const adapter = createSpacetimeAdapter(spacetime);
  const value = adapter.fromEpochMilliseconds(
    Temporal.Instant.from("1900-01-01T00:00Z").epochMilliseconds,
    "Europe/Paris",
  );
  const fields = adapter.getFields(value);
  const parts = adapter
    .createFormatter(adapter.getZone(value), "en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
    .formatToParts(value);
  expect(Number(parts.find((part) => part.type === "hour")?.value)).toBe(fields.hour);
  expect(Number(parts.find((part) => part.type === "minute")?.value)).toBe(fields.minute);
});

describe.each([
  ["js-temporal-polyfill", Temporal],
  ["temporal-polyfill", OtherTemporal],
] as const)("%s native Temporal contract", (_name, Temporal) => {
  it("uses the supplied Temporal implementation for construction and arithmetic", () => {
    const from = vi.fn(Temporal.ZonedDateTime.from);
    const fromEpochMilliseconds = vi.fn(Temporal.Instant.fromEpochMilliseconds);
    const adapter = createTemporalAdapter<TemporalZonedValue>({
      ZonedDateTime: { from },
      Instant: { fromEpochMilliseconds },
    });
    const referenceTime =
      Temporal.Instant.fromEpochMilliseconds(referenceMs).toZonedDateTimeISO(zone);
    const value = parseNaturalDate("march 8 2026 9am", { adapter, referenceTime });
    expect(value).toBeInstanceOf(Temporal.ZonedDateTime);
    expect(value?.epochMilliseconds).toBe(
      Temporal.ZonedDateTime.from({ timeZone: zone, year: 2026, month: 3, day: 8, hour: 9 })
        .epochMilliseconds,
    );
    expect(from).toHaveBeenCalled();
    expect(fromEpochMilliseconds).toHaveBeenCalled();
  });
});

function opaqueAdapter<TZone>(
  zoneName: (zone: TZone) => string,
  zoneFromId: (id: string) => TZone,
): DateAdapter<{ ms: number; zone: TZone }, TZone> {
  type Value = { ms: number; zone: TZone };
  const library = createLuxonAdapter(DateTime);
  const native = (value: Value) => library.fromEpochMilliseconds(value.ms, zoneName(value.zone));
  const pack = (value: DateTime, zone: TZone): Value => ({ ms: value.toMillis(), zone });
  return {
    getZone: (value) => value.zone,
    toEpochMilliseconds: (value) => value.ms,
    fromEpochMilliseconds: (ms, zone) => ({ ms, zone }),
    getFields: (value) => library.getFields(native(value)),
    fromFields: (fields, zone) => pack(library.fromFields(fields, zoneName(zone)), zone),
    setFields: (value, fields) => pack(library.setFields(native(value), fields), value.zone),
    add: (value, duration) => pack(library.add(native(value), duration), value.zone),
    startOf: (value, unit) => pack(library.startOf(native(value), unit), value.zone),
    getWeekday: (value) => library.getWeekday(native(value)),
    getDaysInMonth: (value) => library.getDaysInMonth(native(value)),
    getOffset: (value) => library.getOffset(native(value)),
    setZoneId: (value, id) => pack(library.setZoneId(native(value), id), zoneFromId(id)),
    createFormatter: (zone, locale, options) => {
      const formatter = library.createFormatter(zoneName(zone), locale, options);
      return { formatToParts: (value) => formatter.formatToParts(native(value)) };
    },
  };
}

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
  const adapter = opaqueAdapter<Zone>(
    (zone) => zone.id,
    (id) => ({ id, applicationMetadata: Symbol("zone") }),
  );
  const referenceTime = { ms: referenceMs, zone };
  const parsed = parseNaturalDate("tomorrow 9am Pacific/Auckland", {
    adapter,
    referenceTime,
    zone,
  });
  expect(parsed?.zone).toBe(zone);
  expect(parsed?.ms).toBe(Temporal.Instant.from("2026-03-08T20:00Z").epochMilliseconds);

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
  const adapter = opaqueAdapter<string | null>(
    (zone) => zone ?? "UTC",
    (id) => id,
  );
  const result = parseNaturalDate("tomorrow", {
    adapter,
    referenceTime: { ms: referenceMs, zone: "America/New_York" },
    zone: null,
  });
  expect(result?.zone).toBeNull();
  expect(result?.ms).toBe(Temporal.Instant.from("2026-03-08T00:00Z").epochMilliseconds);
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

for (const implementation of builtInAdapters)
  implementation.run(({ adapter, date, zone }) => {
    describe(`${implementation.name} adapter integration`, () => {
      it("accepts an explicit parser timezone", () => {
        const result = parseNaturalDate("tomorrow 9am", {
          adapter,
          referenceTime: date("2026-03-07T17:00Z", "America/New_York"),
          zone: zone("Asia/Kathmandu"),
        });
        expect(adapter.toEpochMilliseconds(result!)).toBe(Date.parse("2026-03-08T03:15:00Z"));
        expect(adapter.getFields(result!)).toMatchObject({
          year: 2026,
          month: 3,
          day: 8,
          hour: 9,
          minute: 0,
        });
      });

      it("uses adapter offsets for showTimeOffset without deriving them from the zone", () => {
        const getOffset = vi.fn(() => 345);
        const custom = { ...adapter, getOffset };
        const referenceTime = date("2026-03-07T17:00Z");
        const host = document.createElement("div");
        const dispose = render(
          () => (
            <Neodt
              adapter={custom}
              referenceTime={referenceTime}
              defaultValue={referenceTime}
              showTimeOffset
            />
          ),
          host,
        );
        try {
          expect(host.querySelector(".datetime-neo__timezone")?.textContent).toBe("+5:45");
          expect(getOffset).toHaveBeenCalled();
        } finally {
          dispose();
        }
      });
    });
  });

it("inherits Spacetime's native gap resolution", () => {
  const adapter = createSpacetimeAdapter(spacetime);
  const referenceTime = spacetime(referenceMs, zone);
  const result = parseNaturalDate("march 8 2026 2:30am", { adapter, referenceTime });
  const native = spacetime([2026, 2, 8, 0, 0], zone).hour(2).minute(30).startOf("minute");
  expect(result?.epoch).toBe(native.epoch);
});

it("supports native Luxon zones without an Intl-compatible identifier", () => {
  class ApplicationZone extends Zone {
    get type() {
      return "application";
    }
    get name() {
      return "Application clock";
    }
    get isUniversal() {
      return true;
    }
    get isValid() {
      return true;
    }
    offset() {
      return 345;
    }
    offsetName() {
      return "Application clock";
    }
    formatOffset() {
      return "+05:45";
    }
    equals(other: Zone): boolean {
      return this === other;
    }
  }
  const zone = new ApplicationZone();
  const adapter = createLuxonAdapter(DateTime);
  const referenceTime = DateTime.fromObject({ year: 2026, month: 4, day: 15, hour: 12 }, { zone });
  const result = parseNaturalDate("tomorrow 9am", { adapter, referenceTime });
  expect(result?.zone).toBe(zone);
  expect(result?.toISO()).toBe("2026-04-16T09:00:00.000+05:45");
  const host = document.createElement("div");
  const dispose = render(
    () => (
      <Neodt
        adapter={adapter}
        referenceTime={referenceTime}
        defaultValue={referenceTime}
        showTimeOffset
      />
    ),
    host,
  );
  try {
    expect(host.querySelector(".datetime-neo__timezone")?.textContent).toBe("+5:45");
  } finally {
    dispose();
  }
});

// The lightweight temporal-polyfill entry supports only ISO/Gregorian calendars.

it("edits Temporal values in ISO/Gregorian fields regardless of their input calendar", () => {
  const adapter = createTemporalAdapter<TemporalZonedValue>(Temporal);
  const reference = Temporal.Instant.fromEpochMilliseconds(referenceMs).toZonedDateTimeISO(zone);
  const hebrew = reference.withCalendar("hebrew");
  expect(adapter.getFields(hebrew)).toEqual(adapter.getFields(reference));
  expect(adapter.setFields(hebrew, { year: 2028 }).epochMilliseconds).toBe(
    reference.with({ year: 2028 }).epochMilliseconds,
  );
  expect(adapter.add(hebrew, { months: 1 }).epochMilliseconds).toBe(
    reference.add({ months: 1 }).epochMilliseconds,
  );
  expect(hebrew.calendarId).toBe("hebrew");
});
