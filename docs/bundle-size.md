# Bundle size and runtime investigation

Measured on 2026-09-28. The historical package is the published `@olicoad/neodt@0.2.0`
tarball, pinned as the development-only `neodt-v02` alias. It is the only published
0.2.x release. “Before” means this repository at `a1f7be9655cad1b9cb037a22bbe9dc4b75edc84d`.

## Solid + Luxon: effective contribution

Each fixture is a production browser application built with Vite 8.2.2,
vite-plugin-solid 2.11.14, Oxc minification, Lightning CSS and an ES2022 target.
Both Neodt versions use the same Solid 1.8.17 and Luxon 3.7.2 installations.
The application mounts one control and uses `DateTime.now()` and `toISO()`.

To measure the contribution to an app **already using Solid and Luxon**, subtract
a baseline app that renders a date string with those same dependencies. Compress
the complete JavaScript bundles before subtracting; add the separately compressed
CSS. This includes any additional Solid/Luxon functionality retained by Neodt.
It is a reproducible app-specific delta, not an intrinsic or universal package size.
Source maps, declarations and unused published files are excluded.

| Effective contribution |        0.2.0 |       Before |        After |
| ---------------------- | -----------: | -----------: | -----------: |
| Minified JS            |     34,762 B |     44,620 B |     44,166 B |
| JS, gzip               |     12,354 B |     15,413 B |     15,255 B |
| Minified CSS           |     11,303 B |     10,879 B |     10,879 B |
| CSS, gzip              |      2,237 B |      2,149 B |      2,149 B |
| **JS + CSS, gzip**     | **14,591 B** | **17,562 B** | **17,404 B** |
| JS + CSS, Brotli       |     12,945 B |     15,582 B |     15,429 B |

The complete current control contributes **17.00 KiB gzip**, versus **14.25 KiB**
for 0.2.0: **2.75 KiB / 19.3% larger**. The baseline app is 79,850 B minified JS
(25,310 B gzip); the complete current app is 124,016 B (40,565 B gzip), plus CSS.
This gap includes the framework-independent controller, generated rendering,
adapter bridge and other changes since 0.2.0. It cannot all be attributed to
supporting extra date libraries.

## Tree-shaking

Other frameworks and date-library implementations do not contribute to the chosen
entry's bundle. The regression checks cover all 7 frameworks × 9 date libraries,
using **the actual npm tarball** with only the selected peers installed. They check
types, examples, parsed dependencies, retained modules and utility-only bundles.

There was unnecessary retention within the selected entry: bundling utility code
into the same module as UI/CSS, plus unannotated configuration calls, prevented
effective removal before the framework compiler/minifier ran. Keeping modules
separate and marking discardable factory calls pure fixes this.

| Solid/Luxon import fixture          | Before minified JS | After minified JS | After gzip JS |
| ----------------------------------- | -----------------: | ----------------: | ------------: |
| `getNaturalDateCompletions`         |            7,041 B |             656 B |         365 B |
| `createLuxonAdapter` (factory only) |           86,427 B |           1,134 B |         651 B |
| `parseNaturalDate` with Luxon       |           86,475 B |          79,871 B |      25,312 B |

These utility fixtures previously also emitted 10,879 B CSS (2,149 B gzip); they
now emit none. Completions and the adapter factory retain neither Solid nor Luxon.
The parser retains Luxon, as expected. An unused import retains no library code
or CSS. The full control still automatically includes its styles.

Preserved Vanilla dependency modules are emitted under `vendor`, because npm
excludes directories named `node_modules` even inside `dist`. Strict TypeScript
consumers also receive declarations for the preserved CSS imports.

## Core changes and remaining opportunities

The standalone framework-independent controller, including its parser, calendar
bridge and formatting helpers, went from **24,952 B to 24,473 B minified**, and
**9,481 B to 9,296 B gzip** (2.0%). No features were removed.

- Replace the nonreactive `createSignal` imitation with ordinary mutable local
  variables. Explicit memo dependencies and snapshot publication still control
  updates; there is no hidden reactivity to preserve.
- Store an adapter and native value directly in the calendar wrapper. Methods
  live on its prototype instead of allocating an operations object and a set of
  closures for every wrapped date. Opaque zone types remain private and type-safe.
- Preserve the bounded formatter cache and derived-value memoization. Removing
  these might save code but would add expensive work to editing and rendering.

The full control always uses natural-language entry, layout measurement,
formatting and editing logic, so tree-shaking cannot remove those paths just
because a particular user does not interact with them. A materially smaller
control likely needs a separate feature composition boundary, such as an opt-in
natural-language UI/parser. Lazy loading would reduce initial download but add
first-use latency and asynchronous states; explicit opt-in modules would avoid
that latency but expand the public API. Neither tradeoff is introduced here.

Another worthwhile runtime investigation is eliminating the conversion from a
calendar value to a local ISO string and back during formatting. That should be
designed around preserving minute precision, invalid-date handling, locale and
DST behavior, with measurements before accepting it.

## Runtime results

With Node 24.13.1 and Luxon 3.7.2, the comparison against the starting revision
gave the following warmed medians. Both implementations are compiled with the
same production minifier and use the same dates, locale and timezone.

| Operation                                    |   Before |    After |
| -------------------------------------------- | -------: | -------: |
| Create controller and initial snapshot       | 217.7 µs | 203.5 µs |
| Update controlled value and compute snapshot |  48.0 µs |  41.8 µs |
| Update unchanged props                       | 0.197 µs | 0.178 µs |
| Parse natural-language date                  |  36.4 µs |  32.9 µs |

Creation improved about 6.5%, value updates 13.0%, and parsing 9.6% in this run.
These are local microbenchmarks with warm caches, not end-to-end browser latency
or a comparison with 0.2.0's runtime. They exclude framework rendering, layout,
DOM events and network loading. An earlier run also improved those three paths,
but the percentages varied with machine load. Treat small differences cautiously.

Validation passed: 1,620 client tests, 67 SSR tests, all 63 packed-package
framework/library combinations, type checking, lint and formatting. The 297
targeted Chromium/Firefox/WebKit tests cover edits and mode switches for every
framework/library pair with a polyfilled or library-backed date implementation,
framework hydration, Solid/Luxon layout and the Luxon formatting gallery. The
full 7,773-test browser suite was not completed.

## Reproduce

```sh
pnpm test:bundle
pnpm test:package
pnpm bench:core a1f7be9655cad1b9cb037a22bbe9dc4b75edc84d
```

`test:bundle` prints raw, gzip and Brotli bytes and asserts that utility imports
drop UI, styles and unused peers. `test:package` also runs the full isolated
consumer matrix. `bench:core` compares the working tree with a git revision using
the same Node and Luxon, warms both implementations, alternates execution order,
and reports the median of nine samples. Garbage collection runs outside timed
regions. Runtime measurements are diagnostic, not machine-dependent CI gates.
