import { fromAbsolute, type ZonedDateTime } from "@internationalized/date";

import { createInternationalizedDateAdapter } from "./adapters/internationalized-date";
import {
  configureNeodt,
  type ConfiguredNeodtProps,
  type ConfiguredNaturalDateParseOptions,
} from "./configured";

export type NeodtProps = ConfiguredNeodtProps<ZonedDateTime>;
export type NaturalDateParseOptions = ConfiguredNaturalDateParseOptions<ZonedDateTime>;

export const { Neodt, parseNaturalDate } = configureNeodt(
  createInternationalizedDateAdapter(fromAbsolute),
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
export { createInternationalizedDateAdapter } from "./adapters/internationalized-date";
