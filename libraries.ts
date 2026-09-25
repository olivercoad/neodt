// Metadata only: importing the selector must never import datetime implementations.
const registrations = [
  {
    id: "native-temporal",
    factory: "createTemporalAdapter",
    implementation: "Temporal",
    callback: "value?.toInstant()",

    label: "Native Temporal",
    entry: "",
    imports: "",
    now: "Temporal.Now.zonedDateTimeISO()",
    type: "Temporal.ZonedDateTime",
    packages: "",
  },
  {
    id: "temporal-polyfill",
    factory: "createTemporalAdapter",
    implementation: "Temporal",
    callback: "value?.toInstant()",

    imports: 'import { Temporal } from "temporal-polyfill";',
    now: "Temporal.Now.zonedDateTimeISO()",
    type: "Temporal.ZonedDateTime",
  },
  {
    id: "js-temporal-polyfill",
    factory: "createTemporalAdapter",
    implementation: "Temporal",
    callback: "value?.toInstant()",

    label: "@js-temporal/polyfill",
    imports: 'import { Temporal } from "@js-temporal/polyfill";',
    now: "Temporal.Now.zonedDateTimeISO()",
    type: "Temporal.ZonedDateTime",
    packages: "@js-temporal/polyfill",
  },
  {
    id: "luxon",
    factory: "createLuxonAdapter",
    implementation: "DateTime",
    callback: "value?.toISO()",
    typePackages: ["@types/luxon"],
    homepage: "https://moment.github.io/luxon/",

    label: "Luxon",
    imports: 'import { DateTime } from "luxon";',
    now: "DateTime.now()",
    type: "DateTime",
  },
  {
    id: "moment",
    factory: "createMomentAdapter",
    implementation: "moment",
    callback: "value?.format()",
    homepage: "https://momentjs.com/",
    demoPackages: ["moment-timezone"],

    label: "Moment",
    imports: 'import moment from "moment";',
    now: "moment()",
    type: "moment.Moment",
  },
  {
    id: "dayjs",
    factory: "createDayjsAdapter",
    implementation: "dayjs",
    callback: "value?.format()",
    homepage: "https://day.js.org/",

    label: "Day.js",
    imports: 'import dayjs from "dayjs";',
    now: "dayjs()",
    type: "dayjs.Dayjs",
  },
  {
    id: "date-fns",
    factory: "createDateFnsAdapter",
    implementation: "toDate",
    callback: "value?.getTime()",
    homepage: "https://date-fns.org/",

    imports: 'import { toDate } from "date-fns/toDate";',
    now: "new Date()",
    type: "Date",
    packages: "date-fns @date-fns/tz",
  },
  {
    id: "spacetime",
    factory: "createSpacetimeAdapter",
    implementation: "spacetime",
    callback: "value?.epoch",
    homepage: "https://spacetime.how/",

    label: "Spacetime",
    imports: 'import spacetime from "spacetime";',
    now: "spacetime.now()",
    type: "ReturnType<typeof spacetime>",
  },
  {
    id: "internationalized-date",
    factory: "createInternationalizedDateAdapter",
    implementation: "fromAbsolute",
    callback: "value?.toAbsoluteString()",
    homepage: "https://react-aria.adobe.com/internationalized/date/",

    label: "@internationalized/date",
    imports:
      'import { fromAbsolute, now, getLocalTimeZone, type ZonedDateTime } from "@internationalized/date";',
    now: "now(getLocalTimeZone())",
    type: "ZonedDateTime",
    packages: "@internationalized/date",
  },
] as const;
export const libraries = registrations.map((library) => {
  const packages = "packages" in library ? library.packages : library.id;
  return {
    label: library.id,
    entry: `/${library.id}`,
    typePackages: [] as readonly string[],
    demoPackages: [] as readonly string[],
    homepage: undefined as string | undefined,
    ...library,
    packages,
    dependencies: packages ? packages.split(" ") : [],
    source: `src/libraries/${library.id}.ts`,
  };
});
export type LibraryId = (typeof libraries)[number]["id"];
export const libraryPath = (id: LibraryId) => `/${id}/`;
export const datetimePackages = [...new Set(libraries.flatMap((library) => library.dependencies))];
