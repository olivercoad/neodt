# Adding a datetime library

Each library has one implementation in `src/libraries/` and one metadata registration in `libraries.ts`. The registry drives configured entries for every registered framework, documentation/examples, demo URLs, unit/SSR/browser matrices, and isolated consumer checks.

1. Install the datetime package as a development dependency and optional peer. Include companion packages and any separate type package. Demo-only dependencies belong in `devDependencies`.
2. Create `src/libraries/<id>.ts`. Start with `luxon.ts` or `temporal-polyfill.ts`. Implement the non-mutating `DateAdapter<T, TZone>` operations, export the factory, and call `configureDate` to export the configured `adapter` and `parseNaturalDate`. Export the concrete `NaturalDateParseOptions` alias and re-export `../public`. The file must not import a frontend framework.
3. Export `integration` with `defineIntegration`, retaining `@internal` and `/* @__PURE__ */` annotations. Supply an adapter creator, native-zone conversion, optional demo/test `setup`, and independently established library-specific `behavior` expectations. No component belongs in this metadata.
4. Add the metadata entry in `libraries.ts`: ID matching the filename, label, public entry suffix, packages, example imports, current-value expression, native value type, factory name/argument, and a consumer-check callback using a native value method. Optional fields cover homepage, type packages, and demo-only dependencies.
5. Run `pnpm check` and `pnpm test:browser`. Generation runs automatically as part of the checks. There are no framework-specific entries to maintain by hand.

Public imports take the form `@olicoad/neodt/<framework>/<library>`. The framework root uses native Temporal; `/generic` requires an explicit adapter. The build combines each library's adapter with each framework's typed binding while preserving value/zone inference.

Keep registration metadata free of datetime implementation imports. The navigation can list all integrations without loading their runtimes. Every demo at `/<framework>/<library>/` selects one control target and one datetime implementation. The root demo uses Solid with temporal-polyfill. Consumer checks verify that unrelated frontend and datetime packages are not required or bundled.

The package-build transform removes the internal `integration` export and TypeScript's `stripInternal` removes its declaration, allowing demo initialization to be tree-shaken. Temporal implementations share `src/adapters/temporal.ts`; common Intl formatting lives in `src/adapters/intl-format.ts`.
