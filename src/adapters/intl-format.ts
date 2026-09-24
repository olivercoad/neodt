import { fixedOffset, offsetZone } from "../format";

/** Formatting bridge for libraries without a format-to-parts API.
 * The adapter's library supplies a UTC timestamp with the desired wall-clock fields.
 * This helper only formats it; it performs no field-to-timestamp conversion.
 */
export function formatWithIntl(
  wallClockMilliseconds: number,
  offset: number,
  locale: Intl.LocalesArgument | undefined,
  options: Intl.DateTimeFormatOptions,
  zoneName?: string,
  milliseconds?: number,
): Intl.DateTimeFormatPart[] {
  const parts = new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: "UTC",
    calendar: "gregory",
  }).formatToParts(wallClockMilliseconds);
  if (!options.timeZoneName) return parts;
  let label = offset === 0 ? "UTC" : `UTC${offsetZone(offset)}`;
  if (zoneName && fixedOffset(zoneName) === undefined && milliseconds !== undefined) {
    try {
      label =
        new Intl.DateTimeFormat(locale, { timeZone: zoneName, timeZoneName: options.timeZoneName })
          .formatToParts(milliseconds)
          .find((part) => part.type === "timeZoneName")?.value ?? label;
    } catch {
      /* Opaque/fixed zones use the library's numeric offset label. */
    }
  }
  return parts.map((part) => (part.type === "timeZoneName" ? { ...part, value: label } : part));
}
