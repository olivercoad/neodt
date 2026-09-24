import dayjs, { type Dayjs } from "dayjs";
import type { ConfigType, ManipulateType, UnitType } from "dayjs";

import { systemZone, type AdapterOptions, type DateAdapter, type DateFields } from "../adapter";
import { createIntlFormatter } from "../adapters/intl-format";
import {
  configureNeodt,
  type ConfiguredNeodtProps,
  type ConfiguredNaturalDateParseOptions,
} from "../configured";
import { fixedOffset, offsetZone } from "../format";
import { defineIntegration } from "../integration";

export type NeodtProps = ConfiguredNeodtProps<Dayjs>;
export type NaturalDateParseOptions = ConfiguredNaturalDateParseOptions<Dayjs>;

export const { Neodt, parseNaturalDate } = configureNeodt(createDayjsAdapter(dayjs));
export default Neodt;
export * from "../public";

type DayjsFactory = ((input?: ConfigType) => Dayjs) & {
  utc?: (input?: ConfigType) => Dayjs;
  tz?: (input: ConfigType, zone: string) => Dayjs;
};

/** The caller registers Day.js utc/timezone plugins for nonlocal zones. */
export function createDayjsAdapter(
  dayjs: DayjsFactory,
  options: AdapterOptions = {},
): DateAdapter<Dayjs> {
  const defaultZone = options.zone ?? systemZone();
  const zones = new WeakMap<Dayjs, string>();
  const zoneOf = (value: Dayjs) => zones.get(value) ?? defaultZone;
  const remember = (value: Dayjs, zone: string) => {
    if (!value.isValid()) throw new RangeError("Invalid datetime");
    zones.set(value, zone);
    return value;
  };
  const inZone = (value: Dayjs, zone: string) => {
    const offset = fixedOffset(zone);
    if (offset !== undefined) {
      if (!dayjs.utc) throw new Error("Day.js fixed offsets require the utc plugin");
      // Reapplying utcOffset to an already offset Day.js value can shift its wall fields.
      return remember(value.utc().utcOffset(offsetZone(offset)), zone);
    }
    if (dayjs.tz) return remember(value.tz(zone), zone);
    if (zone === systemZone()) return remember(dayjs(value.valueOf()), zone);
    throw new Error("Day.js named zones require the utc and timezone plugins");
  };
  const native = (value: Dayjs) => inZone(value, zoneOf(value));
  const fields = (value: Dayjs) => {
    const date = native(value);
    return {
      year: date.year(),
      month: date.month() + 1,
      day: date.date(),
      hour: date.hour(),
      minute: date.minute(),
      second: date.second(),
    };
  };
  const fromFields = (fields: DateFields, zone: string) => {
    const text = `${String(fields.year).padStart(4, "0")}-${String(fields.month).padStart(2, "0")}-${String(fields.day).padStart(2, "0")}T${String(fields.hour).padStart(2, "0")}:${String(fields.minute).padStart(2, "0")}:${String(fields.second ?? 0).padStart(2, "0")}`;
    const offset = fixedOffset(zone);
    if (offset !== undefined) {
      if (!dayjs.utc) throw new Error("Day.js fixed offsets require the utc plugin");
      return remember(dayjs(`${text}${offsetZone(offset)}`).utcOffset(offsetZone(offset)), zone);
    }
    if (dayjs.tz) return remember(dayjs.tz(text, zone), zone);
    if (zone === systemZone()) return remember(dayjs(text), zone);
    throw new Error("Day.js named zones require the utc and timezone plugins");
  };
  return {
    toEpochMilliseconds: (value) => value.valueOf(),
    fromEpochMilliseconds: (ms, zone) => inZone(dayjs(ms), zone),
    getZone: zoneOf,
    getFields: fields,
    fromFields,
    setFields: (value, changes) => {
      let date = native(value);
      for (const key of ["year", "month", "day", "hour", "minute", "second"] as const) {
        if (changes[key] !== undefined)
          date = date.set(
            (key === "day" ? "date" : key) as UnitType,
            changes[key]! - (key === "month" ? 1 : 0),
          );
      }
      return fromFields(
        {
          year: date.year(),
          month: date.month() + 1,
          day: date.date(),
          hour: date.hour(),
          minute: date.minute(),
          second: date.second(),
        },
        zoneOf(value),
      );
    },
    add: (value, duration) => {
      let date = native(value);
      for (const [unit, amount] of Object.entries(duration)) {
        date = date.add(amount, unit as ManipulateType);
        if (["years", "months", "weeks", "days"].includes(unit)) {
          date = fromFields(
            {
              year: date.year(),
              month: date.month() + 1,
              day: date.date(),
              hour: date.hour(),
              minute: date.minute(),
              second: date.second(),
            },
            zoneOf(value),
          );
        }
      }
      return inZone(date, zoneOf(value));
    },
    startOf: (value, unit) => {
      const date = native(value);
      // The timezone plugin's startOf reparses through the host timezone, even for
      // minutes. Field setters preserve the selected instant/offset for this operation.
      if (unit === "minute") return remember(date.second(0).millisecond(0), zoneOf(value));
      return fromFields(
        {
          year: date.year(),
          month: date.month() + 1,
          day: unit === "month" ? 1 : date.date(),
          hour: 0,
          minute: 0,
          second: 0,
        },
        zoneOf(value),
      );
    },
    getWeekday: (value) => native(value).day() || 7,
    getDaysInMonth: (value) => native(value).daysInMonth(),
    getOffset: (value) => native(value).utcOffset(),
    setZoneId: inZone,
    createFormatter: (zone, locale, options) =>
      createIntlFormatter(zone, locale, options, (value: Dayjs) => value.valueOf()),
  };
}

/** @internal Demo/test setup; omitted from the published entry. */
export const integration = /* @__PURE__ */ defineIntegration({
  create: () => createDayjsAdapter(dayjs),
  zone: (id: string) => id,
  entry: { default: Neodt, Neodt, parseNaturalDate },
  async setup() {
    const [{ default: utc }, { default: timezone }] = await Promise.all([
      import("dayjs/plugin/utc.js"),
      import("dayjs/plugin/timezone.js"),
    ]);
    dayjs.extend(utc);
    dayjs.extend(timezone);
  },
  behavior: {
    earlyYears: false,
    editFoldOffset: "-04:00",
    halfHourGap: "2026-10-04T03:45+11:00",
    earlyYearValues: {
      "America/New_York": [
        "1901-03-01T12:30",
        "1902-03-01T12:30",
        "1920-03-01T12:30",
        "1999-03-07T12:30",
      ],
      "Europe/Paris": [
        "1901-03-07T03:18",
        "1902-03-07T03:18",
        "1920-03-01T12:30",
        "1999-03-07T12:30",
      ],
    },
  },
});
