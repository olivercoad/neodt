import { TZDate } from "@date-fns/tz";
import {
  add,
  getDaysInMonth,
  getISODay,
  set,
  startOfDay,
  startOfMinute,
  startOfMonth,
} from "date-fns";
import { toDate } from "date-fns/toDate";

import { systemZone, type AdapterOptions, type DateAdapter, type DateFields } from "../adapter";
import { createIntlFormatter } from "../adapters/intl-format";
import {
  configureNeodt,
  type ConfiguredNeodtProps,
  type ConfiguredNaturalDateParseOptions,
} from "../configured";
import { defineIntegration } from "../integration";

export type NeodtProps = ConfiguredNeodtProps<Date>;
export type NaturalDateParseOptions = ConfiguredNaturalDateParseOptions<Date>;

export const { Neodt, parseNaturalDate } = configureNeodt(createDateFnsAdapter(toDate));
export default Neodt;
export * from "../public";

/** date-fns owns calendar operations; @date-fns/tz supplies named-zone Date operations. */
export function createDateFnsAdapter<T extends Date = Date>(
  toDate: (milliseconds: number) => NoInfer<T>,
  options: AdapterOptions = {},
): DateAdapter<T> {
  const defaultZone = options.zone ?? systemZone();
  const zones = new WeakMap<T, string>();
  const zoneOf = (value: T) => zones.get(value) ?? defaultZone;
  const zoned = (value: T) => new TZDate(value.getTime(), zoneOf(value));
  const output = (value: Date, zone: string) => {
    const result = toDate(value.getTime());
    zones.set(result, zone);
    return result;
  };
  const fields = (value: T) => {
    const date = zoned(value);
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes(),
      second: date.getSeconds(),
    };
  };
  const values = (fields: Partial<DateFields>) => ({
    year: fields.year,
    month: fields.month === undefined ? undefined : fields.month - 1,
    date: fields.day,
    hours: fields.hour,
    minutes: fields.minute,
    seconds: fields.second,
  });
  return {
    toEpochMilliseconds: (value) => value.getTime(),
    fromEpochMilliseconds: (ms, zone) => output(new TZDate(ms, zone), zone),
    getZone: zoneOf,
    getFields: fields,
    fromFields: (fields, zone) =>
      output(set(new TZDate(0, zone), { ...values(fields), milliseconds: 0 }), zone),
    setFields: (value, fields) => output(set(zoned(value), values(fields)), zoneOf(value)),
    add: (value, duration) => output(add(zoned(value), duration), zoneOf(value)),
    startOf: (value, unit) =>
      output(
        (unit === "minute" ? startOfMinute : unit === "day" ? startOfDay : startOfMonth)(
          zoned(value),
        ),
        zoneOf(value),
      ),
    getWeekday: (value) => getISODay(zoned(value)),
    getDaysInMonth: (value) => getDaysInMonth(zoned(value)),
    getOffset: (value) => -zoned(value).getTimezoneOffset(),
    setZoneId: (value, zone) => output(new TZDate(value.getTime(), zone), zone),
    createFormatter: (zone, locale, options) =>
      createIntlFormatter(zone, locale, options, (value: T) => value.getTime()),
  };
}

/** @internal Demo/test setup; omitted from the published entry. */
export const integration = /* @__PURE__ */ defineIntegration({
  create: () => createDateFnsAdapter(toDate),
  zone: (id: string) => id,
  entry: { default: Neodt, Neodt, parseNaturalDate },
  behavior: {
    editFoldOffset: "-04:00",
    minuteFoldOffset: "-04:00",
    exactMinuteFoldOffset: "-04:00",
    leapYearEdit: "2025-03-01T12:30",
    halfHourGap: "2026-10-04T03:15+11:00",
    earlyParisMinute: "28",
  },
});
