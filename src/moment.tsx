import moment, { type Moment } from "moment";

import { createMomentAdapter } from "./adapters/moment";
import {
  configureNeodt,
  type ConfiguredNeodtProps,
  type ConfiguredNaturalDateParseOptions,
} from "./configured";

export type NeodtProps = ConfiguredNeodtProps<Moment>;
export type NaturalDateParseOptions = ConfiguredNaturalDateParseOptions<Moment>;

export const { Neodt, parseNaturalDate } = configureNeodt(createMomentAdapter(moment));
export default Neodt;
export { getNaturalDateCompletions } from "./natural-completion";
export type { NaturalDateCompletion } from "./natural-completion";
export type { DateAdapter, AdapterOptions } from "./adapter";
