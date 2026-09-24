import { Temporal } from "@js-temporal/polyfill";

import { createTemporalAdapter } from "./adapters/temporal";
import {
  configureNeodt,
  type ConfiguredNeodtProps,
  type ConfiguredNaturalDateParseOptions,
} from "./configured";

export type NeodtProps = ConfiguredNeodtProps<Temporal.ZonedDateTime>;
export type NaturalDateParseOptions = ConfiguredNaturalDateParseOptions<Temporal.ZonedDateTime>;

export const { Neodt, parseNaturalDate } = configureNeodt(createTemporalAdapter(Temporal));
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
