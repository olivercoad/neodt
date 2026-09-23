import dayjs, { type Dayjs } from "dayjs";

import { createDayjsAdapter } from "./adapters/dayjs";
import {
  configureNeodt,
  type ConfiguredNeodtProps,
  type ConfiguredNaturalDateParseOptions,
} from "./configured";

export type NeodtProps = ConfiguredNeodtProps<Dayjs>;
export type NaturalDateParseOptions = ConfiguredNaturalDateParseOptions<Dayjs>;

export const { Neodt, parseNaturalDate } = configureNeodt(createDayjsAdapter(dayjs));
export default Neodt;
export { getNaturalDateCompletions } from "./natural-completion";
export type { NaturalDateCompletion } from "./natural-completion";
export type { DateAdapter, AdapterOptions } from "./adapter";
