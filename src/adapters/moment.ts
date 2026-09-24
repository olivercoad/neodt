import type { Moment, MomentInput } from "moment";

import { systemZone, type AdapterOptions, type DateAdapter, type DateFields } from "../adapter";
import { fixedOffset, offsetZone } from "../format";
import { createLibraryZoneFormatter } from "./intl-format";

type MomentFactory = ((input?: MomentInput) => Moment) & {
  tz?: ((input: MomentInput, zone: string) => Moment) & { zone?(zone: string): unknown };
  utc(input?: MomentInput): Moment;
};
/** Supply moment-timezone for named-zone parsing and arithmetic outside the system zone. */
export function createMomentAdapter(
  moment: MomentFactory,
  options: AdapterOptions = {},
): DateAdapter<Moment> {
  const zones = new WeakMap<Moment, string>();
  const remember = (value: Moment, zone: string) => {
    if (!value.isValid()) throw new RangeError("Invalid datetime");
    zones.set(value, zone);
    return value;
  };
  const zoneOf = (value: Moment) =>
    zones.get(value) ??
    options.zone ??
    ("tz" in value && typeof value.tz === "function"
      ? (value.tz() as string | undefined)
      : undefined) ??
    (value.isLocal() ? systemZone() : offsetZone(value.utcOffset()));
  const inZone = (value: Moment, zone: string) => {
    const offset = fixedOffset(zone);
    if (offset !== undefined) return remember(value.clone().utcOffset(offsetZone(offset)), zone);
    if (moment.tz) {
      if (moment.tz.zone && !moment.tz.zone(zone))
        throw new RangeError(`Unknown Moment timezone: ${zone}`);
      return remember(moment.tz(value.valueOf(), zone), zone);
    }
    if (zone === systemZone()) return remember(value.clone().local(), zone);
    throw new Error("Moment named zones require moment-timezone");
  };
  const native = (value: Moment) => inZone(value, zoneOf(value));
  const fields = (value: Moment) => {
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
  const values = (fields: Partial<DateFields>) =>
    Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [
        key === "day" ? "date" : key,
        key === "month" ? value! - 1 : value,
      ]),
    );
  return {
    toEpochMilliseconds: (value) => value.valueOf(),
    fromEpochMilliseconds: (ms, zone) => inZone(moment(ms), zone),
    getZone: zoneOf,
    getFields: fields,
    fromFields: (fields, zone) => {
      const input = [
        fields.year,
        fields.month - 1,
        fields.day,
        fields.hour,
        fields.minute,
        fields.second ?? 0,
      ];
      const offset = fixedOffset(zone);
      if (offset !== undefined)
        return remember(moment.utc(input).utcOffset(offsetZone(offset), true), zone);
      if (moment.tz) {
        if (moment.tz.zone && !moment.tz.zone(zone))
          throw new RangeError(`Unknown Moment timezone: ${zone}`);
        return remember(moment.tz(input, zone), zone);
      }
      if (zone === systemZone()) return remember(moment(input), zone);
      throw new Error("Moment named zones require moment-timezone");
    },
    setFields: (value, fields) => remember(native(value).set(values(fields)), zoneOf(value)),
    add: (value, duration) => remember(native(value).add(duration), zoneOf(value)),
    startOf: (value, unit) => remember(native(value).startOf(unit), zoneOf(value)),
    getWeekday: (value) => native(value).isoWeekday(),
    getDaysInMonth: (value) => native(value).daysInMonth(),
    getOffset: (value) => native(value).utcOffset(),
    setZoneId: inZone,
    createFormatter: (zone, locale, options) =>
      createLibraryZoneFormatter(
        zone,
        locale,
        options,
        (value: Moment) => value.valueOf(),
        (value) => native(value).utcOffset(),
      ),
  };
}
