import { For } from "solid-js";

import { packageEntry } from "../../frameworks";
import Code from "../code/Code";
import { frameworks, currentFramework, demoPath } from "../framework";
import { useLibrary } from "../library";

import styles from "./docs.module.css";

export default function Frameworks() {
  const library = useLibrary();
  return (
    <>
      <p class={styles.eyebrow}>FRAMEWORKS</p>
      <h1>Choose your frontend framework.</h1>
      <p class={styles.intro}>
        The same editor for Vanilla TypeScript, Solid, React, Vue, Svelte, Angular, and Lit. Choose
        the framework and datetime library independently.
      </p>
      <p>
        The Framework dropdown beside Library switches the live controls throughout the lab and
        styling gallery. Your library selection and current documentation section are preserved. The
        documentation shell uses Solid; the controls use your selected framework.
      </p>
      <div class={styles.tableScroll}>
        <table>
          <thead>
            <tr>
              <th>Framework</th>
              <th>Install</th>
              <th>Selected library entry</th>
            </tr>
          </thead>
          <tbody>
            <For each={frameworks}>
              {(framework) => (
                <tr>
                  <td>
                    <a href={demoPath(framework.id, library.id) + "#/docs/frameworks"}>
                      {framework.label}
                    </a>
                  </td>
                  <td>
                    <code>
                      pnpm add @olicoad/neodt {framework.packages.join(" ")} {library.packages}
                    </code>
                  </td>
                  <td>
                    <code>{packageEntry(framework.id, library.entry)}</code>
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
      <h2 id="usage">{currentFramework().label} usage</h2>
      <pre>
        <Code
          language={currentFramework().codeLanguage}
          value={currentFramework().example({ ...library, now: library.nowExpression })}
        />
      </pre>
      <h2 id="shared-api">Shared behavior and native framework APIs</h2>
      <p>
        Vanilla mounts into an ordinary DOM container: call the default export with the container
        and options. It returns an element, update(partialOptions), and destroy(). Updates merge
        options; pass undefined to remove an optional option. Call destroy() when removing the
        owning UI. The renderer is bundled, so no framework installation or compiler is needed.
      </p>
      <p>
        Every framework exposes referenceTime, value, defaultValue, onValueChange, locale,
        formatOptions, readonly, disabled, and showTimeOffset. Use null for a controlled empty
        value. Every library preserves its own datetime and timezone types.
      </p>
      <p>
        Solid accepts class and classList. React accepts className and React styles. Vue accepts
        native attributes. Use shallowRef for datetime values so library instances and opaque
        timezone objects remain intact. Svelte accepts native attributes and lowercase event
        handlers; use $state.raw for datetime values. Angular accepts a typed props input: replace
        that object to update the control. Lit exports a custom-element class: register it with
        customElements.define and bind a new .props object to update it. Lit renders into Shadow DOM
        and exposes CSS parts for theming. All frameworks use the same built-in icons.
      </p>
      <p>
        Import /generic under your framework to supply a custom adapter. Vanilla uses the package
        root and /generic directly. The Library choice None uses native Temporal.
      </p>
      <p>
        Angular entries use runtime template compilation and require @angular/compiler. Use
        NgComponentOutlet or createComponent to render them in an AOT application. Server rendering
        and hydration are tested for the framework components. Vanilla mounts in the browser;
        importing it and using its parser utilities is safe on the server.
      </p>
      <h2 id="rendering">Styles and server rendering</h2>
      <p>
        All targets share the same CSS classes and theme variables. Vanilla installs its default
        styles before application styles when mounted; framework components include their
        stylesheet. An explicit @olicoad/neodt/style.css entry is also available. For hydration, use
        the same reference time, value, and explicit locale on the server and client. React
        components are client components when used in a React Server Components application.
      </p>
      <h2 id="adding-frameworks">Adding another framework</h2>
      <p>
        Register the target in frameworks.ts and add its small binding, build configuration, and
        demo/test host under frameworks/&lt;id&gt;. The build generates every datetime entry
        automatically. Component rendering lives in shared .lite.tsx files; editing behavior and
        datetime adapters remain shared.
      </p>
      <p>
        <a href="https://github.com/olivercoad/neodt/blob/main/docs/adding-a-framework.md">
          Contributor guide: adding a framework
        </a>
      </p>
    </>
  );
}
