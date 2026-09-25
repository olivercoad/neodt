import { For } from "solid-js";

import CodeExample from "../code/CodeExample";
import { currentFramework } from "../framework";
import { libraries } from "../libraries";

import styles from "./docs.module.css";

export default function Libraries() {
  const framework = currentFramework();
  return (
    <>
      <p class={styles.eyebrow}>DATETIME LIBRARIES</p>
      <h1>Choose your datetime library.</h1>
      <p class={styles.intro}>
        The import path selects the adapter for the component. None (native Temporal) is the default
        for root imports; install another library only when you choose its entry.
      </p>
      <p>
        Use the <strong>Library</strong> dropdown in the top navigation to try the lab and styling
        gallery with any built-in adapter. Each library has its own URL and entry point, so your
        browser loads only the selected datetime library. Switching preserves the current docs
        section. Native Temporal requires browser support; either polyfill entry works without it.
      </p>
      <p>
        The examples below use Solid syntax. See <a href="#/docs/frameworks">Frameworks</a> for the
        selected framework’s example and replace /solid with your framework in utility imports. For
        Vanilla, omit the framework segment entirely: use @olicoad/neodt, @olicoad/neodt/luxon, or
        any other library entry directly.
      </p>
      <h2 id="native-temporal">None (native Temporal)</h2>
      <CodeExample
        framework="solid"
        library="native-temporal"
        language="tsx"
        value={`import Neodt from "@olicoad/neodt/solid";

const referenceTime = Temporal.Now.zonedDateTimeISO("Australia/Sydney");
<Neodt referenceTime={referenceTime} />;`}
      />
      <p>
        Values and callbacks use <code>Temporal.ZonedDateTime</code>. Convert an Instant or
        PlainDateTime to a ZonedDateTime before passing it to the control. Each framework’s root
        entry requires a global Temporal implementation and imports no datetime package. For
        TypeScript 6 or later, include <code>"ESNext"</code> and <code>"DOM"</code> in your
        compiler’s <code>lib</code> setting to enable the global types.
      </p>
      <h2 id="temporal-polyfills">Temporal polyfills</h2>
      <p>
        For browsers without Temporal, install <code>temporal-polyfill</code> and use its entry. It
        imports the implementation directly and leaves global Temporal unchanged.
      </p>
      <CodeExample
        framework="solid"
        library="temporal-polyfill"
        language="tsx"
        value={`import Neodt from "@olicoad/neodt/solid/temporal-polyfill";
import { Temporal } from "temporal-polyfill";

<Neodt referenceTime={Temporal.Now.zonedDateTimeISO("Australia/Sydney")} />;`}
      />
      <p>
        If your application uses <code>@js-temporal/polyfill</code>, select{" "}
        <code>@olicoad/neodt/solid/js-temporal-polyfill</code> instead:
      </p>
      <CodeExample
        framework="solid"
        library="js-temporal-polyfill"
        language="tsx"
        value={`import Neodt from "@olicoad/neodt/solid/js-temporal-polyfill";
import { Temporal } from "@js-temporal/polyfill";

<Neodt referenceTime={Temporal.Now.zonedDateTimeISO("Australia/Sydney")} />;`}
      />
      <p>
        Both entries use their package’s Temporal export. The temporal-polyfill package uses native
        Temporal when available and supplies its implementation otherwise. You can also use your
        framework’s root entry with a global polyfill installed by your application. The live demos
        on this site use the temporal-polyfill entry for browser compatibility, while the
        getting-started examples use native Temporal. Neither the site nor the library installs a
        global polyfill.
      </p>
      <h2 id="other-libraries">Available library entries</h2>
      <div class={styles.tableScroll}>
        <table>
          <thead>
            <tr>
              <th>Library</th>
              <th>npm packages</th>
              <th>Import under @olicoad/neodt</th>
              <th>Value type</th>
            </tr>
          </thead>
          <tbody>
            <For each={libraries}>
              {(library) => (
                <tr>
                  <td>
                    {library.homepage ? (
                      <a href={library.homepage}>{library.label}</a>
                    ) : (
                      library.label
                    )}
                  </td>
                  <td>
                    <For each={[...library.dependencies, ...library.typePackages]}>
                      {(name, index) => (
                        <>
                          {index() > 0 && ", "}
                          <a href={`https://www.npmjs.com/package/${name}`}>
                            <code>{name}</code>
                          </a>
                        </>
                      )}
                    </For>
                    {!library.dependencies.length && "Built into your runtime"}
                  </td>
                  <td>
                    <code>{framework.entry + library.entry || "(root)"}</code>
                  </td>
                  <td>
                    <code>{library.type}</code>
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
      <CodeExample
        framework="solid"
        library="luxon"
        language="tsx"
        value={`import { createSignal } from "solid-js";
import { DateTime } from "luxon";
import Neodt from "@olicoad/neodt/solid/luxon";

const referenceTime = DateTime.now().setZone("Australia/Sydney");
const [value, setValue] = createSignal<DateTime | null>(null);

<Neodt referenceTime={referenceTime} value={value()} onValueChange={setValue} />;`}
      />
      <p>
        No adapter prop is needed. Values, callbacks, and the <code>NeodtProps</code> type exported
        from the same entry follow the selected library. Only that library is loaded; the other
        packages are optional peers and are not needed in your application.
      </p>
      <h2 id="timezone-configuration">Timezone configuration</h2>
      <p>
        Temporal, Luxon, Spacetime, and @internationalized/date carry a timezone in each value. Set
        the zone on <code>referenceTime</code> and neodt uses it for display, editing, and returned
        values.{" "}
        <span class={styles.justWorks}>
          It just works<sup>™</sup>
        </span>
      </p>
      <p>
        For the libraries below, the default entry works in the system timezone. To choose another
        zone explicitly, import <code>/generic</code> under your framework and create an adapter
        once with a <code>zone</code> option, as shown below. Use an IANA name such as{" "}
        <code>Australia/Sydney</code> when daylight-saving changes should be taken into account.
      </p>
      <h3>Moment.js</h3>
      <p>
        The <code>/moment</code> entry reads the reference value’s named timezone, UTC offset, or
        system timezone. A UTC offset alone does not identify a region or its daylight-saving rules.
        For a specific region, configure the adapter’s zone:
      </p>
      <CodeExample
        framework="solid"
        library="moment"
        language="tsx"
        value={`import Neodt from "@olicoad/neodt/solid/generic";
import { createMomentAdapter } from "@olicoad/neodt/solid/moment";
import moment from "moment-timezone";

const adapter = createMomentAdapter(moment, { zone: "Australia/Sydney" });
<Neodt adapter={adapter} referenceTime={moment()} />;`}
      />
      <p>
        Moment.js handles local and fixed-offset editing. Named-zone editing outside the system zone
        requires <a href="https://momentjs.com/timezone/">Moment Timezone</a>, which owns the
        timezone calculations and preserves named zones on returned values.
      </p>
      <h3>Day.js</h3>
      <p>
        The <code>/dayjs</code> entry uses the system timezone, even if the reference value was
        created in another zone. For editing in a named timezone, configure the adapter and register
        the Day.js UTC and Timezone plugins:
      </p>
      <CodeExample
        framework="solid"
        library="dayjs"
        language="tsx"
        value={`import Neodt from "@olicoad/neodt/solid/generic";
import { createDayjsAdapter } from "@olicoad/neodt/solid/dayjs";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);
const adapter = createDayjsAdapter(dayjs, { zone: "Australia/Sydney" });
<Neodt adapter={adapter} referenceTime={dayjs()} />;`}
      />
      <p>
        System-local editing needs neither plugin. For a fixed offset such as <code>+05:30</code>,
        only the UTC plugin is required. neodt does not register plugins automatically.
      </p>
      <h3>date-fns</h3>
      <p>
        date-fns uses JavaScript <code>Date</code> values, which store an instant without a
        timezone. The <code>/date-fns</code> entry displays and edits them in the system timezone.
        Set an adapter zone to use a different timezone:
      </p>
      <CodeExample
        framework="solid"
        library="date-fns"
        language="tsx"
        value={`import Neodt from "@olicoad/neodt/solid/generic";
import { createDateFnsAdapter } from "@olicoad/neodt/solid/date-fns";
import { toDate, constructNow } from "date-fns";

const adapter = createDateFnsAdapter(toDate, { zone: "Australia/Sydney" });
<Neodt adapter={adapter} referenceTime={constructNow(0)} />;`}
      />
      <p>
        Install both date-fns and @date-fns/tz. The adapter uses date-fns operations with TZDate for
        timezone handling. Returned values are still ordinary <code>Date</code> objects: methods
        such as <code>getHours()</code> use the system timezone, while neodt displays the same
        instant in the configured zone.
      </p>
      <h2 id="custom-adapters">Custom adapters</h2>
      <CodeExample
        framework="solid"
        library="date-fns"
        language="tsx"
        value={`import Neodt, { type DateAdapter } from "@olicoad/neodt/solid/generic";

import { createDateFnsAdapter } from "@olicoad/neodt/solid/date-fns";
import { toDate, constructNow } from "date-fns";

const adapter: DateAdapter<Date> = createDateFnsAdapter(toDate, { zone: "UTC" });
const referenceTime = constructNow(0);
<Neodt adapter={adapter} referenceTime={referenceTime} />;`}
      />
      <p>
        The generic entry requires an adapter. Implement <code>DateAdapter&lt;T, TZone&gt;</code> by
        delegating field construction and editing, addition, date boundaries, month lengths,
        weekdays, and offsets to your library. Reuse a built-in factory as above when possible.
        Zones may be strings or opaque objects and are retained unchanged on output.
        <code>getOffset</code> supplies the selected date's offset for <code>showTimeOffset</code>;
        <code>setZoneId</code> handles zones explicitly named in parser text. Locale formatting is
        supplied by <code>createFormatter(zone, locale, options)</code>, which returns an object
        with <code>formatToParts(value)</code>. The core caches up to 32 formatters per adapter by
        zone, locale, and options. The core performs no timezone resolution. The public prop type is{" "}
        <code>NeodtProps&lt;T, TZone&gt;</code>.
      </p>
    </>
  );
}
