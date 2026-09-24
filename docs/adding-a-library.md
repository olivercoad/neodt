# Adding a datetime library

Each library has one implementation file in `src/libraries/` and one metadata entry in the `registrations` array in `libraries.ts`. The registry drives package build entries and exports, documentation tables and examples, demo URLs, unit/SSR test matrices, browser matrices, and isolated consumer checks. No source generation command is needed.

1. Install the library as a development dependency and declare it as an optional peer in `package.json`. Include companion packages needed by the adapter, and install any separate type package. Demo-only dependencies belong in `devDependencies`.
2. Create `src/libraries/<id>.ts`. Start with `luxon.ts` for an ordinary adapter or `temporal-polyfill.ts` for another Temporal implementation. Implement the non-mutating `DateAdapter<T, TZone>` operations, export its factory, and use `configureNeodt` to export `Neodt`, its default export, and `parseNaturalDate`. Export concrete `NeodtProps` and `NaturalDateParseOptions` aliases and re-export `../public`.
3. In the same file, export `integration` through `defineIntegration`, following the existing `@internal` and `/* @__PURE__ */` annotations. Supply an adapter creator, a conversion from timezone IDs to the library's zone type, and the configured public entry. Optional asynchronous `setup` runs only in demos and test fixtures; use it for plugins or extra timezone data. Optional `behavior` records independently established expectations where the library differs from the shared calendar tests. Add dedicated regression tests for unique APIs when needed.
4. Add one registration entry in `libraries.ts`. Its `id` matches the filename and demo URL. Set the label, public entry suffix, required package names, example imports, current-value expression, value type, factory name, and factory implementation argument. The consumer-check callback should use a native value method/property to verify inferred types. Optional fields list the homepage, separate type packages, and demo-only packages.
5. Run `pnpm check` and `pnpm test:browser`.

Keep the registration metadata free of implementation imports. The documentation and navigation can then list every integration without loading datetime packages. The registry's example strings are compiled by the isolated consumer checks.

The Vite `libraryPages` plugin serves each `/<id>/` URL from `dev/index.html` and a virtual startup module. Production builds emit the same URLs, and the build graph check verifies that each page loads only its selected datetime packages. The root demo uses `temporal-polyfill`; the root package entry remains native Temporal.

Public entries are real TypeScript files. A small package-build transform removes the internal `integration` export, allowing its demo/test setup to be tree-shaken. TypeScript's `stripInternal` removes the corresponding declaration. The package checks verify that these internals do not appear in published entries and compile/bundle each entry in a consumer directory without unrelated datetime packages. Do not remove those annotations or export additional demo helpers.

Temporal integrations share `src/adapters/temporal.ts`; common Intl formatting lives in `src/adapters/intl-format.ts`. Reuse shared implementation code where it helps, while keeping library-specific configuration in its integration file.
