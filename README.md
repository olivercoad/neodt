# neodt

A configurable, locale-aware segmented date and time input for Solid SPAs.

## Install

```bash
pnpm add neodt solid-js
```

## Usage

```tsx
import { DateTime } from 'luxon'
import Neodt from 'neodt'

function Appointment() {
  return (
    <Neodt
      referenceTime={DateTime.fromISO('2026-08-17T12:00:00Z')}
      locale="en-GB"
      onValueChange={value => console.log(value)}
    />
  )
}
```

`referenceTime` is required and supplies the timezone, as well as the date and time used for empty values and interpreting two-digit years. `value`, `defaultValue`, and `onValueChange` use Luxon `DateTime` instances. A controlled `null` value clears the field; `onValueChange` receives `null` when the user clears it. Values are normalized to the timezone of `referenceTime`. Use `value` with `onValueChange` for controlled usage, or `defaultValue` for uncontrolled usage.

The component is intended for JavaScript-managed SPA state and does not include native form submission. The visible field uses locale-ordered date/time segments. Click a segment to select it, use left/right arrow keys to move between segments, up/down to increment or decrement the selected value, and type numeric values to replace numeric segments. Click the calendar button, or press Space while a segment is focused, to open the browser's native date-time picker. Click the magic button, or press `@` while a segment is focused, to enter natural-language date entry. It uses neodt's Luxon-backed parser for dates, relative expressions, holidays, and first-class clock values such as `tomorrow 9:30am`, `in 2 hours`, and `5pm America/New_York`. It parses a single point only; ranges are intentionally unsupported. Pass `calendarIcon` or `magicIcon` as a `JSX.Element` to replace the respective default icon.

## Styling

The package imports its base CSS automatically. Customize it with CSS variables:

```css
.booking-time {
  --datetime-neo-background: #15251d;
  --datetime-neo-foreground: #f6f0dd;
  --datetime-neo-border: #789271;
  --datetime-neo-focus: #d4a529;
}
```

Use `class` and `classList` normally. Editable portions use the `datetime-neo__segment` class and locale punctuation uses `datetime-neo__separator`.

## Development

Install dependencies with pnpm, then start the interactive demo at `http://localhost:3000`:

```bash
pnpm install
pnpm dev
```

The demo in `dev/` exercises locale formatting, controlled values, segment editing, and CSS-variable theming.

Use the following commands to validate local changes:

```bash
pnpm lint           # Library TypeScript and ESLint checks
pnpm test           # Client and SSR tests
pnpm dev:typecheck  # Demo TypeScript check
pnpm dev:build      # Production build for the demo
pnpm build          # Package distribution build
pnpm check          # All of the above validation except the package build
```
