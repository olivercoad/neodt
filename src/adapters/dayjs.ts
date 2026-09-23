import type { Dayjs } from "dayjs";

import { systemZone, type AdapterOptions, type DateAdapter } from "../adapter";
import { fixedOffset, offsetAt, offsetZone } from "../calendar";

/** Supply a zone for IANA editing. The caller owns registration of utc/timezone plugins. */
export function createDayjsAdapter(
  dayjs: (milliseconds: number) => Dayjs,
  options: AdapterOptions = {},
): DateAdapter<Dayjs> {
  const zone = options.zone ?? systemZone();
  return {
    getZoneId: (zone) => zone,
    toEpochMilliseconds: (value) => value.valueOf(),
    fromEpochMilliseconds: (milliseconds, outputZone) => {
      const value = dayjs(milliseconds);
      if (outputZone === systemZone()) return value;
      if (fixedOffset(outputZone) === undefined) {
        if (!("tz" in value) || typeof value.tz !== "function")
          throw new Error("Day.js IANA zones require the utc and timezone plugins");
        const zoned = (value as Dayjs & { tz(zone: string): Dayjs }).tz(outputZone);
        // Some Day.js versions reinterpret years 1–99 through Date.parse in tz().
        // Preserve the instant while a user is entering an incomplete year.
        if (zoned.valueOf() === milliseconds) return zoned;
      }
      // Core Day.js has an offset getter, but only the utc plugin adds its setter.
      const withOffset = (value as Dayjs & { utcOffset(offset: string): Dayjs }).utcOffset(
        offsetZone(offsetAt(milliseconds, outputZone)),
      );
      if (typeof withOffset !== "object")
        throw new Error("Day.js fixed offsets require the utc plugin");
      return withOffset;
    },
    getZone: () => zone,
  };
}
