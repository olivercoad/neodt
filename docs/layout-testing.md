# Maintaining the layout

The layout is part of the component’s behaviour. Test it in a browser; jsdom does not perform layout and cannot establish whether rows, offsets, or action buttons fit.

## Run the checks

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install --with-deps chromium firefox webkit
pnpm check
pnpm test:browser
```

For a faster iteration, use `pnpm test:browser --project chromium`. For the interactive runner, use `pnpm test:browser --ui`. `pnpm check:release` runs the static checks, unit/SSR tests, documentation build, browser tests, and package build. `pnpm check` does not rewrite source files; run `pnpm format` to fix formatting explicitly.

The browser suite visits each library's own entry point (for example `/luxon/` or `/dayjs/`). Add `?fixture=layout` in development to render `dev/layout.tsx` with a fixed reference time, system fonts, and no saved demo settings. It uses the selected adapter and actual component stylesheet. The fixture is removed from production builds. Other query parameters select width, locale, offset, timezone, empty state, readonly/disabled state, and custom font metrics.

The top-navigation library selector performs a full navigation and preserves the current docs section. Each `dev/entries/` module imports only its selected library. The production build checks each entry's complete chunk graph for accidental cross-library imports; browser tests also check loaded script requests.

Unit suites share `test/helpers/adapters.ts`; configured entry-point tests and SSR share `test/helpers/entries.ts`. Common parser, keyboard, accessibility, controlled-state, calendar, and formatter-cache contracts run for all eight library implementations. Native Temporal runs in supporting browsers; its root entry is also exercised with an explicitly supplied global implementation in unit and SSR tests. Calendar expectations document native library differences instead of skipping whole adapters. Library-specific APIs (opaque Luxon zones, Date subclasses, non-Gregorian calendars) keep dedicated tests. Completion and placeholder animation helpers have no adapter dependency and run once.

## Contracts to preserve

- Hidden measurements mirror the **idle single-row** layout, including typography, separators, and trailing content. They must not wrap or make the parent scroll.
- The component picks one or two rows from available width and the widest measurement. Hover, focus, and natural-language entry must not independently change that choice.
- Actions reveal without increasing the control’s height or escaping its bounds. Their measured width is published as `--datetime-neo-actions-width`; consumers should not override it.
- Editing modes must also preserve the surrounding line box. The inline-flex control uses `vertical-align: middle` so changes to its internal baseline cannot grow its parent even when its own height stays constant. Gallery tests check the shadow host, preview container, and following preview position in both single-row and narrow layouts.
- Whole-hour offset minutes collapse in the appropriate idle/active state. Half- and quarter-hour offset minutes stay visible.
- Date/time rows, natural input, completion text, and the parsed preview share segment metrics. An empty parsed preview still occupies one line; native input minimum heights must not override a theme’s line-height.
- Segments and parsed previews occupy `1lh` plus theme padding. In browsers with text trimming, a `1cap` text box and equal block margins share that line height, centering the glyphs without relying on alignment inside a trimmed fixed-height box. Wrapped natural entry reserves two equal rows even when a theme hides the parsed result; action buttons inherit the control font so swapping icons cannot change the height.
- The natural input uses its native placeholder for sizing, while the completion overlay paints the placeholder using the same typography as suggestions. Check both empty and typed states; native placeholder baselines can differ from entered text.
- At very narrow widths, focusing a segment scrolls it into view inside the editor. The overflow mask must reflect whether more content is hidden at the end.
- Measurements can update after a font, locale, state, offset, or width change. Layout transitions are suspended while measurement changes settle, then restored. Reduced-motion users receive no transitions.

`src/styles.css` documents the measurement relationship at its entry point. The selectors around `data-wrapped`, hover/focus, and zero offset minutes intentionally differ. Avoid merging apparently similar rules without running the browser suite.

## What the tests assert

`test/browser/layout.spec.ts` checks rendered row coordinates, containment, focus scrolling, visibility/opacity, intrinsic heights, runtime font/locale changes, disabled/readonly states, natural entry, and reduced motion. Assertions poll observable results while transitions settle. A one-pixel tolerance accommodates fractional layout rounding; it should not conceal overlap or clipped content.

`test/browser/docs.spec.ts` checks navigation, live CSS isolation, copying and its fallback, reset, and mobile overflow. Unit tests cover parsing, keyboard editing, controlled state, and DOM structure.

On failure, Playwright saves a screenshot and trace in `test-results/`. Open `pnpm exec playwright show-report` or use `pnpm exec playwright show-trace <trace.zip>` to inspect the failing layout. These artifacts are uploaded by CI.

The suite uses geometry contracts and small painted-glyph bounds checks instead of golden pixel snapshots tied to one operating system and font rasteriser. The glyph checks use lining digits to distinguish visible centering from an equal-height line box. Add a regression assertion for the user-visible failure when fixing layout. For visual-only changes, inspect the fixture and styling gallery as well. Native OS picker surfaces, physical touch devices, and screen-reader output still need manual checks.
