import type { JSX } from "solid-js";

import type { DateAdapter } from "./adapter";
import type { ConfiguredNeodtProps, ConfiguredNaturalDateParseOptions } from "./configured";

export interface ConfiguredEntry<T, TZone> {
  default: (props: ConfiguredNeodtProps<T, TZone>) => JSX.Element;
  Neodt: (props: ConfiguredNeodtProps<T, TZone>) => JSX.Element;
  parseNaturalDate: (
    value: string,
    options: ConfiguredNaturalDateParseOptions<T, TZone>,
  ) => T | undefined;
}

/** Expected library semantics, independent of the adapter's calculated results. */
export interface LibraryBehavior {
  earlyYears?: boolean;
  gapInstant?: string;
  editFoldOffset?: string;
  minuteFoldOffset?: string;
  exactMinuteFoldOffset?: string;
  leapYearEdit?: string;
  halfHourGap?: string;
  skippedDay?: string;
  offsetLabel?: string;
  earlyParisMinute?: string;
  earlyYearValues?: Record<string, string[]>;
}
export interface IntegrationContext<T, TZone> {
  adapter: DateAdapter<T, TZone>;
  zone: (id: string) => TZone;
  entry: ConfiguredEntry<T, TZone>;
  behavior: LibraryBehavior;
}

/** Preserve each implementation's paired value/zone types when iterating the registry. */
export function defineIntegration<T, TZone>(options: {
  create: () => DateAdapter<T, TZone>;
  zone: (id: string) => TZone;
  entry: ConfiguredEntry<T, TZone>;
  setup?: () => Promise<void>;
  behavior?: LibraryBehavior;
}) {
  return {
    setup: options.setup ?? (() => Promise.resolve()),
    run<R>(use: <T, TZone>(context: IntegrationContext<T, TZone>) => R): R {
      return use({
        adapter: options.create(),
        zone: options.zone,
        entry: options.entry,
        behavior: options.behavior ?? {},
      });
    },
  };
}
