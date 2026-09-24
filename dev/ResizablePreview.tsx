import { createMemo, createSignal, onCleanup, onMount, type JSX } from "solid-js";

import styles from "./ResizablePreview.module.css";

/** Shared sizing and accessible width grip for the lab and styling previews. */
export default function ResizablePreview(props: {
  width: number;
  onWidthChange: (width: number) => void;
  label: string;
  themeId?: string;
  onResizeStart?: (grip: HTMLElement) => void;
  onResizeEnd?: () => void;
  children: (grip: JSX.Element) => JSX.Element;
}) {
  const [maximumWidth, setMaximumWidth] = createSignal(400);
  const minimumWidth = 100;
  let stage!: HTMLDivElement;
  let dragStart: { pointerId: number; x: number; width: number } | undefined;
  const clampWidth = (value: number) =>
    Math.round(Math.max(minimumWidth, Math.min(value, maximumWidth())));
  const width = createMemo(() => clampWidth(props.width));
  const setWidth = (value: number) => props.onWidthChange(clampWidth(value));
  onMount(() => {
    const resize = () => {
      // Leave space beside the previews for the grip and its width label.
      setMaximumWidth(Math.max(minimumWidth, stage.clientWidth - 60));
    };
    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    resize();
    onCleanup(() => observer.disconnect());
  });
  return (
    <div ref={stage}>
      <div
        class={styles.sizer}
        data-theme-preview={props.themeId}
        style={{ width: `${width()}px` }}
      >
        {props.children(
          <button
            type="button"
            role="slider"
            class={styles.resizeHandle}
            aria-label={props.label}
            aria-valuemin={minimumWidth}
            aria-valuemax={maximumWidth()}
            aria-valuenow={width()}
            aria-valuetext={`${width()} pixels`}
            onKeyDown={(event) => {
              const next =
                event.key === "Home"
                  ? minimumWidth
                  : event.key === "End"
                    ? maximumWidth()
                    : event.key === "ArrowLeft" || event.key === "ArrowDown"
                      ? width() - 10
                      : event.key === "ArrowRight" || event.key === "ArrowUp"
                        ? width() + 10
                        : undefined;
              if (next === undefined) return;
              event.preventDefault();
              props.onResizeStart?.(event.currentTarget);
              setWidth(next);
              props.onResizeEnd?.();
            }}
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              props.onResizeStart?.(event.currentTarget);
              dragStart = {
                pointerId: event.pointerId,
                x: event.clientX,
                width: width(),
              };
              event.currentTarget.setPointerCapture(event.pointerId);
              event.preventDefault();
            }}
            onPointerMove={(event) => {
              if (dragStart?.pointerId !== event.pointerId) return;
              setWidth(dragStart.width + event.clientX - dragStart.x);
            }}
            onPointerUp={(event) => {
              if (dragStart?.pointerId !== event.pointerId) return;
              dragStart = undefined;
              event.currentTarget.releasePointerCapture(event.pointerId);
              props.onResizeEnd?.();
            }}
            onPointerCancel={() => {
              dragStart = undefined;
              props.onResizeEnd?.();
            }}
            onLostPointerCapture={() => {
              if (!dragStart) return;
              dragStart = undefined;
              props.onResizeEnd?.();
            }}
          >
            <span class={styles.resizeGrip} aria-hidden="true" />
            <span>{width()}px</span>
          </button>,
        )}
      </div>
    </div>
  );
}
