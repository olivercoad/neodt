# neodt

A locale-aware, keyboard-editable segmented date and time input for Solid.

**Links**: [npm](https://www.npmjs.com/package/@olicoad/neodt) | [GitHub](https://github.com/olivercoad/neodt) | [Issues](https://github.com/olivercoad/neodt/issues) | [Demo](https://neodt.olisworld.com)

## Install

```bash
pnpm add @olicoad/neodt solid-js
```

## Usage

The default import uses native Temporal. Your runtime must provide Temporal; see [Datetime libraries](https://neodt.olisworld.com/#/docs/libraries) for polyfills and other libraries.

```tsx
import { createSignal } from "solid-js";
import Neodt from "@olicoad/neodt";

function Appointment() {
  const [value, setValue] = createSignal<Temporal.ZonedDateTime | null>(null);

  return (
    <Neodt
      referenceTime={Temporal.Now.zonedDateTimeISO("Australia/Sydney")}
      locale="en-AU"
      value={value()}
      onValueChange={setValue}
    />
  );
}
```

## Datetime adapters

The import path selects the adapter for both `Neodt` and `parseNaturalDate`. No `adapter` prop or parser option is needed for these entries. Only the selected library is loaded; datetime packages are optional peer dependencies.

| Import                                  | Implementation            | Value type                   |
| --------------------------------------- | ------------------------- | ---------------------------- |
| `@olicoad/neodt`                        | Native/global Temporal    | `Temporal.ZonedDateTime`     |
| `@olicoad/neodt/luxon`                  | `luxon`                   | `DateTime`                   |
| `@olicoad/neodt/moment`                 | `moment`                  | `Moment`                     |
| `@olicoad/neodt/dayjs`                  | `dayjs`                   | `Dayjs`                      |
| `@olicoad/neodt/date-fns`               | `date-fns`                | `Date`                       |
| `@olicoad/neodt/internationalized-date` | `@internationalized/date` | `ZonedDateTime`              |
| `@olicoad/neodt/spacetime`              | `spacetime`               | `Spacetime`                  |
| `@olicoad/neodt/temporal-polyfill`      | `temporal-polyfill`       | Its `Temporal.ZonedDateTime` |
| `@olicoad/neodt/js-temporal-polyfill`   | `@js-temporal/polyfill`   | Its `Temporal.ZonedDateTime` |
| `@olicoad/neodt/generic`                | Your explicit `adapter`   | Your adapter's value type    |

`referenceTime`, `value`, `defaultValue`, parser results, and `onValueChange` use the selected implementation's type. Mixing library types is a TypeScript error. Each configured entry exports concrete `NeodtProps` and `NaturalDateParseOptions` types. The parser accepts the adapter's native zone type: Luxon accepts `Zone` objects or strings; the other built-in adapters use string zone identifiers.

For custom configuration, use `/generic` with the adapter factory exported from the corresponding library entry (for example, `createLuxonAdapter` from `/luxon`). These factories accept your application's library instance and never register plugins or install a polyfill. The following examples show this explicit configuration; pass the resulting adapter to `<Neodt adapter={adapter} referenceTime={...} />` imported from `/generic`.

### Luxon

The `/luxon` entry uses the reference value's zone, including Luxon `Zone` objects. Install `luxon` and, for TypeScript, `@types/luxon`.

### Moment.js

```ts
import moment from "moment-timezone";
import { createMomentAdapter } from "@olicoad/neodt/moment";

const adapter = createMomentAdapter(moment, { zone: "Australia/Sydney" });
```

Moment.js handles system-local and fixed-offset editing. Install and supply `moment-timezone` for named-zone editing outside the system zone. Without a configured zone, the adapter reads the value's named zone, fixed offset, or system zone. Input Moment values are never mutated.

### Day.js

```ts
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { createDayjsAdapter } from "@olicoad/neodt/dayjs";

dayjs.extend(utc);
dayjs.extend(timezone);
const adapter = createDayjsAdapter(dayjs, { zone: "Australia/Sydney" });
```

Day.js uses the configured zone, defaulting to the system zone. Register the `utc` plugin for fixed-offset output and both `utc` and `timezone` for IANA-zone output. System-local editing needs neither plugin. The adapter does not inspect Day.js's private timezone metadata. Day.js timezone parsing has limitations for years 1–99; incremental year entry can encounter these because partial digits are valid draft years. Luxon and Temporal support these drafts.

### date-fns

```ts
import { toDate, constructNow } from "date-fns";
import { createDateFnsAdapter } from "@olicoad/neodt/date-fns";

const adapter = createDateFnsAdapter(toDate, { zone: "Australia/Sydney" });
```

Native `Date` values store instants, so configure their editing zone explicitly or use the default system zone. Install both `date-fns` and `@date-fns/tz`: calendar operations use date-fns with `TZDate` for the configured zone. A Date's own local getters still use the system zone. For a Date subclass, pass `createDateFnsAdapter<MyDate>(ms => new MyDate(ms), options)`.

### Spacetime

```ts
import spacetime from "spacetime";
import { createSpacetimeAdapter } from "@olicoad/neodt/spacetime";

const adapter = createSpacetimeAdapter(spacetime);
```

The adapter reads the value's timezone. Named zones and timezone rules come from your Spacetime installation. Fixed-offset outputs use an equivalent non-DST zone in Spacetime's database; unsupported offsets throw instead of silently changing the clock.

### Temporal: native, polyfill, or ponyfill

The default entry uses the global `Temporal` implementation without importing any datetime package:

```tsx
import Neodt from "@olicoad/neodt";

<Neodt referenceTime={Temporal.Now.zonedDateTimeISO("Australia/Sydney")} />;
```

Your runtime must provide Temporal, either natively or through a global polyfill installed by your application. TypeScript projects need global Temporal declarations (for example, `lib: ["ESNext", "DOM"]` with TypeScript 6 or later). Importing the entry alone does not read or modify the global.

For runtimes without Temporal, install `temporal-polyfill` and use its dedicated entry:

```tsx
import Neodt, { parseNaturalDate } from "@olicoad/neodt/temporal-polyfill";
import { Temporal } from "temporal-polyfill";

const referenceTime = Temporal.Now.zonedDateTimeISO("Australia/Sydney");
const tomorrow = parseNaturalDate("tomorrow 9am", { referenceTime });
<Neodt referenceTime={referenceTime} defaultValue={tomorrow} />;
```

For `@js-temporal/polyfill`, use `@olicoad/neodt/js-temporal-polyfill` and import `Temporal` from `@js-temporal/polyfill`. Both entries use their package’s Temporal export and leave global Temporal unchanged. The `temporal-polyfill` package uses native Temporal when available and its own implementation otherwise. For another implementation or a custom build, use `/generic` with `createTemporalAdapter(Temporal)` exported from the root and both polyfill entries. The factory uses structural types; the root entry requires native Temporal declarations, while the polyfill entries use their package’s types.

This zoned control does not accept `PlainDateTime` or `Instant` directly; convert them to a `ZonedDateTime` first. Editing uses the ISO/Gregorian calendar and minute precision.

### Custom adapters

```tsx
import Neodt, { parseNaturalDate, type DateAdapter } from "@olicoad/neodt/generic";

import { createDateFnsAdapter } from "@olicoad/neodt/date-fns";
import { toDate, constructNow } from "date-fns";

const adapter: DateAdapter<Date> = createDateFnsAdapter(toDate, { zone: "UTC" });
const referenceTime = constructNow(0);
const tomorrow = parseNaturalDate("tomorrow", { adapter, referenceTime });
<Neodt adapter={adapter} referenceTime={referenceTime} defaultValue={tomorrow} />;
```

The generic entry requires an explicit adapter and exports `NeodtProps<T, TZone>` and `NaturalDateParseOptions<T, TZone>`. Use it with your own adapter or a configured built-in factory. It has no datetime dependencies.

Reuse a built-in factory as above, or implement `DateAdapter<T, TZone>` by delegating these non-mutating operations to your library:

| Methods                                                   | Responsibility                                                         |
| --------------------------------------------------------- | ---------------------------------------------------------------------- |
| `toEpochMilliseconds`, `fromEpochMilliseconds`, `getZone` | Preserve instants and native zones at the boundary.                    |
| `getFields`, `fromFields`, `setFields`                    | Read, construct, and edit ISO/Gregorian fields (months 1–12).          |
| `add`, `startOf`                                          | Calendar/elapsed arithmetic and minute/day/month boundaries.           |
| `getWeekday`, `getDaysInMonth`                            | Monday-based weekday (1–7) and library-provided month length.          |
| `getOffset`                                               | Minutes east of UTC at the selected instant, used by `showTimeOffset`. |
| `setZoneId`                                               | Convert an instant to a zone explicitly named in parser input.         |
| `formatToParts`                                           | Locale presentation; Intl may be used here.                            |
| `isOffsetFixed` (optional)                                | Let layout measurement know the offset cannot vary by date.            |

Zones may be strings or opaque objects. The core retains the native zone and never converts it to a string. `getZoneId` is no longer part of the contract. Custom Temporal implementations must provide `ZonedDateTime.from` and the standard value operations as well as `Instant.fromEpochMilliseconds`.

Calendar arithmetic, month lengths, UTC offsets, and timezone resolution belong to the selected library. neodt parses input syntax and checks field ranges using the library's month length; it does not implement timezone transitions or Gregorian arithmetic. Native JavaScript `Date` access is confined to adapters whose library APIs require it (date-fns and `@internationalized/date`). Luxon supplies its own format parts; other adapters prepare formatting timestamps through their selected library. The shared core does not construct or manipulate native dates. Luxon and Temporal preserve the original editor's calendar-day versus elapsed-hour behavior, month/year clamping, and repeated-time editing. Other adapters inherit their library's rules and limitations, including Spacetime's handling of nonexistent local times. Offsetless ISO input is interpreted in the reference zone.

### Migrating from 0.2

Change existing Luxon imports to `@olicoad/neodt/luxon` and install Luxon in your application. No `adapter` prop is needed. `NeodtProps` and `NaturalDateParseOptions` from `/luxon` remain concrete Luxon types. The root import now uses native Temporal. For explicit adapters, import from `/generic` and use its generic prop/parser types. Parser `zone` values use the selected adapter's native type and can be omitted to use the reference's zone; existing Luxon `Zone` objects still work.

## Documentation

- [Getting started](https://neodt.olisworld.com/#/docs/getting-started)
- [Datetime libraries](https://neodt.olisworld.com/#/docs/libraries) — polyfills, library imports, timezone configuration, and custom adapters
- [API reference](https://neodt.olisworld.com/#/docs/api)
- [Live styling gallery](https://neodt.olisworld.com/#/docs/styling) — editable CSS, copy/reset, synced width grips, and shared formatting controls
- [Keyboard and natural language](https://neodt.olisworld.com/#/docs/interaction)

## API

`referenceTime: T` is required; `T` is determined by the import path. Only `/generic` also requires `adapter: DateAdapter<T, TZone>`. The reference provides the timezone, is used to fill empty segments, and determines how two-digit years are interpreted. Selected values are always normalized to this zone.

| Prop                                         | Description                                                          |
| -------------------------------------------- | -------------------------------------------------------------------- |
| `value?: T \| null`                          | Controlled value. Pass `null` to clear the field.                    |
| `defaultValue?: T`                           | Initial uncontrolled value.                                          |
| `onValueChange?: (value: T \| null) => void` | Called after a complete value is changed or cleared.                 |
| `locale?: Intl.LocalesArgument`              | Locale for segment order and labels. Defaults to the browser locale. |
| `formatOptions?: Intl.DateTimeFormatOptions` | Formatting options, including `hour12` and `hourCycle`.              |
| `showTimeOffset?: boolean`                   | Shows the selected date's UTC offset.                                |
| `readonly?: boolean`                         | Displays a value without allowing edits.                             |
| `disabled?: boolean`                         | Prevents focus and editing.                                          |
| `calendarIcon?: JSX.Element`                 | Replaces the native date-time picker button icon.                    |
| `magicIcon?: JSX.Element`                    | Replaces the natural-language entry button icon.                     |

Controlled updates from the parent replace the displayed draft; setting `value` to `null` clears every segment. During editing, incomplete segments emit `null` while retaining the local draft. Echoing emitted values through `onValueChange` preserves ongoing numeric entry.

All standard `span` attributes, including `class`, `classList`, and ARIA attributes, are forwarded to the root element. This is a JavaScript-managed SPA control and does not provide native form submission.

The control supports mouse, touch, and keyboard editing: Arrow Left/Right move between segments, Arrow Up/Down change a segment, and numeric input replaces numeric segments. Space opens the native picker; `@` opens natural-language input. Natural-language input accepts a single point in time, such as `tomorrow 9:30am`, `in 2 hours`, or `5pm America/New_York`; date ranges are not supported.

## Styles

Every component entry imports the component CSS, so Vite and standard Solid build setups need no extra configuration. For applications that exclude dependency side effects, or that centralize stylesheet imports, import the public stylesheet explicitly:

```tsx
import "@olicoad/neodt/style.css";
import Neodt from "@olicoad/neodt";
```

Set theme variables on a class applied to the component, after the default stylesheet. Defaults are declared on the root itself, so ancestor variables alone do not override them:

```css
.booking-time {
  --datetime-neo-background: #15251d;
  --datetime-neo-foreground: #f6f0dd;
  --datetime-neo-border: #789271;
  --datetime-neo-focus: #d4a529;
  --datetime-neo-highlight-foreground: #fff;
}
```

The root has the `datetime-neo` class. Useful internal hooks include `datetime-neo__segment`, `datetime-neo__separator`, and `datetime-neo__trigger`.

## Utilities

The natural-language parser and completion helper are public exports for building adjacent UI:

```ts
import {
  getNaturalDateCompletions,
  parseNaturalDate,
  type NaturalDateCompletion,
  type NaturalDateParseOptions,
} from "@olicoad/neodt";
```

`parseNaturalDate(value, { referenceTime, zone?, locale? })` returns the selected implementation’s value type or `undefined`. `zone` defaults to the reference’s zone and accepts the adapter’s native zone type. Import the parser and `NaturalDateParseOptions` from the same entry as your component. The `/generic` parser additionally requires `adapter` and exports `NaturalDateParseOptions<T, TZone>`. `getNaturalDateCompletions(value, maximum?)` returns completion labels and replacement text.

## Development

Use Node.js 24 or later and pnpm 11 or later.

```bash
pnpm install
pnpm dev
```

The demo is served at `http://localhost:3000`. Validate changes with:

```bash
pnpm exec playwright install --with-deps chromium firefox webkit
pnpm check:release
pnpm pack --dry-run
```

`pnpm check` runs non-mutating formatting, lint, type, unit/SSR, docs builds, and isolated consumer type/bundle checks. `pnpm test:browser` checks real layouts in Chromium, Firefox, and WebKit. See [layout testing](docs/layout-testing.md) for CSS invariants and debugging, and [release preparation](docs/releasing.md) for the v1 checklist.

## Publishing And Deployment

GitHub Actions publishes the npm package when a pushed `v*` tag exactly matches `package.json`'s version. Vercel deploys the linked GitHub repository: commits to `main` create production deployments and pull requests create preview deployments.

### Release procedure

1. Set the intended version in `package.json` and update `pnpm-lock.yaml` with `pnpm install --lockfile-only`.
2. Run `pnpm check:release && pnpm pack --dry-run`.
3. Commit the release, push it to `main`, then create and push the matching annotated tag. eg For the first release:

```bash
git tag -a v0.1.0 -m "Release v0.1.0"
git push origin v0.1.0
```

The `Publish npm package` workflow verifies the tag/version match, validates the package, and publishes it with npm provenance. Vercel handles demo deployments through its Git integration.

## Further Development

Some features that could be interesting to explore:

### Min/Max Datetimes

Enforce picked datetimes between optional minimum and maximum props.

### Precision and Step Size

Support configurable precision and step size:

- Seconds
- Milliseconds
- Date-only values
- Step size

### Other Frameworks

Not every project will want to install Solid. Zag or Mitosis may help make the component framework agnostic.
