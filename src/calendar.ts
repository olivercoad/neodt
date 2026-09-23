// The editor's small, library-independent ISO calendar. Intl supplies IANA zone data.
export interface Fields {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second?: number;
}
export type DurationUnit = "year" | "month" | "week" | "day" | "hour" | "minute";
type Duration = Partial<Record<DurationUnit | `${DurationUnit}s`, number>>;
const minuteMs = 60_000;
const dayMs = 86_400_000;
const formatters = new Map<string, Intl.DateTimeFormat>();

export function fixedOffset(zone: string): number | undefined {
  if (/^(UTC|GMT|Z)$/i.test(zone)) return 0;
  const match = zone.match(/^(?:UTC|GMT)?([+-])(\d{1,2})(?::?(\d{2}))?$/i);
  if (!match) return undefined;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? 0);
  if (hours > 23 || minutes > 59) throw new RangeError(`Invalid zone: ${zone}`);
  return (match[1] === "-" ? -1 : 1) * (hours * 60 + minutes);
}
export function offsetZone(offset: number): string {
  offset = Math.round(offset);
  const absolute = Math.abs(offset);
  return `${offset < 0 ? "-" : "+"}${String(Math.floor(absolute / 60)).padStart(2, "0")}:${String(absolute % 60).padStart(2, "0")}`;
}
function utc(fields: Fields): number {
  const date = new Date(0);
  date.setUTCFullYear(fields.year, fields.month - 1, fields.day);
  date.setUTCHours(fields.hour, fields.minute, fields.second ?? 0, 0);
  return date.getTime();
}
function utcFields(ms: number): Fields {
  const date = new Date(ms);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
  };
}
function fieldsAt(ms: number, zone: string): Fields {
  const offset = fixedOffset(zone);
  if (offset !== undefined) return utcFields(ms + offset * minuteMs);
  let formatter = formatters.get(zone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US-u-ca-iso8601-nu-latn", {
      timeZone: zone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hourCycle: "h23",
    });
    // Bound the cache for applications accepting arbitrary zone identifiers.
    if (formatters.size >= 100) formatters.clear();
    formatters.set(zone, formatter);
  }
  const parts = formatter.formatToParts(ms);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
  };
}
export function offsetAt(ms: number, zone: string): number {
  return (utc(fieldsAt(ms, zone)) - Math.floor(ms / 1000) * 1000) / minuteMs;
}
function resolve(fields: Fields, zone: string, preferredOffset?: number): number {
  const wall = utc(fields);
  const offsets = new Set([
    offsetAt(wall - 2 * dayMs, zone),
    offsetAt(wall, zone),
    offsetAt(wall + 2 * dayMs, zone),
  ]);
  const candidates = [...offsets].map((offset) => wall - offset * minuteMs).sort((a, b) => a - b);
  const matching = candidates.filter((ms) => utc(fieldsAt(ms, zone)) === wall);
  // Preserve the selected side of a fold when editing an existing instant. New
  // ambiguous times use the earlier instant; gaps move forward by the gap.
  return (
    matching.find(
      (ms) => preferredOffset !== undefined && offsetAt(ms, zone) === preferredOffset,
    ) ??
    matching[0] ??
    candidates[candidates.length - 1]!
  );
}
export function daysInMonth(year: number, month: number): number {
  return new Date(utc({ year, month: month + 1, day: 0, hour: 0, minute: 0 })).getUTCDate();
}

export class CalendarDate {
  readonly fields: Fields;
  constructor(
    readonly milliseconds: number,
    readonly zone: string,
  ) {
    if (!Number.isFinite(milliseconds)) throw new RangeError("Invalid datetime value");
    this.fields = fieldsAt(milliseconds, zone);
  }
  static fromObject(fields: Partial<Fields>, { zone }: { zone: string }): CalendarDate {
    const complete = { year: 2001, month: 1, day: 1, hour: 0, minute: 0, ...fields };
    if (
      !Object.values(complete).every(Number.isInteger) ||
      complete.year < 1 ||
      complete.year > 9999 ||
      complete.month < 1 ||
      complete.month > 12 ||
      complete.day < 1 ||
      complete.day > daysInMonth(complete.year, complete.month) ||
      complete.hour < 0 ||
      complete.hour > 23 ||
      complete.minute < 0 ||
      complete.minute > 59
    )
      throw new RangeError("Invalid calendar date");
    return new CalendarDate(resolve(complete, zone), zone);
  }
  static fromISO(
    value: string,
    { zone = "UTC" }: { zone?: string } = {},
  ): CalendarDate | undefined {
    const match = value.match(
      /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-]\d{2}:?\d{2})?)?$/i,
    );
    if (!match || Number(match[6] ?? 0) > 59) return undefined;
    try {
      const sourceZone = match[8]?.replace(/^([+-]\d{2})(\d{2})$/, "$1:$2") ?? zone;
      return CalendarDate.fromObject(
        {
          year: Number(match[1]),
          month: Number(match[2]),
          day: Number(match[3]),
          hour: Number(match[4] ?? 0),
          minute: Number(match[5] ?? 0),
        },
        { zone: sourceZone },
      ).setZone(zone);
    } catch {
      return undefined;
    }
  }
  get year() {
    return this.fields.year;
  }
  get month() {
    return this.fields.month;
  }
  get day() {
    return this.fields.day;
  }
  get hour() {
    return this.fields.hour;
  }
  get minute() {
    return this.fields.minute;
  }
  get weekday() {
    return new Date(utc(this.fields)).getUTCDay() || 7;
  }
  get daysInMonth() {
    return daysInMonth(this.year, this.month);
  }
  get offset() {
    return offsetAt(this.milliseconds, this.zone);
  }
  valueOf() {
    return this.milliseconds;
  }
  equals(other: CalendarDate) {
    return this.milliseconds === other.milliseconds && this.zone === other.zone;
  }
  setZone(zone: string) {
    return new CalendarDate(this.milliseconds, zone);
  }
  set(fields: Partial<Fields>) {
    const next = { ...this.fields, ...fields };
    if (fields.day === undefined) next.day = Math.min(next.day, daysInMonth(next.year, next.month));
    return new CalendarDate(resolve(next, this.zone, this.offset), this.zone);
  }
  startOf(unit: "minute" | "day" | "month") {
    if (unit === "minute") return this.set({ second: 0 });
    return this.set({ ...(unit === "month" ? { day: 1 } : {}), hour: 0, minute: 0, second: 0 });
  }
  plus(duration: Duration) {
    const amount = (unit: DurationUnit) => (duration[unit] ?? 0) + (duration[`${unit}s`] ?? 0);
    const months = amount("year") * 12 + amount("month");
    const monthDate = utcFields(utc({ ...this.fields, month: this.month + months, day: 1 }));
    const fields = {
      ...this.fields,
      year: monthDate.year,
      month: monthDate.month,
      day: Math.min(this.day, daysInMonth(monthDate.year, monthDate.month)),
    };
    const shifted = utcFields(utc(fields) + (amount("day") + amount("week") * 7) * dayMs);
    return new CalendarDate(
      resolve(shifted, this.zone, this.offset) +
        (amount("hour") * 60 + amount("minute")) * minuteMs,
      this.zone,
    );
  }
  toLocalValue() {
    return `${String(this.year).padStart(4, "0")}-${String(this.month).padStart(2, "0")}-${String(this.day).padStart(2, "0")}T${String(this.hour).padStart(2, "0")}:${String(this.minute).padStart(2, "0")}`;
  }
  toISO() {
    return `${this.toLocalValue()}${this.offset === 0 ? "Z" : offsetZone(this.offset)}`;
  }
  toLocaleParts(locale: Intl.LocalesArgument | undefined, options: Intl.DateTimeFormatOptions) {
    const offset = fixedOffset(this.zone);
    const parts = new Intl.DateTimeFormat(locale, {
      ...options,
      timeZone: offset === undefined ? this.zone : "UTC",
      calendar: "gregory",
    }).formatToParts(offset === undefined ? this.milliseconds : utc(this.fields));
    // Fixed-offset identifiers are not supported by older Intl engines. Format
    // their wall clock in UTC and substitute only the timezone label.
    return offset === undefined || offset === 0
      ? parts
      : parts.map((part) =>
          part.type === "timeZoneName" ? { ...part, value: `UTC${offsetZone(offset)}` } : part,
        );
  }
}
