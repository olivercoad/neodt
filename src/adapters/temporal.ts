import type { DateAdapter, DateDuration, DateFields } from "../adapter";
import { fixedOffset } from "../format";
import { formatWithIntl } from "./intl-format";

/** Structural types keep this entry independent of any Temporal package or global. */
export interface TemporalZonedValue {
  readonly epochMilliseconds: number;
  readonly timeZoneId: string;
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  readonly dayOfWeek: number;
  readonly daysInMonth: number;
  readonly offsetNanoseconds: number;
  with(
    fields: Partial<DateFields> & {
      millisecond?: number;
      microsecond?: number;
      nanosecond?: number;
    },
  ): TemporalZonedValue;
  add(duration: DateDuration): TemporalZonedValue;
  startOfDay(): TemporalZonedValue;
  withTimeZone(zone: string): TemporalZonedValue;
}
export interface TemporalImplementation<T extends TemporalZonedValue> {
  readonly Instant: {
    fromEpochMilliseconds(milliseconds: number): { toZonedDateTimeISO(zone: string): T };
  };
  readonly ZonedDateTime: {
    from(fields: DateFields & { timeZone: string }, options?: { overflow: "reject" }): T;
  };
}

export function createTemporalAdapter<T extends TemporalZonedValue>(
  Temporal: TemporalImplementation<T>,
): DateAdapter<T> {
  const fromEpoch = (ms: number, zone: string) =>
    Temporal.Instant.fromEpochMilliseconds(ms).toZonedDateTimeISO(zone);
  const own = (value: TemporalZonedValue) => fromEpoch(value.epochMilliseconds, value.timeZoneId);
  const fields = (value: T) => {
    const date = own(value); // Editing is ISO/Gregorian even for input values in another calendar.
    return {
      year: date.year,
      month: date.month,
      day: date.day,
      hour: date.hour,
      minute: date.minute,
      second: date.second,
    };
  };
  return {
    toEpochMilliseconds: (value) => value.epochMilliseconds,
    fromEpochMilliseconds: fromEpoch,
    getZone: (value) => value.timeZoneId,
    getFields: fields,
    fromFields: (fields, zone) =>
      Temporal.ZonedDateTime.from({ ...fields, timeZone: zone }, { overflow: "reject" }),
    setFields: (value, fields) => own(own(value).with(fields)),
    add: (value, duration) => own(own(value).add(duration)),
    startOf: (value, unit) => {
      const date = own(value);
      return own(
        unit === "minute"
          ? date.with({ second: 0, millisecond: 0, microsecond: 0, nanosecond: 0 })
          : (unit === "month" ? date.with({ day: 1 }) : date).startOfDay(),
      );
    },
    getWeekday: (value) => own(value).dayOfWeek,
    getDaysInMonth: (value) => own(value).daysInMonth,
    getOffset: (value) => value.offsetNanoseconds / 60_000_000_000,
    isOffsetFixed: (value) => fixedOffset(value.timeZoneId) !== undefined,
    setZoneId: (value, zone) => own(value.withTimeZone(zone)),
    formatToParts: (value, locale, options) =>
      formatWithIntl(
        Temporal.ZonedDateTime.from({ ...fields(value), timeZone: "UTC" }).epochMilliseconds,
        value.offsetNanoseconds / 60_000_000_000,
        locale,
        options,
        value.timeZoneId,
        value.epochMilliseconds,
      ),
  };
}
