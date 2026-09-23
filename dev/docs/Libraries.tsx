import { For } from "solid-js";

import Code from "../code/Code";

import styles from "./docs.module.css";

export default function Libraries() {
  return (
    <>
      <p class={styles.eyebrow}>DATETIME LIBRARIES</p>
      <h1>Choose your datetime library.</h1>
      <p class={styles.intro}>
        The import path selects the adapter for the component. Native Temporal is the default;
        install another library only when you choose its entry.
      </p>
      <h2 id="native-temporal">Native Temporal</h2>
      <pre>
        <Code
          language="tsx"
          value={`import Neodt from "@olicoad/neodt";

const referenceTime = Temporal.Now.zonedDateTimeISO("Australia/Sydney");
<Neodt referenceTime={referenceTime} />;`}
        />
      </pre>
      <p>
        Values and callbacks use <code>Temporal.ZonedDateTime</code>. Convert an Instant or
        PlainDateTime to a ZonedDateTime before passing it to the control. The root entry requires a
        global Temporal implementation and imports no datetime package. For TypeScript 6 or later,
        include <code>"ESNext"</code> and <code>"DOM"</code> in your compiler’s <code>lib</code>{" "}
        setting to enable the global types.
      </p>
      <h2 id="temporal-polyfills">Temporal polyfills</h2>
      <p>
        For browsers without Temporal, install <code>temporal-polyfill</code> and use its entry. It
        imports the implementation directly and leaves global Temporal unchanged.
      </p>
      <pre>
        <Code
          language="tsx"
          value={`import Neodt from "@olicoad/neodt/temporal-polyfill";
import { Temporal } from "temporal-polyfill";

<Neodt referenceTime={Temporal.Now.zonedDateTimeISO("Australia/Sydney")} />;`}
        />
      </pre>
      <p>
        If your application uses <code>@js-temporal/polyfill</code>, select{" "}
        <code>@olicoad/neodt/js-temporal-polyfill</code> instead:
      </p>
      <pre>
        <Code
          language="tsx"
          value={`import Neodt from "@olicoad/neodt/js-temporal-polyfill";
import { Temporal } from "@js-temporal/polyfill";

<Neodt referenceTime={Temporal.Now.zonedDateTimeISO("Australia/Sydney")} />;`}
        />
      </pre>
      <p>
        Both entries use their package’s Temporal export. The temporal-polyfill package uses native
        Temporal when available and supplies its implementation otherwise. You can also use the root
        entry with a global polyfill installed by your application. The live demos on this site use
        the temporal-polyfill entry for browser compatibility, while the getting-started examples
        use native Temporal. Neither the site nor the library installs a global polyfill.
      </p>
      <h2 id="other-libraries">Other libraries</h2>
      <div class={styles.tableScroll}>
        <table>
          <thead>
            <tr>
              <th>Library</th>
              <th>npm package</th>
              <th>Import under @olicoad/neodt</th>
              <th>Value type</th>
            </tr>
          </thead>
          <tbody>
            <For
              each={[
                {
                  name: "Luxon",
                  homepage: "https://moment.github.io/luxon/",
                  package: "luxon",
                  value: "DateTime",
                },
                {
                  name: "Moment.js",
                  homepage: "https://momentjs.com/",
                  package: "moment",
                  value: "Moment",
                },
                {
                  name: "Day.js",
                  homepage: "https://day.js.org/",
                  package: "dayjs",
                  value: "Dayjs",
                },
                {
                  name: "date-fns",
                  homepage: "https://date-fns.org/",
                  package: "date-fns",
                  value: "Date",
                },
                {
                  name: "Spacetime",
                  homepage: "https://spacetime.how/",
                  package: "spacetime",
                  value: "Spacetime",
                },
              ]}
            >
              {(library) => (
                <tr>
                  <td>
                    <a href={library.homepage}>{library.name}</a>
                  </td>
                  <td>
                    <a href={`https://www.npmjs.com/package/${library.package}`}>
                      <code>{library.package}</code>
                    </a>
                  </td>
                  <td>
                    <code>/{library.package}</code>
                  </td>
                  <td>
                    <code>{library.value}</code>
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
      <p>
        For Luxon in TypeScript projects, also install{" "}
        <a href="https://www.npmjs.com/package/@types/luxon">
          <code>@types/luxon</code>
        </a>
        .
      </p>
      <pre>
        <Code
          language="tsx"
          value={`import { createSignal } from "solid-js";
import { DateTime } from "luxon";
import Neodt from "@olicoad/neodt/luxon";

const referenceTime = DateTime.now().setZone("Australia/Sydney");
const [value, setValue] = createSignal<DateTime | null>(null);

<Neodt referenceTime={referenceTime} value={value()} onValueChange={setValue} />;`}
        />
      </pre>
      <p>
        No adapter prop is needed. Values, callbacks, and the <code>NeodtProps</code> type exported
        from the same entry follow the selected library. Only that library is loaded; the other
        packages are optional peers and are not needed in your application.
      </p>
      <h2 id="timezone-configuration">Timezone configuration</h2>
      <p>
        Temporal, Luxon, and Spacetime carry a timezone in each value. Set the zone on{" "}
        <code>referenceTime</code> and neodt uses it for display, editing, and returned values.{" "}
        <span class={styles.justWorks}>
          It just works<sup>™</sup>
        </span>
      </p>
      <p>
        For the libraries below, the default entry works in the system timezone. To choose another
        zone explicitly, import <code>/generic</code> and create an adapter once with a{" "}
        <code>zone</code> option, as shown below. Use an IANA name such as{" "}
        <code>Australia/Sydney</code> when daylight-saving changes should be taken into account.
      </p>
      <h3>Moment.js</h3>
      <p>
        The <code>/moment</code> entry reads the reference value’s named timezone, UTC offset, or
        system timezone. A UTC offset alone does not identify a region or its daylight-saving rules.
        For a specific region, configure the adapter’s zone:
      </p>
      <pre>
        <Code
          language="tsx"
          value={`import Neodt from "@olicoad/neodt/generic";
import { createMomentAdapter } from "@olicoad/neodt/adapters/moment";
import moment from "moment";

const adapter = createMomentAdapter(moment, { zone: "Australia/Sydney" });
<Neodt adapter={adapter} referenceTime={moment()} />;`}
        />
      </pre>
      <p>
        Moment.js alone is enough for this setup. neodt uses Intl for timezone calculations and
        returns values with the correct UTC offset. To retain the named timezone on the returned
        values too, install <a href="https://momentjs.com/timezone/">Moment Timezone</a> and import{" "}
        <code>moment</code> from{" "}
        <a href="https://www.npmjs.com/package/moment-timezone">
          <code>moment-timezone</code>
        </a>{" "}
        in the example above.
      </p>
      <h3>Day.js</h3>
      <p>
        The <code>/dayjs</code> entry uses the system timezone, even if the reference value was
        created in another zone. For editing in a named timezone, configure the adapter and register
        the Day.js UTC and Timezone plugins:
      </p>
      <pre>
        <Code
          language="tsx"
          value={`import Neodt from "@olicoad/neodt/generic";
import { createDayjsAdapter } from "@olicoad/neodt/adapters/dayjs";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);
const adapter = createDayjsAdapter(dayjs, { zone: "Australia/Sydney" });
<Neodt adapter={adapter} referenceTime={dayjs()} />;`}
        />
      </pre>
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
      <pre>
        <Code
          language="tsx"
          value={`import Neodt from "@olicoad/neodt/generic";
import { createDateFnsAdapter } from "@olicoad/neodt/adapters/date-fns";
import { toDate } from "date-fns/toDate";

const adapter = createDateFnsAdapter(toDate, { zone: "Australia/Sydney" });
<Neodt adapter={adapter} referenceTime={new Date()} />;`}
        />
      </pre>
      <p>
        No additional timezone package is needed. Returned values are still ordinary{" "}
        <code>Date</code> objects: methods such as <code>getHours()</code> use the system timezone,
        while neodt displays the same instant in the configured zone.
      </p>
      <h2 id="custom-adapters">Custom adapters</h2>
      <pre>
        <Code
          language="tsx"
          value={`import Neodt, { type DateAdapter } from "@olicoad/neodt/generic";

const adapter: DateAdapter<Date> = {
  toEpochMilliseconds: (value) => value.getTime(),
  fromEpochMilliseconds: (milliseconds) => new Date(milliseconds),
  getZone: () => "UTC",
  getZoneId: (zone) => zone,
};
const referenceTime = new Date();
<Neodt adapter={adapter} referenceTime={referenceTime} />;`}
        />
      </pre>
      <p>
        The generic entry requires an adapter. Implement <code>DateAdapter&lt;T, TZone&gt;</code>{" "}
        with non-mutating conversions that preserve the instant. Zones may be strings or opaque
        objects: <code>getZoneId</code> projects a zone to an Intl-compatible IANA identifier or
        fixed offset, while the original zone is passed unchanged to{" "}
        <code>fromEpochMilliseconds</code>. The public prop type is{" "}
        <code>NeodtProps&lt;T, TZone&gt;</code>.
      </p>
    </>
  );
}
