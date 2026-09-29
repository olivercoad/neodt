import type { DateAdapter, DateBoundary, DateDuration, DateFields, DurationUnit } from "./adapter";
import { fixedOffset, offsetZone } from "./format";
import { formatterFor } from "./formatter-cache";

export type { DurationUnit } from "./adapter";

// Expose only calendar operations; native value and opaque zone types stay private.
export type CalendarDate = Pick<AdapterDate<never, never>, keyof AdapterDate<never, never>>;

/** A view over adapter operations, with no calendar arithmetic or timezone resolution. */
class AdapterDate<T, TZone> {
  private readonly zone: TZone;
  readonly milliseconds: number;

  constructor(
    private readonly adapter: DateAdapter<T, TZone>,
    private readonly value: T,
  ) {
    this.zone = adapter.getZone(value);
    this.milliseconds = adapter.toEpochMilliseconds(value);
    if (!Number.isFinite(this.milliseconds)) throw new RangeError("Invalid datetime value");
  }
  private wrap(value: T): CalendarDate {
    return calendarDate(this.adapter, value);
  }
  private fromFields(fields: DateFields): CalendarDate {
    return this.wrap(this.adapter.fromFields(fields, this.zone));
  }
  atMilliseconds(milliseconds: number): CalendarDate {
    return this.wrap(this.adapter.fromEpochMilliseconds(milliseconds, this.zone));
  }
  get year() {
    return this.adapter.getFields(this.value).year;
  }
  get month() {
    return this.adapter.getFields(this.value).month;
  }
  get day() {
    return this.adapter.getFields(this.value).day;
  }
  get hour() {
    return this.adapter.getFields(this.value).hour;
  }
  get minute() {
    return this.adapter.getFields(this.value).minute;
  }
  get isOffsetFixed() {
    return this.adapter.isOffsetFixed?.(this.value) ?? false;
  }
  get offset() {
    return this.adapter.getOffset(this.value);
  }
  get weekday() {
    return this.adapter.getWeekday(this.value);
  }
  get daysInMonth() {
    return this.adapter.getDaysInMonth(this.value);
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
  inZoneOf(reference: CalendarDate): CalendarDate {
    return reference.atMilliseconds(this.milliseconds);
  }
  setZoneId(zone: string): CalendarDate {
    return this.wrap(this.adapter.setZoneId(this.value, zone));
  }
  set(fields: Partial<DateFields>): CalendarDate {
    return this.wrap(this.adapter.setFields(this.value, fields));
  }
  startOf(unit: DateBoundary): CalendarDate {
    return this.wrap(this.adapter.startOf(this.value, unit));
  }
  plus(duration: Partial<Record<DurationUnit | `${DurationUnit}s`, number>>): CalendarDate {
    const normalized: DateDuration = {};
    for (const unit of ["year", "month", "week", "day", "hour", "minute"] as const) {
      const amount = (duration[unit] ?? 0) + (duration[`${unit}s`] ?? 0);
      if (amount) normalized[`${unit}s`] = amount;
    }
    return Object.keys(normalized).length
      ? this.wrap(this.adapter.add(this.value, normalized))
      : this;
  }
  fromObject(fields: Partial<DateFields>): CalendarDate {
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
    const first = this.fromFields({ ...complete, day: 1, hour: 12 });
    if (complete.day > first.daysInMonth) throw new RangeError("Invalid calendar date");
    return this.fromFields(complete);
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
    return formatterFor(this.adapter, this.zone, locale, options).formatToParts(this.value);
  }
}

export const CalendarDate = AdapterDate;

/** Retain native values and opaque zones without allocating an operations closure per method. */
export function calendarDate<T, TZone>(adapter: DateAdapter<T, TZone>, value: T): CalendarDate {
  return new AdapterDate(adapter, value);
}
