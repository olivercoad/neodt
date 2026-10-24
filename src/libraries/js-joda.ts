import { ChronoUnit, Instant, ZoneId, ZonedDateTime } from "@js-joda/core";

import { systemZone, type DateAdapter } from "../adapter";
import { createLibraryZoneFormatter } from "../adapters/intl-format";
import { defineIntegration } from "../integration";

export const adapter = /* @__PURE__ */ createJsJodaAdapter(ZonedDateTime);

/** Load @js-joda/timezone in your application to use IANA timezone names. */
export function createJsJodaAdapter(
  ZonedDateTime: Pick<typeof import("@js-joda/core").ZonedDateTime, "of" | "ofInstant" | "ofLocal">,
): DateAdapter<ZonedDateTime, ZoneId> {
  return {
    toEpochMilliseconds: (value) => value.toInstant().toEpochMilli(),
    fromEpochMilliseconds: (ms, zone) => ZonedDateTime.ofInstant(Instant.ofEpochMilli(ms), zone),
    getZone: (value) => value.zone(),
    getFields: (value) => ({
      year: value.year(),
      month: value.monthValue(),
      day: value.dayOfMonth(),
      hour: value.hour(),
      minute: value.minute(),
      second: value.second(),
    }),
    fromFields: (fields, zone) =>
      ZonedDateTime.of(
        fields.year,
        fields.month,
        fields.day,
        fields.hour,
        fields.minute,
        fields.second ?? 0,
        0,
        zone,
      ),
    setFields: (value, fields) => {
      let local = value.toLocalDateTime();
      if (fields.year !== undefined) local = local.withYear(fields.year);
      if (fields.month !== undefined) local = local.withMonth(fields.month);
      if (fields.day !== undefined) local = local.withDayOfMonth(fields.day);
      if (fields.hour !== undefined) local = local.withHour(fields.hour);
      if (fields.minute !== undefined) local = local.withMinute(fields.minute);
      if (fields.second !== undefined) local = local.withSecond(fields.second);
      return ZonedDateTime.ofLocal(local, value.zone(), value.offset());
    },
    add: (value, duration) =>
      value
        .plusYears(duration.years ?? 0)
        .plusMonths(duration.months ?? 0)
        .plusWeeks(duration.weeks ?? 0)
        .plusDays(duration.days ?? 0)
        .plusHours(duration.hours ?? 0)
        .plusMinutes(duration.minutes ?? 0),
    startOf: (value, unit) => {
      if (unit === "minute") return value.truncatedTo(ChronoUnit.MINUTES);
      const date = value.toLocalDate();
      return (unit === "month" ? date.withDayOfMonth(1) : date).atStartOfDay(value.zone());
    },
    getWeekday: (value) => value.dayOfWeek().value(),
    getDaysInMonth: (value) => value.toLocalDate().lengthOfMonth(),
    getOffset: (value) => value.offset().totalSeconds() / 60,
    isOffsetFixed: (value) => value.zone().rules().isFixedOffset(),
    setZoneId: (value, id) => value.withZoneSameInstant(ZoneId.of(id)),
    createFormatter: (zone, locale, options) =>
      createLibraryZoneFormatter(
        zone.id() === "SYSTEM" ? systemZone() : zone.id(),
        locale,
        options,
        (value: ZonedDateTime) => value.toInstant().toEpochMilli(),
        (value) => value.offset().totalSeconds() / 60,
      ),
  };
}

/** @internal Demo/test setup; omitted from the published entry. */
export const integration = /* @__PURE__ */ defineIntegration({
  create: () => createJsJodaAdapter(ZonedDateTime),
  zone: (id: string) => ZoneId.of(id),
  async setup() {
    await import("@js-joda/timezone");
  },
  behavior: {
    offsetLabel: "UTC+05:45",
  },
});
