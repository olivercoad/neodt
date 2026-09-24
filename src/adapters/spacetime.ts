import type { Spacetime, SpacetimeConstructor, TimeUnit } from "spacetime";

import type { DateAdapter, DateFields } from "../adapter";
import { fixedOffset } from "../format";
import { createLibraryZoneFormatter } from "./intl-format";

export function createSpacetimeAdapter(spacetime: SpacetimeConstructor): DateAdapter<Spacetime> {
  const zones = new WeakMap<Spacetime, string>();
  const zoneOf = (value: Spacetime) => zones.get(value) ?? value.timezone().name;
  const remember = (value: Spacetime, zone: string) => {
    if (!value.isValid()) throw new RangeError("Invalid datetime");
    zones.set(value, zone);
    return value;
  };
  const libraryZone = (zone: string) => {
    const offset = fixedOffset(zone);
    if (offset === undefined) return zone;
    if (offset === 0) return "UTC";
    const database = spacetime(0, "UTC").timezones;
    const target = Object.keys(database).find(
      (name) => !database[name]!.dst && database[name]!.offset * 60 === offset,
    );
    if (!target) throw new RangeError(`Spacetime does not support fixed offset ${zone}`);
    return target;
  };
  const fields = (value: Spacetime) => ({
    year: value.year(),
    month: value.month() + 1,
    day: value.date(),
    hour: value.hour(),
    minute: value.minute(),
    second: value.second(),
  });
  const fromFields = (fields: DateFields, zone: string) =>
    remember(
      spacetime(
        [
          fields.year,
          fields.month - 1,
          fields.day,
          fields.hour,
          fields.minute,
          fields.second ?? 0,
          0,
        ],
        libraryZone(zone),
      ),
      zone,
    );
  return {
    toEpochMilliseconds: (value) => value.epoch,
    fromEpochMilliseconds: (ms, zone) => remember(spacetime(ms, libraryZone(zone)), zone),
    getZone: zoneOf,
    getFields: fields,
    fromFields,
    setFields: (value, changes) => {
      let date = value.clone();
      for (const key of ["year", "month", "day", "hour", "minute", "second"] as const) {
        const amount = changes[key];
        if (amount === undefined) continue;
        if (key === "year") date = date.year(amount);
        if (key === "month") date = date.month(amount - 1);
        if (key === "day") date = date.date(amount);
        if (key === "hour") date = date.hour(amount);
        if (key === "minute") date = date.minute(amount);
        if (key === "second") date = date.second(amount);
      }
      return remember(date, zoneOf(value));
    },
    add: (value, duration) => {
      let date = value.clone();
      for (const [unit, amount] of Object.entries(duration))
        date = date.add(amount, unit as TimeUnit);
      return remember(date, zoneOf(value));
    },
    startOf: (value, unit) => remember(value.startOf(unit), zoneOf(value)),
    getWeekday: (value) => value.day() || 7,
    getDaysInMonth: (value) => value.daysInMonth(),
    getOffset: (value) => value.timezone().current.offset * 60,
    setZoneId: (value, zone) => remember(value.goto(libraryZone(zone)), zone),
    createFormatter: (zone, locale, options) =>
      createLibraryZoneFormatter(
        zone,
        locale,
        options,
        (value: Spacetime) => value.epoch,
        (value) => value.timezone().current.offset * 60,
      ),
  };
}
