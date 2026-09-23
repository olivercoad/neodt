import type { JSX } from "solid-js";

import type { DateAdapter } from "./adapter";
import GenericNeodt, { type NeodtProps as GenericNeodtProps } from "./generic";
import {
  parseNaturalDate as parseGenericNaturalDate,
  type NaturalDateParseOptions as GenericNaturalDateParseOptions,
} from "./natural-parser";

export type ConfiguredNeodtProps<T, TZone = string> = Omit<GenericNeodtProps<T, TZone>, "adapter">;
export type ConfiguredNaturalDateParseOptions<T, TZone = string> = Omit<
  GenericNaturalDateParseOptions<T, TZone>,
  "adapter"
>;

/** Bind both public APIs to one implementation without changing Solid's reactive props. */
export function configureNeodt<T, TZone>(adapter: DateAdapter<T, TZone>) {
  function Neodt(props: ConfiguredNeodtProps<T, TZone>): JSX.Element {
    return <GenericNeodt {...props} adapter={adapter} />;
  }
  function parseNaturalDate(
    value: string,
    options: ConfiguredNaturalDateParseOptions<T, TZone>,
  ): T | undefined {
    return parseGenericNaturalDate(value, { ...options, adapter });
  }
  return { Neodt, parseNaturalDate };
}
