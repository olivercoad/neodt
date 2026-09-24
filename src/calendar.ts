import type { DateAdapter, DateBoundary, DateDuration, DateFields, DurationUnit } from "./adapter";
import { fixedOffset, offsetZone } from "./format";
import { formatterFor } from "./formatter-cache";

export type { DurationUnit } from "./adapter";

type Operations = {
  fields: DateFields;
  milliseconds: number;
  offset: number;
  isOffsetFixed: boolean;
  weekday: number;
  daysInMonth: number;
  fromFields(fields: DateFields): CalendarDate;
  atMilliseconds(ms: number): CalendarDate;
  set(fields: Partial<DateFields>): CalendarDate;
  plus(duration: DateDuration): CalendarDate;
  startOf(unit: DateBoundary): CalendarDate;
  setZoneId(zone: string): CalendarDate;
  format(
    locale: Intl.LocalesArgument | undefined,
    options: Intl.DateTimeFormatOptions,
  ): Intl.DateTimeFormatPart[];
};

/** A view over adapter operations, with no calendar arithmetic or timezone resolution. */
export class CalendarDate {
  constructor(private readonly operations: Operations) {
    if (!Number.isFinite(operations.milliseconds)) throw new RangeError("Invalid datetime value");
  }
  get year() {
    return this.operations.fields.year;
  }
  get month() {
    return this.operations.fields.month;
  }
  get day() {
    return this.operations.fields.day;
  }
  get hour() {
    return this.operations.fields.hour;
  }
  get minute() {
    return this.operations.fields.minute;
  }
  get milliseconds() {
    return this.operations.milliseconds;
  }
  get isOffsetFixed() {
    return this.operations.isOffsetFixed;
  }
  get offset() {
    return this.operations.offset;
  }
  get weekday() {
    return this.operations.weekday;
  }
  get daysInMonth() {
    return this.operations.daysInMonth;
  }
  valueOf() {
    return this.milliseconds;
  }
  equals(other: CalendarDate) {
    return (
      this.milliseconds === other.milliseconds &&
      this.toLocalValue() === other.toLocalValue() &&
      this.offset === other.offset
    );
  }
  inZoneOf(reference: CalendarDate) {
    return reference.operations.atMilliseconds(this.milliseconds);
  }
  setZoneId(zone: string) {
    return this.operations.setZoneId(zone);
  }
  set(fields: Partial<DateFields>) {
    return this.operations.set(fields);
  }
  startOf(unit: DateBoundary) {
    return this.operations.startOf(unit);
  }
  plus(duration: Partial<Record<DurationUnit | `${DurationUnit}s`, number>>) {
    const normalized: DateDuration = {};
    for (const unit of ["year", "month", "week", "day", "hour", "minute"] as const) {
      const amount = (duration[unit] ?? 0) + (duration[`${unit}s`] ?? 0);
      if (amount) normalized[`${unit}s`] = amount;
    }
    return Object.keys(normalized).length ? this.operations.plus(normalized) : this;
  }
  fromObject(fields: Partial<DateFields>) {
    const complete = { year: 2001, month: 1, day: 1, hour: 0, minute: 0, second: 0, ...fields };
    // Validate editor input without relying on libraries that silently constrain it.
    // Month length is queried from the selected library, never calculated here.
    if (
      !Object.values(complete).every(Number.isInteger) ||
      complete.year < 1 ||
      complete.year > 9999 ||
      complete.month < 1 ||
      complete.month > 12 ||
      complete.day < 1 ||
      complete.day > 31 ||
      complete.hour < 0 ||
      complete.hour > 23 ||
      complete.minute < 0 ||
      complete.minute > 59 ||
      complete.second < 0 ||
      complete.second > 59
    )
      throw new RangeError("Invalid calendar date");
    const first = this.operations.fromFields({ ...complete, day: 1, hour: 12 });
    if (complete.day > first.daysInMonth) throw new RangeError("Invalid calendar date");
    return this.operations.fromFields(complete);
  }
  fromISO(value: string): CalendarDate | undefined {
    const match = value.match(
      /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-]\d{2}:?\d{2})?)?$/i,
    );
    if (!match) return undefined;
    try {
      if (match[8]) fixedOffset(match[8]); // Validate offset syntax before passing it to a library.
      const source = match[8]
        ? this.setZoneId(
            match[8] === "Z" ? "UTC" : match[8].replace(/^([+-]\d{2})(\d{2})$/, "$1:$2"),
          )
        : this;
      return source
        .fromObject({
          year: Number(match[1]),
          month: Number(match[2]),
          day: Number(match[3]),
          hour: Number(match[4] ?? 0),
          minute: Number(match[5] ?? 0),
          second: Number(match[6] ?? 0),
        })
        .inZoneOf(this);
    } catch {
      return undefined;
    }
  }
  toLocalValue() {
    return `${String(this.year).padStart(4, "0")}-${String(this.month).padStart(2, "0")}-${String(this.day).padStart(2, "0")}T${String(this.hour).padStart(2, "0")}:${String(this.minute).padStart(2, "0")}`;
  }
  toISO() {
    return `${this.toLocalValue()}${this.offset === 0 ? "Z" : offsetZone(this.offset)}`;
  }
  toLocaleParts(locale: Intl.LocalesArgument | undefined, options: Intl.DateTimeFormatOptions) {
    return this.operations.format(locale, options);
  }
}

/** Bind native values through closures, retaining opaque zones without type erasure. */
export function calendarDate<T, TZone>(adapter: DateAdapter<T, TZone>, value: T): CalendarDate {
  const zone = adapter.getZone(value);
  const wrap = (next: T): CalendarDate => calendarDate(adapter, next);
  return new CalendarDate({
    get fields() {
      return adapter.getFields(value);
    },
    milliseconds: adapter.toEpochMilliseconds(value),
    get isOffsetFixed() {
      return adapter.isOffsetFixed?.(value) ?? false;
    },
    get offset() {
      return adapter.getOffset(value);
    },
    get weekday() {
      return adapter.getWeekday(value);
    },
    get daysInMonth() {
      return adapter.getDaysInMonth(value);
    },
    fromFields: (fields) => wrap(adapter.fromFields(fields, zone)),
    atMilliseconds: (ms) => wrap(adapter.fromEpochMilliseconds(ms, zone)),
    set: (fields) => wrap(adapter.setFields(value, fields)),
    plus: (duration) => wrap(adapter.add(value, duration)),
    startOf: (unit) => wrap(adapter.startOf(value, unit)),
    setZoneId: (id) => wrap(adapter.setZoneId(value, id)),
    format: (locale, options) => formatterFor(adapter, zone, locale, options).formatToParts(value),
  });
}
