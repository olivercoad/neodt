import { Temporal } from "@js-temporal/polyfill";
import { DateTime, FixedOffsetZone } from "luxon";
import { describe, expect, it, vi } from "vitest";

import { createLuxonAdapter } from "../src/adapters/luxon";
import { createTemporalAdapter } from "../src/adapters/temporal";
import { calendarDate } from "../src/calendar";
import { offsetZone } from "../src/format";
import { formatterFor } from "../src/formatter-cache";

const zone = "America/New_York";
const options: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZoneName: "short",
};
const part = (parts: Intl.DateTimeFormatPart[], type: string) =>
  parts.find((part) => part.type === type)?.value;

describe("formatter reuse", () => {
  it("uses one Intl formatter for different dates and both sides of a DST fold", () => {
    const adapter = createTemporalAdapter(Temporal);
    const values = [
      "2026-11-01T01:30-04:00[America/New_York]",
      "2026-11-01T01:30-05:00[America/New_York]",
      "2026-12-01T10:15-05:00[America/New_York]",
    ].map((text) => calendarDate(adapter, Temporal.ZonedDateTime.from(text)));
    const DateTimeFormat = Intl.DateTimeFormat;
    const construct = vi
      .spyOn(Intl, "DateTimeFormat")
      .mockImplementation(function (locale, options) {
        return new DateTimeFormat(locale, options);
      });
    try {
      const parts = values.map((value) => value.toLocaleParts("en-US", options));
      expect(parts.map((parts) => part(parts, "hour"))).toEqual(["01", "01", "10"]);
      expect(parts.map((parts) => part(parts, "timeZoneName"))).toEqual(["EDT", "EST", "EST"]);
      expect(construct).toHaveBeenCalledTimes(1);
    } finally {
      construct.mockRestore();
    }
  });

  it("formats Gregorian fields and fractional seconds directly from a Temporal instant", () => {
    const adapter = createTemporalAdapter(Temporal);
    const value = Temporal.ZonedDateTime.from("2026-09-23T12:34:56.789+05:45[+05:45]").withCalendar(
      "hebrew",
    );
    const parts = calendarDate(adapter, value).toLocaleParts("en-US", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      fractionalSecondDigits: 3,
      hourCycle: "h23",
    });
    expect(
      ["year", "month", "day", "hour", "minute", "second", "fractionalSecond"].map((type) =>
        part(parts, type),
      ),
    ).toEqual(["2026", "9", "23", "12", "34", "56", "789"]);
  });

  it("keys by locale and option values, including mutated option objects", () => {
    const adapter = createTemporalAdapter(Temporal);
    const initial = formatterFor(adapter, zone, "en-us", options);
    expect(
      formatterFor(adapter, zone, [new Intl.Locale("en-US")], {
        timeZoneName: "short",
        minute: "2-digit",
        hour: "2-digit",
        hourCycle: "h23",
        second: undefined,
      }),
    ).toBe(initial);
    expect(formatterFor(adapter, zone, "en-GB", options)).not.toBe(initial);
    const mutable: Intl.DateTimeFormatOptions = { ...options };
    mutable.hourCycle = "h12";
    const twelveHour = formatterFor(adapter, zone, "en-US", mutable);
    expect(twelveHour).not.toBe(initial);
    mutable.hourCycle = "h23";
    expect(formatterFor(adapter, zone, "en-US", mutable)).toBe(initial);
    const value = Temporal.ZonedDateTime.from("2026-12-01T15:00-05:00[America/New_York]");
    expect(part(twelveHour.formatToParts(value), "hour")).toBe("03");
    expect(part(initial.formatToParts(value), "hour")).toBe("15");
  });

  it("separates zones and adapters, preserving opaque zone identity", () => {
    const adapter = createLuxonAdapter(DateTime);
    const firstZone = FixedOffsetZone.instance(345);
    const secondZone = FixedOffsetZone.instance(345);
    expect(firstZone).not.toBe(secondZone);
    const first = formatterFor(adapter, firstZone, "en-US", options);
    expect(formatterFor(adapter, firstZone, "en-US", options)).toBe(first);
    expect(formatterFor(adapter, secondZone, "en-US", options)).not.toBe(first);
    expect(formatterFor(createLuxonAdapter(DateTime), firstZone, "en-US", options)).not.toBe(first);
    expect(formatterFor(adapter, "UTC", "en-US", options)).not.toBe(first);
  });

  it("preserves value-owned Luxon locales when no locale is requested", () => {
    const adapter = createLuxonAdapter(DateTime);
    const value = DateTime.fromISO("2026-09-23T12:00Z", { zone: "UTC", locale: "fr" });
    const formatter = formatterFor(adapter, value.zone, undefined, { month: "long" });
    expect(part(formatter.formatToParts(value), "month")).toBe("septembre");
    expect(formatterFor(adapter, value.zone, [], { month: "long" })).not.toBe(formatter);
  });

  it("retains at most 32 entries per adapter and evicts the least recently used", () => {
    const adapter = createTemporalAdapter(Temporal);
    const format = (offset: number) => formatterFor(adapter, offsetZone(offset), "en-US", options);
    const entries = Array.from({ length: 32 }, (_, offset) => format(offset));
    expect(format(0)).toBe(entries[0]);
    format(32);
    expect(format(0)).toBe(entries[0]);
    expect(format(1)).not.toBe(entries[1]);
  });
});
