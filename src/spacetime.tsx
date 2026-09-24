import spacetime, { type Spacetime } from "spacetime";

import { createSpacetimeAdapter } from "./adapters/spacetime";
import {
  configureNeodt,
  type ConfiguredNeodtProps,
  type ConfiguredNaturalDateParseOptions,
} from "./configured";

export type NeodtProps = ConfiguredNeodtProps<Spacetime>;
export type NaturalDateParseOptions = ConfiguredNaturalDateParseOptions<Spacetime>;

export const { Neodt, parseNaturalDate } = configureNeodt(createSpacetimeAdapter(spacetime));
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
export { createSpacetimeAdapter } from "./adapters/spacetime";
