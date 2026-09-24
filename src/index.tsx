import { createTemporalAdapter } from "./adapters/temporal";
import {
  configureNeodt,
  type ConfiguredNeodtProps,
  type ConfiguredNaturalDateParseOptions,
} from "./configured";

export type NeodtProps = ConfiguredNeodtProps<Temporal.ZonedDateTime>;
export type NaturalDateParseOptions = ConfiguredNaturalDateParseOptions<Temporal.ZonedDateTime>;

export const { Neodt, parseNaturalDate } = configureNeodt(
  createTemporalAdapter<Temporal.ZonedDateTime>({
    ZonedDateTime: {
      from(fields, options) {
        return Temporal.ZonedDateTime.from(fields, options);
      },
    },
    Instant: {
      fromEpochMilliseconds(milliseconds) {
        if (typeof Temporal === "undefined") {
          throw new Error(
            "Native Temporal is unavailable. Import @olicoad/neodt/temporal-polyfill or @olicoad/neodt/js-temporal-polyfill instead.",
          );
        }
        return Temporal.Instant.fromEpochMilliseconds(milliseconds);
      },
    },
  }),
);
export default Neodt;
export { getNaturalDateCompletions } from "./natural-completion";
export type { NaturalDateCompletion } from "./natural-completion";
export type {
  DateAdapter,
  AdapterOptions,
  DateFields,
  DateDuration,
  DateBoundary,
  DurationUnit,
} from "./adapter";
export { createTemporalAdapter } from "./adapters/temporal";
export type { TemporalImplementation, TemporalZonedValue } from "./adapters/temporal";
