import { DateTime } from "luxon";
import type { Zone } from "luxon";

import type { DateAdapter } from "../adapter";
import {
  configureNeodt,
  type ConfiguredNeodtProps,
  type ConfiguredNaturalDateParseOptions,
} from "../configured";
import { fixedOffset } from "../format";
import { defineIntegration } from "../integration";

export type NeodtProps = ConfiguredNeodtProps<DateTime, LuxonZone>;
export type NaturalDateParseOptions = ConfiguredNaturalDateParseOptions<DateTime, LuxonZone>;

export const { Neodt, parseNaturalDate } = configureNeodt(createLuxonAdapter(DateTime));
export default Neodt;
export * from "../public";

export type LuxonZone = string | Zone;

export function createLuxonAdapter(
  DateTime: Pick<typeof import("luxon").DateTime, "fromMillis" | "fromObject">,
): DateAdapter<DateTime, LuxonZone> {
  const valid = (value: DateTime) => {
    if (!value.isValid) throw new RangeError(value.invalidExplanation ?? "Invalid datetime");
    return value;
  };
  const normalizeZone = (zone: LuxonZone) =>
    typeof zone === "string" && fixedOffset(zone) !== undefined && !/^(UTC|GMT)/i.test(zone)
      ? `UTC${zone === "Z" ? "" : zone}`
      : zone;
  const fields = (value: DateTime) => ({
    year: value.year,
    month: value.month,
    day: value.day,
    hour: value.hour,
    minute: value.minute,
    second: value.second,
  });
  return {
    toEpochMilliseconds: (value) => value.toMillis(),
    fromEpochMilliseconds: (ms, zone) =>
      valid(DateTime.fromMillis(ms, { zone: normalizeZone(zone) })),
    getZone: (value) => value.zone,
    getFields: fields,
    fromFields: (fields, zone) => valid(DateTime.fromObject(fields, { zone: normalizeZone(zone) })),
    setFields: (value, fields) => valid(value.set(fields)),
    add: (value, duration) => valid(value.plus(duration)),
    startOf: (value, unit) => valid(value.startOf(unit)),
    getWeekday: (value) => value.weekday,
    getDaysInMonth: (value) => value.daysInMonth!,
    getOffset: (value) => value.offset,
    isOffsetFixed: (value) => value.isOffsetFixed ?? false,
    setZoneId: (value, zone) => valid(value.setZone(normalizeZone(zone))),
    createFormatter: (_zone, locale, options) => {
      const localeName = (Array.isArray(locale) ? locale[0] : locale)?.toString();
      return {
        formatToParts: (value) => {
          const localized = localeName ? value.setLocale(localeName) : value;
          return localized.reconfigure({ outputCalendar: "gregory" }).toLocaleParts(options);
        },
      };
    },
  };
}

/** @internal Demo/test setup; omitted from the published entry. */
export const integration = /* @__PURE__ */ defineIntegration({
  create: () => createLuxonAdapter(DateTime),
  zone: (id: string) => DateTime.now().setZone(/^[+-]/.test(id) ? `UTC${id}` : id).zone,
  entry: { default: Neodt, Neodt, parseNaturalDate },
  behavior: {
    offsetLabel: "UTC+5:45",
  },
});
