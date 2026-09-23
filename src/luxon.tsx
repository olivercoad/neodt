import { DateTime } from "luxon";

import { createLuxonAdapter, type LuxonZone } from "./adapters/luxon";
import {
  configureNeodt,
  type ConfiguredNeodtProps,
  type ConfiguredNaturalDateParseOptions,
} from "./configured";

export type NeodtProps = ConfiguredNeodtProps<DateTime, LuxonZone>;
export type NaturalDateParseOptions = ConfiguredNaturalDateParseOptions<DateTime, LuxonZone>;

export const { Neodt, parseNaturalDate } = configureNeodt(createLuxonAdapter(DateTime));
export default Neodt;
export { getNaturalDateCompletions } from "./natural-completion";
export type { NaturalDateCompletion } from "./natural-completion";
export type { DateAdapter, AdapterOptions } from "./adapter";
