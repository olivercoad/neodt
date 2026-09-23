import type { DateAdapter } from "../adapter";

/** Structural types keep this entry independent of any Temporal package or global. */
export interface TemporalZonedValue {
  readonly epochMilliseconds: number;
  readonly timeZoneId: string;
}
export interface TemporalImplementation<T extends TemporalZonedValue> {
  readonly Instant: {
    fromEpochMilliseconds(milliseconds: number): {
      toZonedDateTimeISO(zone: string): T;
    };
  };
}

/** Pass native Temporal, a polyfill namespace, or an isolated ponyfill namespace. */
export function createTemporalAdapter<T extends TemporalZonedValue>(
  Temporal: TemporalImplementation<T>,
): DateAdapter<T> {
  return {
    getZoneId: (zone) => zone,
    toEpochMilliseconds: (value) => value.epochMilliseconds,
    fromEpochMilliseconds: (milliseconds, zone) =>
      Temporal.Instant.fromEpochMilliseconds(milliseconds).toZonedDateTimeISO(zone),
    getZone: (value) => value.timeZoneId,
  };
}
