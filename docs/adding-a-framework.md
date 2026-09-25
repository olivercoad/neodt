# Adding a frontend framework

The framework registry (`frameworks.ts`) and datetime registry (`libraries.ts`) are independent. Their cross product drives generated component entries, public exports, demo routes, package-consumer checks, and test matrices. There are no handwritten framework/library pairs.

1. Install the framework and its build/type tooling as development dependencies. Declare consumer runtime packages as optional peers. Consumers install their selected framework and datetime library only.
2. Add `frameworks/<id>/generic.ts` (or `.tsx`). This is the native framework boundary: compose `CoreProps<T, TZone>` with native root attributes/slots, allocate a hydration-safe ID, create one controller per component instance, subscribe to its immutable snapshots, update its props, and clean up subscriptions and browser effects. Keep library instances out of deep reactive proxies. Export `Neodt`, `NeodtProps`, `configureNeodt`, and the shared parser/public utilities. Use the React and Vue bindings as contrasting examples. Editing behavior belongs in `src/core/controller.ts`; rendering belongs in `src/components/*.lite.tsx`.
3. Supply the small integration modules in the same directory:
   - `tooling.ts`: export a default object satisfying `FrameworkTooling` from `../tooling.ts`. This single configuration serves development, tests, package builds, and isolated consumer checks. See the defaults and hooks below.
   - `demo.ts`: export a `mount` function satisfying `DemoRenderer` from `../../dev/framework-host` (a type-only import). Implement native mount/update/dispose operations; the Vite plugin supplies the documentation-shell wrapper. Solid uses its component directly and needs no demo module. The site shell does not become a dependency of the published control.
   - `test.ts` / `.tsx`: native server rendering, client mounting and hydration.
   - `example.ts`: framework-native documentation examples using the shared library metadata.
   - `tsconfig.json` and any asset declarations needed by the binding.
4. Register its ID, label, Mitosis generator/options, source/output extensions, runtime/type dependencies, JSX settings, code language, and example function in `frameworks.ts`. Do not import framework runtimes into registry metadata. The framework and library dropdowns and Frameworks page derive from this registration.
5. Run `pnpm generate`, `pnpm check`, and `pnpm test:browser`. Inspect generated code and actual behavior; Mitosis target support alone does not establish neodt compatibility. The browser layout suite and framework contract suites include each registration automatically.

`pnpm dev`, Vite/Vitest invocations, and package builds generate components automatically. Editing a `.lite.tsx` file while the demo server is running regenerates all targets and reloads the page. Generated files live in ignored `generated/<id>/` directories and are never edited by hand. Pin the Mitosis version; validate all targets before upgrading it.

## Tooling defaults and hooks

An ordinary JSX target starts with `export default {} satisfies FrameworkTooling`. The shared tooling uses registry metadata for package output extensions, automatic JSX transforms, and consumer source extensions. Consumer checks default to `tsc`, JSX fixtures that verify callback inference and reject mixed datetime types, and no extra Vite plugins.

Override only the pieces the framework needs:

- `plugins({ mode, include })`: compiler plugins shared by the demo, client/server tests, and isolated consumers. `mode` is `development`, `client-test`, `server-test`, or `consumer`. `include` scopes transforms to the framework's source and generated directories; consumer mode must compile the isolated consumer and installed package instead. Solid demonstrates this distinction. Vue uses the same compiler plugin in all modes.
- `build`: tsdown overrides, such as React's `"use client"` banner or Vue's native asset handling. The shared build supplies entrypoints, dependencies, declarations, and output paths.
- `consumer`: override `compiler`, `extension`, `render(generic, callback)`, or `wrap(script)` for non-JSX syntax. Preserve positive callback-inference checks and negative mixed-value checks for configured and `/generic` entries. Vue demonstrates template fixtures.

Keep this Node-only tooling separate from `frameworks.ts`: the metadata registry also runs in the documentation browser. Adding a framework requires no edits to Vite, Vitest, tsdown, or the package-check runner.

The shared view uses stable primitive keys, preserving editable DOM nodes and focus in every registered framework. The controller owns synchronous editing transitions and emits snapshots; framework state stores only the latest snapshot. Native DOM listeners handle keyboard, clipboard, input, and focus events consistently. Root click/mousedown handlers are composed with the consumer's native handlers at the binding boundary.

Mitosis 0.14 does not emit Solid unmount hooks, so the Solid binding explicitly disposes the controller. Shared `onUpdate` hooks include dependencies because that generator requires them. React uses correctly cased DOM properties (`readOnly`, `contentEditable`, etc.). Custom icons enter the shared view as component functions; bindings expose native JSX nodes or Vue slots.

Vue's generic public call signature includes its typed template context so `vue-tsc` can infer callback values from custom adapters. Consumer checks compile both Vue templates and generated documentation examples. The Vue compiler uses a scoped TypeScript 6 dependency because vue-tsc needs the JavaScript compiler API, which TypeScript 7 does not supply. The project's ordinary type checker remains TypeScript 7.

Support is intended for DOM-based frontend frameworks. A Mitosis target for a non-DOM platform would also require a platform-specific input, measurement, and accessibility design.

Svelte uses a Svelte 5 rune-based binding and ships native `.svelte` files alongside shared controller modules. Its public generic declaration includes the isomorphic constructor signature required by Svelte template tooling. Svelte and Vue type checkers use TypeScript 6 through the scoped `.pnpmfile.cjs` dependency hook; the main project stays on TypeScript 7.

Angular currently ships runtime-compiled standalone components with a single typed `props` input. Consumer examples use `NgComponentOutlet`, allowing an AOT application to instantiate the runtime component. The compiler is an optional peer for the package and required when using Angular entries. Angular SSR and hydration are covered by the native server and browser fixtures. The Angular generation hook corrects Mitosis DOM property bindings, attribute removal, dependency injection, and mount timing. Keep those corrections covered by browser and binding tests when upgrading Mitosis.

Tooling may also supply `transformGenerated(source)` for target-specific generator corrections, additional `build.entry` modules needed by native assets, and `consumer.compilerArgs(directory)` for checkers with different CLI flags.
