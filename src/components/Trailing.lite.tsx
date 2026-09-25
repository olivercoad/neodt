import { Show } from "@builder.io/mitosis";

import type { EditorView } from "../core/controller";
import CalendarIcon from "./CalendarIcon.lite";
import CancelIcon from "./CancelIcon.lite";
import ConfirmIcon from "./ConfirmIcon.lite";
import MagicIcon from "./MagicIcon.lite";
export interface TrailingProps {
  view: EditorView;
  measurement: boolean;
}
export default function Trailing(props: TrailingProps) {
  return (
    <Show when={props.view.showTimeOffset || (!props.view.readonly && !props.view.disabled)}>
      <span class="datetime-neo__trailing" part="trailing">
        <Show when={props.view.showTimeOffset}>
          <span
            class="datetime-neo__timezone"
            part="timezone"
            aria-hidden={!props.measurement || undefined}
          >
            <span>{(props.measurement ? props.view.measuredOffset : props.view.offset).hours}</span>
            <span
              class="datetime-neo__timezone-minutes"
              part="timezone-minutes"
              data-zero={
                (props.measurement ? props.view.measuredOffset : props.view.offset).hasZeroMinutes
                  ? ""
                  : undefined
              }
            >
              {(props.measurement ? props.view.measuredOffset : props.view.offset).minutes}
            </span>
          </span>
        </Show>
        <Show when={!props.view.readonly && !props.view.disabled}>
          <span class="datetime-neo__actions" part="actions">
            <button
              class="datetime-neo__trigger"
              part="trigger"
              type="button"
              tabIndex={
                props.measurement ? -1 : props.view.activeItem === props.view.segmentCount ? 0 : -1
              }
              disabled={props.view.disabled}
              aria-label={
                !props.measurement && props.view.natural
                  ? props.view.canConfirm
                    ? "Confirm natural-language date"
                    : "Cancel natural-language date"
                  : "Enter date and time naturally"
              }
            >
              <Show when={props.view.natural} else={<MagicIcon />}>
                <Show when={props.view.canConfirm} else={<CancelIcon />}>
                  <ConfirmIcon />
                </Show>
              </Show>
            </button>
            <Show when={!props.view.natural}>
              <label
                class="datetime-neo__trigger"
                part="trigger"
                for={props.view.id}
                tabIndex={
                  props.measurement
                    ? -1
                    : props.view.activeItem === props.view.segmentCount + 1
                      ? 0
                      : -1
                }
                aria-label="Open date and time picker"
              >
                <CalendarIcon />
              </label>
            </Show>
          </span>
        </Show>
      </span>
    </Show>
  );
}
