import {
  fromAbsolute,
  CalendarDate,
  CalendarDateTime,
  type ZonedDateTime,
} from "@internationalized/date";
import { Temporal } from "@js-temporal/polyfill";
import { toDate } from "date-fns/toDate";
import dayjs, { type Dayjs } from "dayjs";
import { DateTime } from "luxon";
import moment, { type Moment } from "moment";
import spacetime, { type Spacetime } from "spacetime";
import { Temporal as Ponyfill } from "temporal-polyfill";
// Compiled by lint:types. These assertions also protect JSX's generic inference.
import { expectTypeOf } from "vitest";

import Neodt, { parseNaturalDate, type NeodtProps } from "../src/generic";
import { createDateFnsAdapter } from "../src/libraries/date-fns";
import { createDayjsAdapter } from "../src/libraries/dayjs";
import { createInternationalizedDateAdapter } from "../src/libraries/internationalized-date";
import { createLuxonAdapter, type LuxonZone } from "../src/libraries/luxon";
import { createMomentAdapter } from "../src/libraries/moment";
import { createTemporalAdapter } from "../src/libraries/native-temporal";
import { createSpacetimeAdapter } from "../src/libraries/spacetime";

export function checkAdapterTypes() {
  const internationalized = createInternationalizedDateAdapter(fromAbsolute);
  const internationalizedReference = fromAbsolute(0, "UTC");
  const luxon = createLuxonAdapter(DateTime);
  const moments = createMomentAdapter(moment);
  const days = createDayjsAdapter(dayjs);
  const dates = createDateFnsAdapter(toDate);
  const spaces = createSpacetimeAdapter(spacetime);
  const temporal = createTemporalAdapter(Temporal);
  const ponyfill = createTemporalAdapter(Ponyfill);
  expectTypeOf(
    parseNaturalDate("now", {
      adapter: internationalized,
      referenceTime: internationalizedReference,
    }),
  ).toEqualTypeOf<ZonedDateTime | undefined>();
  <Neodt
    adapter={internationalized}
    referenceTime={internationalizedReference}
    onValueChange={(value) => expectTypeOf(value).toEqualTypeOf<ZonedDateTime | null>()}
  />;
  // @ts-expect-error CalendarDate has no time or timezone.
  <Neodt adapter={internationalized} referenceTime={new CalendarDate(2026, 1, 1)} />;
  parseNaturalDate("now", {
    adapter: internationalized,
    // @ts-expect-error CalendarDateTime has no timezone.
    referenceTime: new CalendarDateTime(2026, 1, 1),
  });
  const reference = DateTime.now();
  const zdt = Temporal.Now.zonedDateTimeISO();
  const ponyDate = Ponyfill.Now.zonedDateTimeISO();

  expectTypeOf(parseNaturalDate("now", { adapter: luxon, referenceTime: reference })).toEqualTypeOf<
    DateTime | undefined
  >();
  expectTypeOf(
    parseNaturalDate("now", { adapter: moments, referenceTime: moment() }),
  ).toEqualTypeOf<Moment | undefined>();
  expectTypeOf(parseNaturalDate("now", { adapter: days, referenceTime: dayjs() })).toEqualTypeOf<
    Dayjs | undefined
  >();
  expectTypeOf(parseNaturalDate("now", { adapter: dates, referenceTime: toDate(0) })).toEqualTypeOf<
    Date | undefined
  >();
  expectTypeOf(
    parseNaturalDate("now", { adapter: spaces, referenceTime: spacetime.now() }),
  ).toEqualTypeOf<Spacetime | undefined>();
  expectTypeOf(parseNaturalDate("now", { adapter: temporal, referenceTime: zdt })).toEqualTypeOf<
    Temporal.ZonedDateTime | undefined
  >();
  expectTypeOf(
    parseNaturalDate("now", { adapter: ponyfill, referenceTime: ponyDate }),
  ).toEqualTypeOf<Ponyfill.ZonedDateTime | undefined>();

  <Neodt
    adapter={luxon}
    referenceTime={reference}
    onValueChange={(value) => expectTypeOf(value).toEqualTypeOf<DateTime | null>()}
  />;
  <Neodt
    adapter={moments}
    referenceTime={moment()}
    onValueChange={(value) => expectTypeOf(value).toEqualTypeOf<Moment | null>()}
  />;
  <Neodt
    adapter={days}
    referenceTime={dayjs()}
    onValueChange={(value) => expectTypeOf(value).toEqualTypeOf<Dayjs | null>()}
  />;
  <Neodt
    adapter={dates}
    referenceTime={toDate(0)}
    onValueChange={(value) => expectTypeOf(value).toEqualTypeOf<Date | null>()}
  />;
  <Neodt
    adapter={spaces}
    referenceTime={spacetime.now()}
    onValueChange={(value) => expectTypeOf(value).toEqualTypeOf<Spacetime | null>()}
  />;
  <Neodt
    adapter={temporal}
    referenceTime={zdt}
    onValueChange={(value) => expectTypeOf(value).toEqualTypeOf<Temporal.ZonedDateTime | null>()}
  />;
  <Neodt
    adapter={ponyfill}
    referenceTime={ponyDate}
    onValueChange={(value) => expectTypeOf(value).toEqualTypeOf<Ponyfill.ZonedDateTime | null>()}
  />;

  // @ts-expect-error The adapter is required; there is no implicit library.
  <Neodt referenceTime={reference} />;
  // @ts-expect-error A value cannot widen or change the adapter's type.
  <Neodt adapter={luxon} referenceTime={reference} value={toDate(0)} />;
  // @ts-expect-error Initial values must match the adapter.
  <Neodt adapter={luxon} referenceTime={reference} defaultValue={moment()} />;
  // @ts-expect-error The reference must match the adapter.
  <Neodt adapter={dates} referenceTime={reference} />;
  // @ts-expect-error Callbacks must receive the adapter's output type.
  <Neodt adapter={luxon} referenceTime={reference} onValueChange={(_value: Moment | null) => {}} />;
  // @ts-expect-error Callbacks must accept clearing.
  <Neodt adapter={luxon} referenceTime={reference} onValueChange={(_value: DateTime) => {}} />;
  // @ts-expect-error The parser cannot infer a union to accommodate mixed libraries.
  parseNaturalDate("now", { adapter: luxon, referenceTime: moment() });
  // @ts-expect-error A PlainDateTime is not an instant with a timezone.
  <Neodt adapter={temporal} referenceTime={Temporal.PlainDateTime.from("2026-01-01T12:00")} />;
  parseNaturalDate("tomorrow", { adapter: luxon, referenceTime: reference, zone: reference.zone });
  // @ts-expect-error Temporal uses its own string zone identifiers, not Luxon Zone objects.
  parseNaturalDate("tomorrow", { adapter: temporal, referenceTime: zdt, zone: reference.zone });
  parseNaturalDate("tomorrow", {
    adapter: luxon,
    referenceTime: reference,
    // @ts-expect-error A zone cannot widen the adapter's accepted native zone type.
    zone: { arbitrary: true },
  });
  const props: NeodtProps<DateTime, LuxonZone> = { adapter: luxon, referenceTime: reference };
  <Neodt {...props} />;
}
