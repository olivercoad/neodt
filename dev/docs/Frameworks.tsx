import { For, Show } from "solid-js";

import { packageEntry } from "../../frameworks";
import CodeExample from "../code/CodeExample";
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
                    <code>{packageEntry(framework.id, library.entry)}</code>
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
      <h2 id="usage">{currentFramework().label} usage</h2>
      <CodeExample
        language={currentFramework().codeLanguage}
        value={currentFramework().example({ ...library, now: library.nowExpression })}
      />
      <Show when={currentFramework().id === "vanilla"}>
        <h3>Updating and cleaning up</h3>
        <CodeExample
          language="typescript"
          value={`// Change options later without creating another control.
// Options you omit keep their current values.
neodt.update({ locale: "en-AU", formatOptions: { hour12: false } });

// Call this from your app when removing this form, dialog, or page.
// Removing HTML alone does not stop observers or pending animation work.
function removeDateField() {
  neodt.destroy(); // Remove the control and release its listeners and observers.
  container.remove(); // Remove the surrounding container if no longer needed.
}`}
        />
      </Show>
      <h2 id="shared-api">Shared behavior and native framework APIs</h2>
      <p>
        Vanilla mounts into an ordinary DOM container: call the default export with the container
        and options. The returned handle exposes <code>element</code>,{" "}
        <code>update(partialOptions)</code>, and <code>destroy()</code>. Updates merge options:
        omitted options keep their current values, and passing <code>undefined</code> removes an
        optional option. The merge is shallow, so passing <code>formatOptions</code> replaces the
        whole formatting object. The renderer is bundled, so no framework installation or compiler
        is needed.
      </p>
      <p>
        Call <code>neodt.destroy()</code> in your app's cleanup code when removing or replacing the
        form, dialog, or page containing the control. Removing its container from the DOM does not
        call this automatically. The control also owns event listeners, a resize observer,
        subscriptions, and scheduled animation work. Removing HTML alone does not dispose of these
        resources. <code>destroy()</code> removes the listeners, disconnects the observer,
        unsubscribes from updates, and cancels pending animation work. This prevents unnecessary
        background work and retained resources as UI is repeatedly created and removed. Destroy the
        control before removing its container. This removes only the control's nodes; the container
        and any other content remain. Remove the container separately if needed, as in the Vanilla
        example. If you only hide a dialog to reuse it later, keep the instance. After destroying
        it, create a new instance to show the control again; calling <code>update()</code> on a
        destroyed instance throws.
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
        root and /generic directly. The Library choice None uses Native Temporal.
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
