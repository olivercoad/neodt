import type { DateAdapter } from "./adapter";
import {
  parseNaturalDate as parseGenericNaturalDate,
  type NaturalDateParseOptions,
} from "./natural-parser";
export type ConfiguredNaturalDateParseOptions<T, TZone = string> = Omit<
  NaturalDateParseOptions<T, TZone>,
  "adapter"
>;
export function configureDate<T, TZone>(adapter: DateAdapter<T, TZone>) {
  return {
    adapter,
    parseNaturalDate(value: string, options: ConfiguredNaturalDateParseOptions<T, TZone>) {
      return parseGenericNaturalDate(value, { ...options, adapter });
    },
  };
}
