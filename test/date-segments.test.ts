import { DateTime } from "luxon";
import { expect, it } from "vitest";

import { calendarDate } from "../src/calendar";
import { partsFor } from "../src/date-segments";
import { createLuxonAdapter } from "../src/libraries/luxon";

it.each([" ", "\u00a0", "\u202f"])("renders the same separators for ICU space %j", (space) => {
  const adapter = {
    ...createLuxonAdapter(DateTime),
    createFormatter: () => ({
      formatToParts: (): Intl.DateTimeFormatPart[] => [
        { type: "hour", value: "9" },
        { type: "literal", value: ":" },
        { type: "minute", value: "30" },
        { type: "literal", value: space },
        { type: "dayPeriod", value: "am" },
        { type: "literal", value: `,${space}\u200f` },
        { type: "timeZoneName", value: "Test\u00a0Zone" },
      ],
    }),
  };
  const reference = calendarDate(adapter, DateTime.fromISO("2026-09-24T09:30:00Z"));
  const parts = partsFor("2026-09-24T09:30", reference, "en-AU", { hour12: true });
  expect(parts.map((part) => part.value).join("")).toBe("9:30 am, \u200fTest\u00a0Zone");
  expect(parts.filter((part) => part.editable).map((part) => part.type)).toEqual([
    "hour",
    "minute",
    "dayPeriod",
  ]);
});
