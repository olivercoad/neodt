import type { Moment } from "moment";

import { systemZone, type AdapterOptions, type DateAdapter } from "../adapter";
import { fixedOffset, offsetAt, offsetZone } from "../calendar";

/** Works with Moment alone. Pass moment-timezone to retain named zones on output. */
export function createMomentAdapter(
  moment: (milliseconds: number) => Moment,
  options: AdapterOptions = {},
): DateAdapter<Moment> {
  const zones = new WeakMap<Moment, string>();
  return {
    getZoneId: (zone) => zone,
    toEpochMilliseconds: (value) => value.valueOf(),
    fromEpochMilliseconds: (milliseconds, zone) => {
      let value = moment(milliseconds);
      if ("tz" in value && typeof value.tz === "function" && fixedOffset(zone) === undefined) {
        value = (value as Moment & { tz(zone: string): Moment }).tz(zone);
      } else {
        value = value.utcOffset(offsetZone(offsetAt(milliseconds, zone)));
      }
      zones.set(value, zone);
      return value;
    },
    getZone: (value) => {
      if (options.zone) return options.zone;
      const remembered = zones.get(value);
      if (remembered) return remembered;
      if ("tz" in value && typeof value.tz === "function") {
        const zone = (value as Moment & { tz(): string | undefined }).tz();
        if (zone) return zone;
      }
      return value.isLocal() ? systemZone() : offsetZone(value.utcOffset());
    },
  };
}
