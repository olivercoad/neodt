import { onCleanup } from "solid-js";

/** Prevent upstream reflow during resizing, then restore layout without moving the active grip. */
export function createResizeScrollAnchor(cards: () => HTMLElement) {
  let cleanup: ((preservePosition: boolean) => void) | undefined;
  let frame: number | undefined;
  let previousGrip: HTMLElement | undefined;
  let previousTop = 0;
  const stop = (preservePosition = true) => {
    if (frame !== undefined) cancelAnimationFrame(frame);
    frame = undefined;
    cleanup?.(preservePosition);
    cleanup = undefined;
  };
  onCleanup(() => stop(false));

  return {
    start(grip: HTMLElement) {
      stop();
      const currentTop = grip.getBoundingClientRect().top;
      // Repeated keyboard steps must not accumulate the browser's fractional scroll rounding.
      const top =
        grip === previousGrip && Math.abs(currentTop - previousTop) <= 1 ? previousTop : currentTop;
      previousGrip = grip;
      previousTop = top;
      // Keep the grip under the pointer while its input wraps to a new height.
      const previousGripTop = grip.style.top;
      grip.style.top = getComputedStyle(grip).top;
      const rootStyle = document.documentElement.style;
      const previousAnchor = rootStyle.getPropertyValue("overflow-anchor");
      const previousPriority = rootStyle.getPropertyPriority("overflow-anchor");
      rootStyle.setProperty("overflow-anchor", "none");

      // Scroll compensation after each ResizeObserver update can still paint a displaced frame.
      // Hold only earlier cards in place instead; every input can still wrap at the new width.
      const earlierCards: HTMLElement[] = [];
      for (const card of cards().children) {
        if (card.contains(grip)) break;
        if (card instanceof HTMLElement) earlierCards.push(card);
      }
      const heights = earlierCards.map((card) => ({
        card,
        height: card.getBoundingClientRect().height,
        previous: card.style.getPropertyValue("height"),
        priority: card.style.getPropertyPriority("height"),
      }));
      for (const { card, height } of heights) card.style.height = `${height}px`;

      cleanup = (preservePosition) => {
        grip.style.top = previousGripTop;
        for (const { card, previous, priority } of heights) {
          if (previous) card.style.setProperty("height", previous, priority);
          else card.style.removeProperty("height");
        }
        // Restore natural card heights and compensate synchronously, before the next paint.
        if (preservePosition && grip.isConnected) {
          const delta = grip.getBoundingClientRect().top - top;
          if (Math.abs(delta) > 0.5)
            window.scrollBy({ top: Math.round(delta), behavior: "instant" });
        }
        if (previousAnchor)
          rootStyle.setProperty("overflow-anchor", previousAnchor, previousPriority);
        else rootStyle.removeProperty("overflow-anchor");
      };
    },
    finish() {
      if (frame !== undefined) cancelAnimationFrame(frame);
      // The component's wrapping follows ResizeObserver; let the final width settle first.
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => stop());
      });
    },
  };
}
