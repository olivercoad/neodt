import type { DateTime, Zone } from "luxon";

import type { DateAdapter } from "../adapter";

export type LuxonZone = string | Zone;

/** Pass the DateTime constructor from the application's Luxon installation. */
export function createLuxonAdapter(
  DateTime: Pick<typeof import("luxon").DateTime, "fromMillis">,
): DateAdapter<DateTime, LuxonZone> {
  return {
    toEpochMilliseconds: (value) => value.toMillis(),
    fromEpochMilliseconds: (milliseconds, zone) => DateTime.fromMillis(milliseconds, { zone }),
    getZone: (value) => value.zone,
    getZoneId: (zone) => (typeof zone === "string" ? zone : zone.name),
  };
}
