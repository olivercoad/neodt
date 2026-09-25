# Adding a frontend framework

The framework registry (`frameworks.ts`) and datetime registry (`libraries.ts`) are independent. Their cross product drives generated component entries, public exports, demo routes, package-consumer checks, and test matrices. There are no handwritten framework/library pairs.

1. Install the framework and its build/type tooling as development dependencies. Declare consumer runtime packages as optional peers. Consumers install their selected framework and datetime library only.
2. Add `frameworks/<id>/generic.ts` (or `.tsx`). This is the native framework boundary: compose `CoreProps<T, TZone>` with native root attributes/slots, allocate a hydration-safe ID, create one controller per component instance, subscribe to its immutable snapshots, update its props, and clean up subscriptions and browser effects. Keep library instances out of deep reactive proxies. Export `Neodt`, `NeodtProps`, `configureNeodt`, and the shared parser/public utilities. Use the React and Vue bindings as contrasting examples. Editing behavior belongs in `src/core/controller.ts`; rendering belongs in `src/components/*.lite.tsx`.
3. Supply the small integration modules in the same directory:
   - `build.ts`: tsdown settings or plugins for the target's output format; copy compiler-native assets when required.
   - `vite.ts`: plugins for compiling this target's generated components in the demo and test runners. Scope JSX transforms to this framework's directories.
   - `demo.ts`: adapt the target's mount/update/dispose operations to the Solid documentation shell using `frameworkHost`. The site shell does not become a dependency of the published control.
   - `test.ts` / `.tsx`: native server rendering, client mounting and hydration.
   - `consumer.ts`: isolated consumer compiler, bundler plugins, and native component syntax. Its checks must reject mixed datetime types and infer callback values, including `/generic`.
   - `example.ts`: framework-native documentation examples using the shared library metadata.
   - `tsconfig.json` and any asset declarations needed by the binding.
4. Register its ID, label, Mitosis generator/options, source/output extensions, runtime/type dependencies, JSX settings, code language, and example function in `frameworks.ts`. Do not import framework runtimes into registry metadata. The framework and library dropdowns and Frameworks page derive from this registration.
5. Run `pnpm generate`, `pnpm check`, and `pnpm test:browser`. Inspect generated code and actual behavior; Mitosis target support alone does not establish neodt compatibility. The browser layout suite and framework contract suites include each registration automatically.

`pnpm dev` and builds generate components automatically. Editing a `.lite.tsx` file while the demo server is running regenerates all targets and reloads the page. Generated files live in ignored `generated/<id>/` directories and are never edited by hand. Pin the Mitosis version; validate all targets before upgrading it.

The shared view uses stable primitive keys, preserving editable DOM nodes and focus in Solid, React, and Vue. The controller owns synchronous editing transitions and emits snapshots; framework state stores only the latest snapshot. Native DOM listeners handle keyboard, clipboard, input, and focus events consistently. Root click/mousedown handlers are composed with the consumer's native handlers at the binding boundary.

Mitosis 0.14 does not emit Solid unmount hooks, so the Solid binding explicitly disposes the controller. Shared `onUpdate` hooks include dependencies because that generator requires them. React uses correctly cased DOM properties (`readOnly`, `contentEditable`, etc.). Custom icons enter the shared view as component functions; bindings expose native JSX nodes or Vue slots.

Vue's generic public call signature includes its typed template context so `vue-tsc` can infer callback values from custom adapters. Consumer checks compile both Vue templates and generated documentation examples. The Vue compiler uses a scoped TypeScript 6 override because vue-tsc needs the JavaScript compiler API, which TypeScript 7 does not supply. The project's ordinary type checker remains TypeScript 7.

Support is intended for DOM-based frontend frameworks. A Mitosis target for a non-DOM platform would also require a platform-specific input, measurement, and accessibility design.
