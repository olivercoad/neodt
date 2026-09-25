import { For, Show, useRef, onMount, onUpdate, onUnMount } from "@builder.io/mitosis";

import type { EditorController, EditorView } from "../core/controller";
import MagicIcon from "./MagicIcon.lite";
import Segment from "./Segment.lite";
import Trailing from "./Trailing.lite";

export interface ControlProps {
  view: EditorView;
  controller: EditorController;
  attributes: Record<string, unknown>;
  onRootClick: (event: MouseEvent) => void;
  onRootMouseDown: (event: MouseEvent) => void;
}

export default function Control(props: ControlProps) {
  const element = useRef<HTMLSpanElement>(null);
  onMount(() => {
    props.controller.mount(element);
  });
  onUpdate(() => {
    props.controller.afterRender();
  }, [props.view]);
  onUnMount(() => {
    props.controller.unmount();
  });
  return (
    <span
      {...props.attributes}
      part={
        "root" + (props.view.readonly ? " readonly" : "") + (props.view.wrapped ? " wrapped" : "")
      }
      ref={element}
      onClick={(event) => props.onRootClick(event)}
      onMouseDown={(event) => props.onRootMouseDown(event)}
      data-disabled={props.view.disabled ? "" : undefined}
      data-empty={props.view.empty ? "" : undefined}
      data-natural={props.view.natural ? "" : undefined}
      data-readonly={props.view.readonly ? "" : undefined}
      data-time-offset={props.view.showTimeOffset ? "" : undefined}
      data-layout-changing={props.view.layoutChanging ? "" : undefined}
    >
      <span
        class="datetime-neo__content"
        part="content"
        data-natural={props.view.natural ? "" : undefined}
        data-time-offset={props.view.showTimeOffset ? "" : undefined}
        data-wrapped={props.view.wrapped ? "" : undefined}
      >
        <span
          class="datetime-neo__editor"
          part="editor"
          role="group"
          aria-label={props.view.label}
          aria-labelledby={props.view.labelledBy}
          data-overflowing={props.view.overflowing ? "" : undefined}
        >
          <Show
            when={props.view.natural}
            else={
              <span class="datetime-neo__value" part="value">
                <For each={props.view.rowIndexes}>
                  {(rowIndex) => (
                    <span class="datetime-neo__row" part="row" key={rowIndex}>
                      <For each={props.view.rowKeys[rowIndex]}>
                        {(partKey) => (
                          <Segment
                            key={partKey}
                            part={props.view.partRows[rowIndex]![partKey]!}
                            view={props.view}
                          />
                        )}
                      </For>
                    </span>
                  )}
                </For>
              </span>
            }
          >
            <span class="datetime-neo__natural-entry" part="natural-entry">
              <span class="datetime-neo__natural-prefix" part="natural-prefix" aria-hidden="true">
                <MagicIcon />
              </span>
              <span class="datetime-neo__natural-field" part="natural-field">
                <input
                  onChange={() => {}}
                  class="datetime-neo__natural-input"
                  part="natural-input"
                  aria-label="Natural-language date and time"
                  readOnly={props.view.readonly}
                  type="text"
                  value={props.view.naturalText}
                  placeholder={props.view.placeholder}
                  disabled={props.view.disabled}
                />
                <Show when={!props.view.naturalText || props.view.completion}>
                  <span
                    part="natural-ghost"
                    class={
                      "datetime-neo__natural-ghost" +
                      (!props.view.naturalText ? " datetime-neo__natural-ghost--placeholder" : "")
                    }
                    aria-hidden="true"
                  >
                    <Show when={props.view.naturalText} else={props.view.placeholder}>
                      <span class="datetime-neo__natural-ghost-typed" part="natural-ghost-typed">
                        {props.view.naturalText}
                      </span>
                      {props.view.completion}
                      <kbd>Tab</kbd>
                    </Show>
                  </span>
                </Show>
              </span>
            </span>
            <span class="datetime-neo__natural-result" part="natural-result">
              <span class="datetime-neo__natural-preview" part="natural-preview" aria-live="polite">
                {props.view.preview}
              </span>
            </span>
          </Show>
          <Show when={!props.view.natural}>
            <span class="datetime-neo__empty-area" part="empty-area" aria-hidden="true" />
          </Show>
        </span>
        <Trailing view={props.view} measurement={false} />
      </span>
      <input
        onChange={() => {}}
        class="datetime-neo__native-input"
        part="native-input"
        id={props.view.id}
        type="datetime-local"
        value={props.view.nativeValue}
        disabled={props.view.disabled}
        readOnly={props.view.readonly}
        tabIndex={-1}
        aria-label="Date and time picker"
      />
      <span class="datetime-neo__measurements" part="measurements" aria-hidden="true">
        <For each={props.view.measurements}>
          {(parts, index) => (
            <span class="datetime-neo__measurement" part="measurement" key={index}>
              <span class="datetime-neo__editor" part="editor">
                <span class="datetime-neo__value" part="value">
                  <For each={parts}>
                    {(row, rowIndex) => (
                      <span class="datetime-neo__row" part="row" key={rowIndex}>
                        <For each={row}>
                          {(part, partIndex) => (
                            <span
                              key={partIndex}
                              part={part.editable ? "segment" : "separator"}
                              class={
                                part.editable ? "datetime-neo__segment" : "datetime-neo__separator"
                              }
                            >
                              {part.value}
                            </span>
                          )}
                        </For>
                      </span>
                    )}
                  </For>
                </span>
              </span>
              <Trailing view={props.view} measurement={true} />
            </span>
          )}
        </For>
      </span>
    </span>
  );
}
