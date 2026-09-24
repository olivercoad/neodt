import { Temporal } from "temporal-polyfill";

import { createTemporalAdapter } from "../adapters/temporal";
import {
  configureNeodt,
  type ConfiguredNeodtProps,
  type ConfiguredNaturalDateParseOptions,
} from "../configured";
import { defineIntegration } from "../integration";

export type NeodtProps = ConfiguredNeodtProps<Temporal.ZonedDateTime>;
export type NaturalDateParseOptions = ConfiguredNaturalDateParseOptions<Temporal.ZonedDateTime>;

export const { Neodt, parseNaturalDate } = configureNeodt(createTemporalAdapter(Temporal));
export default Neodt;
export * from "../public";
export { createTemporalAdapter } from "../adapters/temporal";
export type { TemporalImplementation, TemporalZonedValue } from "../adapters/temporal";

/** @internal Demo/test setup; omitted from the published entry. */
export const integration = /* @__PURE__ */ defineIntegration({
  create: () => createTemporalAdapter(Temporal),
  zone: (id: string) => id,
  entry: { default: Neodt, Neodt, parseNaturalDate },
  behavior: {},
});
