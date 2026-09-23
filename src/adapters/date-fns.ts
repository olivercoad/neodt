import { systemZone, type AdapterOptions, type DateAdapter } from "../adapter";

/** date-fns uses native Date values. Pass its toDate function (or a Date subclass factory).
 * Dates store instants only; zone configures editing and display, not Date's local getters.
 */
export function createDateFnsAdapter<T extends Date = Date>(
  toDate: (milliseconds: number) => NoInfer<T>,
  options: AdapterOptions = {},
): DateAdapter<T> {
  const zone = options.zone ?? systemZone();
  return {
    getZoneId: (zone) => zone,
    toEpochMilliseconds: (value) => value.getTime(),
    fromEpochMilliseconds: (milliseconds) => toDate(milliseconds),
    getZone: () => zone,
  };
}
