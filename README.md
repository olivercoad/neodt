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

neodt supports different datetime libraries through dedicated package entries. The import path selects the library for both `Neodt` and `parseNaturalDate`, including their native value and timezone types. Only the selected library is loaded; datetime packages are optional peer dependencies.

See [Datetime libraries](https://neodt.olisworld.com/#/docs/libraries) for available integrations, installation, examples, and timezone configuration. Use `/generic` with an explicit adapter for custom configuration.

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
| `createFormatter`                                         | Reusable locale presentation; returns `formatToParts(value)`.          |
| `isOffsetFixed` (optional)                                | Let layout measurement know the offset cannot vary by date.            |

`createFormatter(zone, locale, options)` returns an object with `formatToParts(value)`. The core reuses these objects across values, including DST transitions, using a weakly keyed adapter cache with at most 32 entries per adapter. Entries are keyed by zone (object identity for opaque zones), locale, and format options, and the least recently used entry is evicted when the limit is reached.

Zones may be strings or opaque objects. Custom Temporal implementations must provide `ZonedDateTime.from` and the standard value operations as well as `Instant.fromEpochMilliseconds`.

Calendar arithmetic, month lengths, UTC offsets, and timezone resolution belong to the selected library. Every adapter follows its library's semantics for calendar-day versus elapsed-hour arithmetic, month/year overflow, and ambiguous or nonexistent local times.

neodt parses input syntax and checks field ranges using the library's month length; it does not implement timezone transitions or Gregorian arithmetic. Native JavaScript `Date` access is confined to adapters whose library APIs require it (date-fns and `@internationalized/date`). Luxon supplies its own format parts. Temporal, date-fns, Day.js, and `@internationalized/date` format the actual instant and zone with Intl. Moment and Spacetime retain their own timezone offsets when formatting because their timezone databases can differ from Intl. The shared core does not construct or manipulate native dates. Offsetless ISO input is interpreted in the reference zone.

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

To add a datetime library, see [adding integrations](docs/adding-a-library.md).

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
3. Commit the release, push it to `main`, then create and push an annotated `v<version>` tag matching `package.json` exactly.

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
