# neodt

A locale-aware, keyboard-editable segmented date and time input for Solid.

**Links**: [GitHub](https://github.com/olivercoad/neodt) | [Issues](https://github.com/olivercoad/neodt/issues) | [Demo](https://neodt.olisworld.com)

## Install

```bash
pnpm add @olicoad/neodt
```

## Usage

```tsx
import { DateTime } from "luxon";
import Neodt from "@olicoad/neodt";

function Appointment() {
  const [value, setValue] = createSignal<DateTime | null>(null);

  return (
    <Neodt
      referenceTime={DateTime.now().setZone("Australia/Sydney")}
      locale="en-AU"
      value={value()}
      onValueChange={setValue}
    />
  );
}
```

## API

`referenceTime: DateTime` is required. It provides the timezone, is used to fill empty segments, and determines how two-digit years are interpreted. Selected values are always normalized to this zone.

| Prop                                                | Description                                                          |
| --------------------------------------------------- | -------------------------------------------------------------------- |
| `value?: DateTime \| null`                          | Controlled value. Pass `null` to clear the field.                    |
| `defaultValue?: DateTime`                           | Initial uncontrolled value.                                          |
| `onValueChange?: (value: DateTime \| null) => void` | Called after a complete value is changed or cleared.                 |
| `locale?: Intl.LocalesArgument`                     | Locale for segment order and labels. Defaults to the browser locale. |
| `formatOptions?: Intl.DateTimeFormatOptions`        | Formatting options, including `hour12` and `hourCycle`.              |
| `showTimeOffset?: boolean`                          | Shows the selected date's UTC offset.                                |
| `readonly?: boolean`                                | Displays a value without allowing edits.                             |
| `disabled?: boolean`                                | Prevents focus and editing.                                          |
| `calendarIcon?: JSX.Element`                        | Replaces the native date-time picker button icon.                    |
| `magicIcon?: JSX.Element`                           | Replaces the natural-language entry button icon.                     |

All standard `span` attributes, including `class`, `classList`, and ARIA attributes, are forwarded to the root element. This is a JavaScript-managed SPA control and does not provide native form submission.

The control supports mouse, touch, and keyboard editing: Arrow Left/Right move between segments, Arrow Up/Down change a segment, and numeric input replaces numeric segments. Space opens the native picker; `@` opens natural-language input. Natural-language input accepts a single point in time, such as `tomorrow 9:30am`, `in 2 hours`, or `5pm America/New_York`; date ranges are not supported.

## Styles

The main `neodt` entry imports the component CSS, so Vite and standard Solid build setups need no extra configuration. For applications that exclude dependency side effects, or that centralize stylesheet imports, import the public stylesheet explicitly:

```tsx
import "@olicoad/neodt/style.css";
import Neodt from "@olicoad/neodt";
```

Scope theme variables on the component or an ancestor:

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

`parseNaturalDate(value, options)` returns a Luxon `DateTime` or `undefined`. Its options require `referenceTime` and `zone`, with an optional `locale`. `getNaturalDateCompletions(value, maximum?)` returns completion labels and replacement text.

## Development

Use Node.js 24 or later and pnpm 11 or later.

```bash
pnpm install
pnpm dev
```

The demo is served at `http://localhost:3000`. Validate changes with:

```bash
pnpm check
pnpm build
pnpm pack --dry-run
```

## Publishing And Deployment

GitHub Actions publishes the npm package when a pushed `v*` tag exactly matches `package.json`'s version. Vercel deploys the linked GitHub repository: commits to `main` create production deployments and pull requests create preview deployments.

### Release procedure

1. Set the intended version in `package.json` and update `pnpm-lock.yaml` with `pnpm install --lockfile-only`.
2. Run `pnpm check && pnpm build && pnpm pack --dry-run`.
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

### Temporal API

- Take an optional peer dependency on `temporal-polyfill`, importing from `temporal-polyfill/fns`.
- OR, accept a Temporal ponyfill through a prop.
- Consider if we could support multiple datetime adapters without consumers having to bundle them all
- Support Plain mode as well as the existing Zoned mode.

### Precision and Step Size

Support configurable precision and step size:

- Seconds
- Milliseconds
- Date-only values
- Step size

### Other Frameworks

Not every project will want to install Solid. Zag or Mitosis may help make the component framework agnostic.
