import { fixedOffset, offsetZone } from "../format";

/** Format the actual instant and zone together, reusing one Intl formatter. */
export function createIntlFormatter<T>(
  zone: string,
  locale: Intl.LocalesArgument | undefined,
  options: Intl.DateTimeFormatOptions,
  milliseconds: (value: T) => number,
) {
  const offset = fixedOffset(zone);
  const formatter = new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: offset === undefined ? zone : offset === 0 ? "UTC" : offsetZone(offset),
    calendar: "gregory",
  });
  return { formatToParts: (value: T) => formatter.formatToParts(milliseconds(value)) };
}

/** Moment and Spacetime own timezone data that can differ from Intl's database.
 * Preserve their offsets for the fields, and use Intl only to localize zone names.
 */
export function createLibraryZoneFormatter<T>(
  zone: string,
  locale: Intl.LocalesArgument | undefined,
  options: Intl.DateTimeFormatOptions,
  milliseconds: (value: T) => number,
  offset: (value: T) => number,
) {
  const formatter = new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: "UTC",
    calendar: "gregory",
  });
  let zoneFormatter: Intl.DateTimeFormat | undefined;
  if (options.timeZoneName && fixedOffset(zone) === undefined) {
    try {
      zoneFormatter = new Intl.DateTimeFormat(locale, {
        timeZone: zone,
        timeZoneName: options.timeZoneName,
      });
    } catch {
      // Library-only zones retain a numeric offset label.
    }
  }
  return {
    formatToParts(value: T) {
      const ms = milliseconds(value);
      const minutes = offset(value);
      const parts = formatter.formatToParts(ms + minutes * 60_000);
      if (!options.timeZoneName) return parts;
      const label =
        zoneFormatter?.formatToParts(ms).find((part) => part.type === "timeZoneName")?.value ??
        (minutes === 0 ? "UTC" : `UTC${offsetZone(minutes)}`);
      return parts.map((part) => (part.type === "timeZoneName" ? { ...part, value: label } : part));
    },
  };
}
