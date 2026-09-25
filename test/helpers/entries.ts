import type { JSX } from "solid-js";
import { Temporal as Ponyfill } from "temporal-polyfill";
import { vi } from "vitest";

import type { NeodtProps } from "../../frameworks/solid/generic";
import type { ConfiguredNaturalDateParseOptions } from "../../src/configured";
export interface ConfiguredEntry<T, TZone> {
  default: (props: Omit<NeodtProps<T, TZone>, "adapter">) => JSX.Element;
  Neodt: (props: Omit<NeodtProps<T, TZone>, "adapter">) => JSX.Element;
  parseNaturalDate: (
    value: string,
    options: ConfiguredNaturalDateParseOptions<T, TZone>,
  ) => T | undefined;
}
import { integrations } from "./integrations";

const modules = import.meta.glob("../../generated/solid/*.ts", { eager: true });
const entries = Object.fromEntries(
  integrations.map((integration) => [
    integration.id,
    modules[`../../generated/solid/${integration.entry.slice(1) || "index"}.ts`],
  ]),
);

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
      integration.run(
        <T, TZone>({
          adapter,
          zone,
        }: import("../../src/integration").IntegrationContext<T, TZone>) =>
          contract(
            integration.id,
            entries[integration.id] as ConfiguredEntry<T, TZone>,
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
