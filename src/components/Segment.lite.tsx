import { Show } from "@builder.io/mitosis";

import type { EditorView, PartView } from "../core/controller";
export interface SegmentProps {
  view: EditorView;
  part: PartView;
}
export default function Segment(props: SegmentProps) {
  return (
    <Show
      when={props.part.editable}
      else={
        <span class="datetime-neo__separator" part="separator" aria-hidden="true">
          {props.part.text}
        </span>
      }
    >
      <span
        part="segment"
        class={
          "datetime-neo__segment" +
          (props.part.selected ? " datetime-neo__segment--selected" : "") +
          (props.part.allSelected ? " datetime-neo__segment--all-selected" : "")
        }
        role="spinbutton"
        contentEditable={!props.view.disabled && !props.view.readonly ? true : undefined}
        spellCheck={false}
        inputMode={props.part.type === "dayPeriod" ? "text" : "decimal"}
        tabIndex={props.part.tabIndex}
        aria-disabled={props.view.disabled || undefined}
        aria-label={props.part.type}
        aria-readonly={props.view.readonly || undefined}
        aria-valuenow={props.part.now}
        aria-valuemin={props.part.min}
        aria-valuemax={props.part.max}
        aria-valuetext={props.part.valueText}
        aria-describedby={props.view.describedBy}
        aria-invalid={props.view.invalid}
        suppressContentEditableWarning={true}
      >
        <Show when={props.part.empty} else={props.part.text}>
          <span class="datetime-neo__placeholder" part="placeholder">
            {props.part.text}
          </span>
        </Show>
      </span>
    </Show>
  );
}
