/** ISO/Gregorian fields used by the editor. Months are 1–12. */
export interface DateFields {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second?: number;
}
export type DurationUnit = "year" | "month" | "week" | "day" | "hour" | "minute";
export type DateDuration = Partial<Record<`${DurationUnit}s`, number>>;
export type DateBoundary = "minute" | "day" | "month";

/** Library-owned calendar operations. All methods must leave their inputs unchanged.
 * Calendar arithmetic, overflow and DST disambiguation follow the selected library.
 * TZone is the library's native zone representation; it need not be a string.
 */
export interface DateAdapter<T, TZone = string> {
  readonly toEpochMilliseconds: (value: T) => number;
  readonly fromEpochMilliseconds: (milliseconds: number, zone: TZone) => T;
  readonly getZone: (value: T) => TZone;
  readonly getFields: (value: T) => DateFields;
  readonly fromFields: (fields: DateFields, zone: TZone) => T;
  readonly setFields: (value: T, fields: Partial<DateFields>) => T;
  readonly add: (value: T, duration: DateDuration) => T;
  readonly startOf: (value: T, unit: DateBoundary) => T;
  /** Monday = 1, Sunday = 7. */
  readonly getWeekday: (value: T) => number;
  readonly getDaysInMonth: (value: T) => number;
  /** Minutes east of UTC, at this value's instant. Used by showTimeOffset. */
  readonly getOffset: (value: T) => number;
  /** Optional layout hint: the offset cannot change at another date. */
  readonly isOffsetFixed?: (value: T) => boolean;
  /** Interpret an explicit timezone in user-entered text, preserving the instant. */
  readonly setZoneId: (value: T, zoneId: string) => T;
  /** Create reusable locale formatting for values in this zone.
   * The core caches at most 32 formatters per adapter, by zone, locale and options.
   * A formatter must support different instants (including DST changes) in its zone.
   */
  readonly createFormatter: (
    zone: TZone,
    locale: Intl.LocalesArgument | undefined,
    options: Intl.DateTimeFormatOptions,
  ) => { formatToParts(value: T): Intl.DateTimeFormatPart[] };
}

export interface AdapterOptions {
  zone?: string;
}
export function systemZone(): string {
  return new Intl.DateTimeFormat().resolvedOptions().timeZone;
}
