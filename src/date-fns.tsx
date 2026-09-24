import { toDate } from "date-fns/toDate";

import { createDateFnsAdapter } from "./adapters/date-fns";
import {
  configureNeodt,
  type ConfiguredNeodtProps,
  type ConfiguredNaturalDateParseOptions,
} from "./configured";

export type NeodtProps = ConfiguredNeodtProps<Date>;
export type NaturalDateParseOptions = ConfiguredNaturalDateParseOptions<Date>;

export const { Neodt, parseNaturalDate } = configureNeodt(createDateFnsAdapter(toDate));
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
export { createDateFnsAdapter } from "./adapters/date-fns";
