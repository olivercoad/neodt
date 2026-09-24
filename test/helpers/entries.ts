import { fromAbsolute } from "@internationalized/date";
import { Temporal as JsTemporal } from "@js-temporal/polyfill";
import { toDate } from "date-fns/toDate";
import dayjs from "dayjs";
import { DateTime } from "luxon";
import moment from "moment";
import type { JSX } from "solid-js";
import spacetime from "spacetime";
import { Temporal as Ponyfill } from "temporal-polyfill";

import * as native from "../../src";
import type { ConfiguredNeodtProps, ConfiguredNaturalDateParseOptions } from "../../src/configured";
import * as dates from "../../src/date-fns";
import * as days from "../../src/dayjs";
import * as internationalized from "../../src/internationalized-date";
import * as jsTemporal from "../../src/js-temporal-polyfill";
import * as luxon from "../../src/luxon";
import * as moments from "../../src/moment";
import * as spaces from "../../src/spacetime";
import * as temporal from "../../src/temporal-polyfill";

export const milliseconds = JsTemporal.Instant.from("2026-04-15T12:30Z").epochMilliseconds;

export interface ConfiguredEntry<T, TZone> {
  default: (props: ConfiguredNeodtProps<T, TZone>) => JSX.Element;
  Neodt: (props: ConfiguredNeodtProps<T, TZone>) => JSX.Element;
  parseNaturalDate: (
    value: string,
    options: ConfiguredNaturalDateParseOptions<T, TZone>,
  ) => T | undefined;
}

export function forEachConfiguredEntry(
  contract: <T, TZone>(
    name: string,
    entry: ConfiguredEntry<T, TZone>,
    referenceTime: T,
    epoch: (value: T) => number,
    native?: boolean,
  ) => void,
) {
  contract(
    "internationalized-date",
    internationalized,
    fromAbsolute(milliseconds, "America/New_York"),
    (value) => value.toDate().getTime(),
  );
  contract("luxon", luxon, DateTime.fromMillis(milliseconds), (value) => value.toMillis());
  contract("moment", moments, moment(milliseconds), (value) => value.valueOf());
  contract("dayjs", days, dayjs(milliseconds), (value) => value.valueOf());
  contract("date-fns", dates, toDate(milliseconds), (value) => value.getTime());
  contract("spacetime", spaces, spacetime(milliseconds), (value) => value.epoch);
  contract(
    "temporal-polyfill",
    temporal,
    Ponyfill.Instant.fromEpochMilliseconds(milliseconds).toZonedDateTimeISO("UTC"),
    (value) => value.epochMilliseconds,
  );
  contract(
    "js-temporal-polyfill",
    jsTemporal,
    JsTemporal.Instant.fromEpochMilliseconds(milliseconds).toZonedDateTimeISO("UTC"),
    (value) => value.epochMilliseconds,
  );

  contract(
    "native-temporal",
    native,
    Ponyfill.Instant.fromEpochMilliseconds(milliseconds).toZonedDateTimeISO("UTC"),
    (value) => value.epochMilliseconds,
    true,
  );
}
