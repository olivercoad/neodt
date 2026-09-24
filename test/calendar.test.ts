import { describe, expect, it } from "vitest";

import { calendarDate } from "../src/calendar";
import { builtInAdapters } from "./helpers/adapters";

for (const implementation of builtInAdapters)
  implementation.run(({ adapter, zone, behavior }) => {
    describe(implementation.name, () => {
      // Some native setters choose the earlier side of a fold even when the input is later.
      const editedOffset = (offset: string) => behavior.editFoldOffset ?? offset;
      const minuteOffset = (offset: string) => behavior.minuteFoldOffset ?? offset;
      const reference = calendarDate(adapter, adapter.fromEpochMilliseconds(0, zone("UTC")));
      const date = (value: string, zone = "UTC") => reference.setZoneId(zone).fromISO(value)!;
      it("edits early years using the library's historical timezone rules", () => {
        for (const zone of ["UTC", "America/New_York", "Europe/Paris"]) {
          const initial = date("2026-03-07T12:30", zone);
          for (const year of [1, 2, 20, 99]) {
            const edited = initial.set({ year }).startOf("minute");
            // Day.js reparses early named-zone years through native Date; date-fns/tz
            // loses sub-minute historical Paris offsets. These are library-owned semantics.
            const expected =
              behavior.earlyYearValues?.[zone]?.[[1, 2, 20, 99].indexOf(year)] ??
              `${String(year).padStart(4, "0")}-03-07T12:${zone === "Europe/Paris" ? (behavior.earlyParisMinute ?? "30") : "30"}`;
            expect(edited.toLocalValue()).toBe(expected);
            expect(edited.set({ year: 2026 }).toLocalValue()).toBe(`2026${expected.slice(4)}`);
          }
        }
      });

      it("handles Gregorian century leap-year rules and clamps month changes", () => {
        expect(reference.fromISO("1900-02-29")).toBeUndefined();
        expect(reference.fromISO("2000-02-29")).toBeDefined();
        expect(date("2026-01-31T12:30").set({ month: 2 }).toLocalValue()).toBe("2026-02-28T12:30");
        expect(date("2024-02-29T12:30").set({ year: 2025 }).toLocalValue()).toBe(
          behavior.leapYearEdit ?? "2025-02-28T12:30",
        );
        expect(date("2026-01-31T12:30").plus({ months: -1 }).toLocalValue()).toBe(
          "2025-12-31T12:30",
        );
      });

      it("uses native fold disambiguation while editing a repeated hour", () => {
        const later = date("2026-11-01T01:30-05:00", "America/New_York");
        expect(later.startOf("minute").toISO()).toBe(
          `2026-11-01T01:30${behavior.exactMinuteFoldOffset ?? "-05:00"}`,
        );
        expect(later.set({ minute: 45 }).toISO()).toBe(`2026-11-01T01:45${editedOffset("-05:00")}`);
        const earlier = date("2026-11-01T01:30-04:00", "America/New_York");
        expect(earlier.plus({ hours: 1 }).toISO()).toBe("2026-11-01T01:30-05:00");
      });

      it("resolves a half-hour DST gap and a skipped calendar day", () => {
        expect(date("2026-10-04T02:15", "Australia/Lord_Howe").toISO()).toBe(
          behavior.halfHourGap ?? "2026-10-04T02:45+11:00",
        );
        expect(date("2011-12-30T12:00", "Pacific/Apia").toLocalValue()).toBe(
          behavior.skippedDay ?? "2011-12-31T12:00",
        );
      });

      it("distinguishes calendar days from elapsed hours across both DST transitions", () => {
        const spring = date("2026-03-07T12:00", "America/New_York");
        expect(spring.plus({ days: 1 }).toISO()).toBe("2026-03-08T12:00-04:00");
        expect(spring.plus({ hours: 24 }).toISO()).toBe("2026-03-08T13:00-04:00");
        const autumn = date("2026-10-31T12:00", "America/New_York");
        expect(autumn.plus({ days: 1 }).toISO()).toBe("2026-11-01T12:00-05:00");
        expect(autumn.plus({ hours: 24 }).toISO()).toBe("2026-11-01T11:00-05:00");
      });

      it("applies native field edits and minute boundaries to both sides of a fold", () => {
        for (const offset of ["-04:00", "-05:00"]) {
          const value = date(`2026-11-01T01:30:45${offset}`, "America/New_York");
          expect(value.startOf("minute").toISO()).toBe(`2026-11-01T01:30${minuteOffset(offset)}`);
          expect(value.set({ minute: 45 }).toISO()).toBe(`2026-11-01T01:45${editedOffset(offset)}`);
        }
      });

      it("formats fixed offsets including quarter-hour zones", () => {
        const value = date("2026-01-01T00:00+05:45", "+05:45");
        expect(value.toISO()).toBe("2026-01-01T00:00+05:45");
        expect(value.setZoneId("UTC").toLocalValue()).toBe("2025-12-31T18:15");
        const formatted = value
          .toLocaleParts("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })
          .map((part) => part.value)
          .join("");
        expect(formatted).toBe("00:00");
      });

      it("formats the selected timezone's label instead of UTC", () => {
        const value = date("2026-07-01T09:00", "America/New_York");
        const label = value
          .toLocaleParts("en-US", { hour: "numeric", timeZoneName: "short" })
          .find((part) => part.type === "timeZoneName")?.value;
        expect(label).toBe("EDT");
        const fixed = date("2026-07-01T09:00", "+05:45");
        expect(
          fixed
            .toLocaleParts("en-US", { timeZoneName: "short" })
            .find((part) => part.type === "timeZoneName")?.value,
        ).toBe(behavior.offsetLabel ?? "GMT+5:45");
      });

      it("rejects invalid ISO dates and offsets rather than rolling over", () => {
        for (const value of [
          "2026-02-30",
          "2026-13-01",
          "2026-01-00",
          "2026-01-01T25:00",
          "2026-01-01T00:60",
          "2026-01-01T00:00:60",
          "2026-01-01T00:00+24:00",
          "2026-01-01T00:00+12:60",
        ]) {
          expect(reference.fromISO(value)).toBeUndefined();
        }
      });
    });
  });
