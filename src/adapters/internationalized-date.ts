import type { ZonedDateTime } from "@internationalized/date";

import type { DateAdapter } from "../adapter";

/** Pass fromAbsolute from the application's @internationalized/date installation.
 * Input calendars preserve their instant; output uses the Gregorian calendar.
 */
export function createInternationalizedDateAdapter(
  fromAbsolute: typeof import("@internationalized/date").fromAbsolute,
): DateAdapter<ZonedDateTime> {
  return {
    toEpochMilliseconds: (value) => value.toDate().getTime(),
    fromEpochMilliseconds: (milliseconds, zone) => fromAbsolute(milliseconds, zone),
    getZone: (value) => value.timeZone,
    getZoneId: (zone) => zone,
  };
}
