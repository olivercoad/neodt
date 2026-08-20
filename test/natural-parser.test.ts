import { DateTime, Info } from "luxon";
import { describe, expect, it } from "vitest";

import { parseNaturalDate } from "../src/natural-parser";
import { naturalTextExamples } from "../src/natural-placeholder";

const referenceTime = DateTime.fromISO("2026-04-15T12:00:00Z");

function parse(input: string, zone = Info.normalizeZone("UTC"), locale?: Intl.LocalesArgument) {
  return parseNaturalDate(input, { referenceTime, zone, locale })?.toFormat("yyyy-MM-dd'T'HH:mmZZ");
}

describe("parseNaturalDate", () => {
  it("parses common numeric, textual, ordinal, and ISO date forms", () => {
    const cases: Array<[string, string]> = [
      ["3/1/86", "1986-03-01T00:00+00:00"],
      ["8/4", "2026-08-04T00:00+00:00"],
      ["08-04-2027", "2027-08-04T00:00+00:00"],
      ["March 1st 2027", "2027-03-01T00:00+00:00"],
      ["Jan 3", "2026-01-03T00:00+00:00"],
      ["5 July", "2026-07-05T00:00+00:00"],
      ["5th July 2027", "2027-07-05T00:00+00:00"],
      ["March", "2026-03-01T00:00+00:00"],
      ["2015", "2015-01-01T00:00+00:00"],
      ["Nov 2022", "2022-11-01T00:00+00:00"],
      ["the 20th", "2026-04-20T00:00+00:00"],
      ["2027-03-01T09:15+11:00", "2027-02-28T22:15+00:00"],
    ];
    for (const [input, expected] of cases) expect(parse(input)).toBe(expected);
  });

  it("uses the locale date order for ambiguous short numeric dates", () => {
    expect(parse("8/4", Info.normalizeZone("UTC"), "en-US")).toBe("2026-08-04T00:00+00:00");
    expect(parse("8/4", Info.normalizeZone("UTC"), "en-GB")).toBe("2026-04-08T00:00+00:00");
    expect(parse("31.12.2027", Info.normalizeZone("UTC"), "de-DE")).toBe("2027-12-31T00:00+00:00");
  });

  it("parses relative days, weekdays, durations, arithmetic, and date times", () => {
    const cases: Array<[string, string]> = [
      ["now", "2026-04-15T12:00+00:00"],
      ["tomorrow at 9:30am", "2026-04-16T09:30+00:00"],
      ["day after tomorrow noon", "2026-04-17T12:00+00:00"],
      ["next monday", "2026-04-20T00:00+00:00"],
      ["last wednesday", "2026-04-08T00:00+00:00"],
      ["fri 8am", "2026-04-17T08:00+00:00"],
      ["next monday 3pm", "2026-04-20T15:00+00:00"],
      ["jan 3 14:45", "2026-01-03T14:45+00:00"],
      ["5 july at midnight", "2026-07-05T00:00+00:00"],
      ["in 2 hours", "2026-04-15T14:00+00:00"],
      ["3 days ago", "2026-04-12T12:00+00:00"],
      ["a week from tomorrow", "2026-04-23T00:00+00:00"],
      ["today + 9 days", "2026-04-24T00:00+00:00"],
    ];
    for (const [input, expected] of cases) expect(parse(input)).toBe(expected);
  });

  it("resolves last weekdays to the previous occurrence", () => {
    const tuesday = DateTime.fromISO("2026-08-18T12:00:00Z");
    const parsed = parseNaturalDate("last wednesday", {
      referenceTime: tuesday,
      zone: Info.normalizeZone("UTC"),
    });
    expect(parsed?.toFormat("yyyy-MM-dd'T'HH:mmZZ")).toBe("2026-08-12T00:00+00:00");
  });

  it("parses every rotating placeholder example", () => {
    for (const input of naturalTextExamples) {
      expect(
        parseNaturalDate(input, { referenceTime, zone: Info.normalizeZone("UTC") }),
      ).toBeDefined();
    }
  });

  it("supports clock-only input and rolls past times to tomorrow", () => {
    expect(parse("5pm")).toBe("2026-04-15T17:00+00:00");
    expect(parse("9:45")).toBe("2026-04-16T09:45+00:00");
    expect(parse("midnight")).toBe("2026-04-16T00:00+00:00");
  });

  it("does not resolve named holidays", () => {
    for (const input of [
      "thanksgiving",
      "thanksgiving day",
      "labor day",
      "memorial day",
      "mothers day",
      "fathers day",
      "christmas",
      "xmas",
      "new years day",
      "halloween",
      "valentines day",
      "independence day",
    ]) {
      expect(
        parseNaturalDate(input, { referenceTime, zone: Info.normalizeZone("UTC") }),
      ).toBeUndefined();
    }
  });

  it("uses IANA zones and preserves timezone-aware clock values", () => {
    const newYork = Info.normalizeZone("America/New_York");
    expect(parse("tomorrow 9:30am", newYork)).toBe("2026-04-16T09:30-04:00");
    expect(parse("tomorrow 9:30am America/New_York")).toBe("2026-04-16T13:30+00:00");
    expect(parse("march 8 2026 3:30am", newYork)).toBe("2026-03-08T03:30-04:00");
  });

  it("rejects invalid values and all range expressions", () => {
    for (const input of [
      "banana spaceship",
      "99/99/9999",
      "32/12",
      "march 32 2026",
      "tomorrow to friday",
      "march 14 - march 28",
    ]) {
      expect(
        parseNaturalDate(input, { referenceTime, zone: Info.normalizeZone("UTC") }),
      ).toBeUndefined();
    }
  });
});
