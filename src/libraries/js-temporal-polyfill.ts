import { Temporal } from "@js-temporal/polyfill";

import { createTemporalAdapter } from "../adapters/temporal";
import { configureDate, type ConfiguredNaturalDateParseOptions } from "../configured";
import { defineIntegration } from "../integration";

export type NaturalDateParseOptions = ConfiguredNaturalDateParseOptions<Temporal.ZonedDateTime>;

export const { adapter, parseNaturalDate } = configureDate(createTemporalAdapter(Temporal));
export * from "../public";
export { createTemporalAdapter } from "../adapters/temporal";
export type { TemporalImplementation, TemporalZonedValue } from "../adapters/temporal";

/** @internal Demo/test setup; omitted from the published entry. */
export const integration = /* @__PURE__ */ defineIntegration({
  create: () => createTemporalAdapter(Temporal),
  zone: (id: string) => id,
  behavior: {},
});
