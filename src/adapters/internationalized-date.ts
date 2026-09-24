import {
  CalendarDateTime,
  getDayOfWeek,
  toZoned,
  type ZonedDateTime,
} from "@internationalized/date";

import type { DateAdapter } from "../adapter";
import { createIntlFormatter } from "./intl-format";

export function createInternationalizedDateAdapter(
  fromAbsolute: typeof import("@internationalized/date").fromAbsolute,
): DateAdapter<ZonedDateTime> {
  const iso = (value: ZonedDateTime) => fromAbsolute(value.toDate().getTime(), value.timeZone);
  const fields = (value: ZonedDateTime) => {
    const date = iso(value);
    return {
      year: date.year,
      month: date.month,
      day: date.day,
      hour: date.hour,
      minute: date.minute,
      second: date.second,
    };
  };
  return {
    toEpochMilliseconds: (value) => value.toDate().getTime(),
    fromEpochMilliseconds: (ms, zone) => fromAbsolute(ms, zone),
    getZone: (value) => value.timeZone,
    getFields: fields,
    fromFields: (fields, zone) =>
      toZoned(
        new CalendarDateTime(
          fields.year,
          fields.month,
          fields.day,
          fields.hour,
          fields.minute,
          fields.second ?? 0,
        ),
        zone,
      ),
    setFields: (value, fields) => iso(value).set(fields),
    add: (value, duration) => iso(value).add(duration),
    startOf: (value, unit) =>
      iso(value).set(
        unit === "minute"
          ? { second: 0, millisecond: 0 }
          : {
              ...(unit === "month" ? { day: 1 } : {}),
              hour: 0,
              minute: 0,
              second: 0,
              millisecond: 0,
            },
      ),
    getWeekday: (value) => getDayOfWeek(iso(value), "en-GB", "mon") + 1,
    getDaysInMonth: (value) => {
      const date = iso(value);
      return date.calendar.getDaysInMonth(date);
    },
    getOffset: (value) => value.offset / 60_000,
    setZoneId: (value, zone) => fromAbsolute(value.toDate().getTime(), zone),
    createFormatter: (zone, locale, options) =>
      createIntlFormatter(zone, locale, options, (value: ZonedDateTime) =>
        value.toDate().getTime(),
      ),
  };
}
