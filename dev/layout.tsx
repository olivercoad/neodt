// Deterministic browser fixture: no demo styles, persistence, remote fonts, or clock.
// This entry is served by Vite during testing and excluded from the production build.
import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import Neodt from "src/temporal-polyfill";
import { Temporal } from "temporal-polyfill";

function Fixture() {
  const query = new URLSearchParams(location.search);
  const reference = Temporal.PlainDateTime.from("2026-08-17T15:30").toZonedDateTime(
    query.get("zone") ?? "Australia/Sydney",
  );
  const [width, setWidth] = createSignal(Number(query.get("width") ?? 420));
  const [value, setValue] = createSignal<Temporal.ZonedDateTime | null>(
    query.has("empty") ? null : reference,
  );
  const [state, setState] = createSignal(query.get("state") ?? "editable");
  const [locale, setLocale] = createSignal(query.get("locale") ?? "en-GB");
  const [offset, setOffset] = createSignal(query.has("offset"));
  return (
    <>
      <style>{`
        body { margin: 24px; font: 16px Arial, sans-serif; }
        #host { width: fit-content; margin: 40px 0; }
        .fixture { width: 100%; }
        .metrics { font: 20px Georgia, serif; --datetime-neo-segment-line-height: 1; --datetime-neo-segment-padding: 0.3rem 0.25rem; }
      `}</style>
      <label>
        Width{" "}
        <input
          aria-label="Width"
          type="number"
          value={width()}
          onInput={(e) => setWidth(e.currentTarget.valueAsNumber)}
        />
      </label>
      <label>
        State{" "}
        <select
          aria-label="State"
          value={state()}
          onChange={(e) => setState(e.currentTarget.value)}
        >
          <option>editable</option>
          <option>readonly</option>
          <option>disabled</option>
        </select>
      </label>
      <label>
        Locale{" "}
        <select
          aria-label="Locale"
          value={locale()}
          onChange={(e) => setLocale(e.currentTarget.value)}
        >
          <option>en-GB</option>
          <option>en-US</option>
          <option>de-DE</option>
          <option>ja-JP</option>
        </select>
      </label>
      <label>
        <input
          aria-label="Offset"
          type="checkbox"
          checked={offset()}
          onChange={(e) => setOffset(e.currentTarget.checked)}
        />
        Offset
      </label>
      <div id="host" style={{ width: `${width()}px` }}>
        <Neodt
          class={`fixture ${query.has("metrics") ? "metrics" : ""}`}
          aria-label="Appointment"
          referenceTime={reference}
          value={value()}
          onValueChange={setValue}
          locale={locale()}
          showTimeOffset={offset()}
          readonly={state() === "readonly"}
          disabled={state() === "disabled"}
        />
      </div>
      <output>{value()?.toString() ?? "null"}</output>
      <button type="button">Outside</button>
    </>
  );
}
render(() => <Fixture />, document.getElementById("root")!);
