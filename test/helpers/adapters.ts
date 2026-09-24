import { DateTime, FixedOffsetZone } from "luxon";

import type { DateAdapter } from "../../src/adapter";
import type { LibraryBehavior } from "../../src/integration";
import { integrations } from "./integrations";

export interface AdapterFixture<T, TZone> {
  name: string;
  adapter: DateAdapter<T, TZone>;
  zone: (id: string) => TZone;
  date: (iso: string, zone?: string) => T;
  localValue: (value: T | null | undefined) => string;
  iso: (value: T) => string;
  behavior: LibraryBehavior;
}

function fixture<T, TZone>(
  name: string,
  create: () => DateAdapter<T, TZone>,
  zone: (id: string) => TZone,
  behavior: LibraryBehavior,
) {
  return {
    name,
    // Keep each adapter's native value and zone types paired, without casts or `any`.
    run<R>(test: <T, TZone>(fixture: AdapterFixture<T, TZone>) => R): R {
      const adapter = create();
      // Use an independent ISO reader to construct inputs and inspect emitted values.
      const inspect = (value: T) =>
        DateTime.fromMillis(adapter.toEpochMilliseconds(value), {
          zone: FixedOffsetZone.instance(adapter.getOffset(value)),
        });
      return test({
        name,
        behavior,
        adapter,
        zone,
        date: (iso, id = "UTC") => {
          const value = DateTime.fromISO(iso, { zone: /^[+-]/.test(id) ? `UTC${id}` : id });
          if (!value.isValid) throw new Error(`Invalid fixture date: ${iso} (${id})`);
          return adapter.fromEpochMilliseconds(value.toMillis(), zone(id));
        },
        localValue: (value) => (value == null ? "" : inspect(value).toFormat("yyyy-MM-dd'T'HH:mm")),
        iso: (value) => inspect(value).toFormat("yyyy-MM-dd'T'HH:mmZZ"),
      });
    },
  };
}

export const builtInAdapters = integrations
  .filter(({ id }) => id !== "native-temporal")
  .map((integration) => ({
    name: integration.id,
    run<R>(test: <T, TZone>(fixture: AdapterFixture<T, TZone>) => R): R {
      return integration.run(({ adapter, zone, behavior }) =>
        fixture(integration.id, () => adapter, zone, behavior).run(test),
      );
    },
  }));
