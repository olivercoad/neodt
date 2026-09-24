import { fromAbsolute } from "@internationalized/date";
import { Temporal as JsTemporal } from "@js-temporal/polyfill";
import { toDate } from "date-fns/toDate";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import { DateTime, FixedOffsetZone } from "luxon";
import moment from "moment-timezone";
import spacetime from "spacetime";
import { Temporal } from "temporal-polyfill";

import type { DateAdapter } from "../../src/adapter";
import { createDateFnsAdapter } from "../../src/adapters/date-fns";
import { createDayjsAdapter } from "../../src/adapters/dayjs";
import { createInternationalizedDateAdapter } from "../../src/adapters/internationalized-date";
import { createLuxonAdapter } from "../../src/adapters/luxon";
import { createMomentAdapter } from "../../src/adapters/moment";
import { createSpacetimeAdapter } from "../../src/adapters/spacetime";
import { createTemporalAdapter } from "../../src/adapters/temporal";

dayjs.extend(utc);
dayjs.extend(timezone);

export interface AdapterFixture<T, TZone> {
  name: string;
  adapter: DateAdapter<T, TZone>;
  zone: (id: string) => TZone;
  date: (iso: string, zone?: string) => T;
  localValue: (value: T | null | undefined) => string;
  iso: (value: T) => string;
}

function fixture<T, TZone>(
  name: string,
  create: () => DateAdapter<T, TZone>,
  zone: (id: string) => TZone,
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

const stringZone = (id: string) => id;

// Shared by unit suites; entrypoints.test.ts checks parity with public exports and browser entries.
export const builtInAdapters = [
  fixture(
    "internationalized-date",
    () => createInternationalizedDateAdapter(fromAbsolute),
    stringZone,
  ),
  fixture(
    "luxon",
    () => createLuxonAdapter(DateTime),
    (id) => DateTime.now().setZone(/^[+-]/.test(id) ? `UTC${id}` : id).zone,
  ),
  fixture("moment", () => createMomentAdapter(moment), stringZone),
  fixture("dayjs", () => createDayjsAdapter(dayjs), stringZone),
  fixture("date-fns", () => createDateFnsAdapter(toDate), stringZone),
  fixture("spacetime", () => createSpacetimeAdapter(spacetime), stringZone),
  fixture("js-temporal-polyfill", () => createTemporalAdapter(JsTemporal), stringZone),
  fixture("temporal-polyfill", () => createTemporalAdapter(Temporal), stringZone),
];
