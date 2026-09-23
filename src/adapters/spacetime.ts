import type { Spacetime } from "spacetime";

import type { DateAdapter } from "../adapter";
import { fixedOffset, offsetZone } from "../calendar";

export function createSpacetimeAdapter(
  spacetime: (milliseconds: number, zone?: string) => Spacetime,
): DateAdapter<Spacetime> {
  const zones = new WeakMap<Spacetime, string>();
  return {
    getZoneId: (zone) => zone,
    toEpochMilliseconds: (value) => value.epoch,
    fromEpochMilliseconds: (milliseconds, zone) => {
      const offset = fixedOffset(zone);
      let value = spacetime(milliseconds, offset === undefined ? zone : "UTC");
      if (offset !== undefined && offset !== 0) {
        // Use the caller's zone database without changing its global entries.
        const target = Object.keys(value.timezones).find((name) => {
          const entry = value.timezones[name]!;
          return !entry.dst && entry.offset * 60 === offset;
        });
        if (!target) throw new RangeError(`Spacetime does not support fixed offset ${zone}`);
        value = value.goto(target);
      }
      zones.set(value, zone);
      return value;
    },
    getZone: (value) => {
      const remembered = zones.get(value);
      if (remembered) return remembered;
      const info = value.timezone();
      // Spacetime includes fractional Etc/GMT names that Intl does not recognize.
      return /^Etc\/GMT[+-]\d+\.\d+$/i.test(info.name)
        ? offsetZone(info.current.offset * 60)
        : info.name;
    },
  };
}
