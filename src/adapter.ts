/** A bridge between a datetime value and neodt's ISO/Gregorian, minute-precision editor.
 * Methods must not mutate values. TZone is the library’s native zone representation.
 */
export interface DateAdapter<T, TZone = string> {
  readonly toEpochMilliseconds: (value: T) => number;
  readonly fromEpochMilliseconds: (milliseconds: number, zone: TZone) => T;
  readonly getZone: (value: T) => TZone;
  /** One-way projection for the shared Intl calendar. The native zone is retained
   * and passed unchanged to fromEpochMilliseconds; no reverse conversion is needed.
   */
  readonly getZoneId: (zone: TZone) => string;
}

/** For values that do not retain an IANA zone, configure the editor's zone explicitly. */
export interface AdapterOptions {
  zone?: string;
}

export function systemZone(): string {
  return new Intl.DateTimeFormat().resolvedOptions().timeZone;
}
