import { createTemporalAdapter } from "../adapters/temporal";
import { defineIntegration } from "../integration";

export const adapter = createTemporalAdapter<Temporal.ZonedDateTime>({
  ZonedDateTime: {
    from(fields, options) {
      return Temporal.ZonedDateTime.from(fields, options);
    },
  },
  Instant: {
    fromEpochMilliseconds(milliseconds) {
      if (typeof Temporal === "undefined") {
        throw new Error(
          "Native Temporal is unavailable. Import the temporal-polyfill or js-temporal-polyfill entry under your framework instead.",
        );
      }
      return Temporal.Instant.fromEpochMilliseconds(milliseconds);
    },
  },
});
export { createTemporalAdapter } from "../adapters/temporal";
export type { TemporalImplementation, TemporalZonedValue } from "../adapters/temporal";

/** @internal Demo/test setup; omitted from the published entry. */
export const integration = /* @__PURE__ */ defineIntegration({
  create: () => createTemporalAdapter(globalThis.Temporal),
  zone: (id: string) => id,
});
