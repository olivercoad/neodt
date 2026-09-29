import { Temporal } from "@js-temporal/polyfill";

import { createTemporalAdapter } from "../adapters/temporal";
import { defineIntegration } from "../integration";

export const adapter = /* @__PURE__ */ createTemporalAdapter(Temporal);
export { createTemporalAdapter } from "../adapters/temporal";
export type { TemporalImplementation, TemporalZonedValue } from "../adapters/temporal";

/** @internal Demo/test setup; omitted from the published entry. */
export const integration = /* @__PURE__ */ defineIntegration({
  create: () => createTemporalAdapter(Temporal),
  zone: (id: string) => id,
});
