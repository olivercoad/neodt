import { Temporal as Ponyfill } from "temporal-polyfill";
import { vi } from "vitest";

import type { ConfiguredEntry } from "../../src/integration";
import { integrations } from "./integrations";

export const milliseconds = Ponyfill.Instant.from("2026-04-15T12:30Z").epochMilliseconds;
export function forEachConfiguredEntry(
  contract: <T, TZone>(
    name: string,
    entry: ConfiguredEntry<T, TZone>,
    referenceTime: T,
    epoch: (value: T) => number,
    native?: boolean,
  ) => void,
) {
  for (const integration of integrations) {
    const native = integration.id === "native-temporal";
    if (native) vi.stubGlobal("Temporal", Ponyfill);
    try {
      integration.run(({ adapter, zone, entry }) =>
        contract(
          integration.id,
          entry,
          adapter.fromEpochMilliseconds(milliseconds, zone("UTC")),
          adapter.toEpochMilliseconds,
          native,
        ),
      );
    } finally {
      if (native) vi.unstubAllGlobals();
    }
  }
}
