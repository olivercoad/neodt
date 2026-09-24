import type { CalendarDate as DateTime } from "./calendar";

export const segmentNames = ["year", "month", "day", "hour", "minute", "dayPeriod"] as const;
export type SegmentName = (typeof segmentNames)[number];
export type Segment = { type: SegmentName; value: string; editable: true };
export type DisplayPart = Segment | { type: string; value: string; editable: false };

const editableTypes = new Set<string>(segmentNames);
const timeTypes = new Set<SegmentName>(["hour", "minute", "dayPeriod"]);

export function parseLocal(value: string, reference: DateTime): DateTime | undefined {
  if (!value) return undefined;
  const date = reference.fromISO(value);
  return date;
}

export function toLocalValue(date: DateTime): string {
  return date.toLocalValue();
}

export function partsFor(
  value: string,
  reference: DateTime,
  locale: Intl.LocalesArgument | undefined,
  options: Intl.DateTimeFormatOptions | undefined,
): DisplayPart[] {
  const date =
    parseLocal(value, reference) ??
    reference.fromObject({ year: 2001, month: 2, day: 3, hour: 4, minute: 5 });
  return date
    .toLocaleParts(locale, {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      ...options,
    })
    .map((part) =>
      isSegmentName(part.type)
        ? {
            type: part.type,
            value: part.type === "year" ? part.value.padStart(4, "0") : part.value,
            editable: true,
          }
        : { type: part.type, value: part.value, editable: false },
    );
}

export function naturalPreview(
  date: DateTime,
  locale: Intl.LocalesArgument | undefined,
  options: Intl.DateTimeFormatOptions | undefined,
): string {
  return partsFor(toLocalValue(date), date, locale, options)
    .map((part) => part.value)
    .join("");
}

export function timeOffset(date: DateTime) {
  const offset = Math.round(date.offset);
  const sign = offset < 0 ? "-" : "+";
  const minutes = Math.abs(offset);
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return {
    hours: `${sign}${hours}`,
    minutes: `:${remainder.toString().padStart(2, "0")}`,
    hasZeroMinutes: remainder === 0,
  };
}

export function splitDateAndTime(parts: DisplayPart[]) {
  const firstEditableType = parts.find((part): part is Segment => part.editable)?.type;
  const firstIsTime = firstEditableType !== undefined && timeTypes.has(firstEditableType);
  const splitAt = parts.findIndex(
    (part) => part.editable && timeTypes.has(part.type) !== firstIsTime,
  );
  return {
    first: splitAt < 1 ? parts : parts.slice(0, splitAt),
    second: splitAt < 1 ? [] : parts.slice(splitAt),
  };
}

export function digitLimit(segment: SegmentName): number {
  return segment === "year" ? 4 : segment === "dayPeriod" ? 0 : 2;
}

export function placeholderFor(segment: SegmentName): string {
  if (segment === "year") return "yyyy";
  if (segment === "month") return "mm";
  if (segment === "day") return "dd";
  return "--";
}

export function isCompleteSegment(segment: SegmentName, digits: string, hour12: boolean): boolean {
  if (digits.length === digitLimit(segment)) return true;
  const maximum =
    segment === "month"
      ? 12
      : segment === "day"
        ? 31
        : segment === "hour"
          ? hour12
            ? 12
            : 23
          : segment === "minute"
            ? 59
            : undefined;
  return maximum !== undefined && Number(digits) * 10 > maximum;
}

export function closestYear(twoDigitYear: string, referenceTime: DateTime): number {
  const candidate = Math.floor(referenceTime.year / 100) * 100 + Number(twoDigitYear);
  if (candidate - referenceTime.year > 50) return candidate - 100;
  if (referenceTime.year - candidate > 50) return candidate + 100;
  return candidate;
}

export function nearestLeapYear(year: number, reference: DateTime): number {
  for (let distance = 0; ; distance += 1) {
    const earlier = year - distance;
    if (earlier >= 1 && reference.fromObject({ year: earlier, month: 2 }).daysInMonth === 29)
      return earlier;
    const later = year + distance;
    if (reference.fromObject({ year: later, month: 2 }).daysInMonth === 29) return later;
  }
}

function isSegmentName(type: string): type is SegmentName {
  return editableTypes.has(type);
}

export function sameDateValue(
  left: DateTime | null | undefined,
  right: DateTime | null | undefined,
): boolean {
  return left === right || Boolean(left && right && left.equals(right));
}

export function segmentAria(
  date: DateTime,
  segment: SegmentName,
  cleared: ReadonlySet<SegmentName>,
  cycle: Intl.ResolvedDateTimeFormatOptions["hourCycle"],
) {
  switch (segment) {
    case "year":
      return { value: date.year, min: undefined, max: undefined };
    case "month":
      return { value: date.month, min: 1, max: 12 };
    case "day":
      return {
        value: date.day,
        min: 1,
        max: cleared.has("month")
          ? 31
          : cleared.has("year") && date.month === 2
            ? 29
            : date.daysInMonth,
      };
    case "minute":
      return { value: date.minute, min: 0, max: 59 };
    case "dayPeriod":
      return { value: date.hour < 12 ? 0 : 1, min: 0, max: 1 };
    case "hour": {
      const min = cycle === "h12" || cycle === "h24" ? 1 : 0;
      const size = cycle === "h11" || cycle === "h12" ? 12 : 24;
      return { value: date.hour % size || (min ? size : 0), min, max: size - 1 + min };
    }
  }
}
