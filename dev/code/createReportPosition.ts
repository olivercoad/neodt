import { createEffect, onCleanup, onMount } from "solid-js";

const inset = 8;

/** Keep the report link beside the closing lines, above native scrollbars. */
export function createReportPosition(
  container: () => HTMLElement,
  viewport: () => HTMLPreElement | HTMLTextAreaElement,
  value: () => string,
  onLayout?: () => void,
) {
  let measure = () => {};
  onMount(() => {
    const host = container();
    const code = viewport();
    const button = host.querySelector<HTMLAnchorElement>("[data-report-issue]");
    if (!button) return;
    const editable = code instanceof HTMLTextAreaElement;
    const canvas = document.createElement("canvas").getContext("2d")!;
    let frame = 0;

    const position = () => {
      // Follow the end of editable code instead of covering intervening lines.
      const remaining = editable ? code.scrollHeight - code.clientHeight - code.scrollTop : 0;
      host.style.setProperty(
        "--report-bottom",
        `${inset + code.offsetHeight - code.clientHeight - remaining}px`,
      );
      host.style.setProperty("--report-right", `${inset + code.offsetWidth - code.clientWidth}px`);
    };
    const updateLayout = () => {
      const font = getComputedStyle(code);
      canvas.font = font.font;
      const padding = parseFloat(font.paddingLeft);
      const lineHeight = parseFloat(font.lineHeight);
      const tabSize = parseFloat(font.tabSize);
      const { height, width } = button.getBoundingClientRect();
      const source = value().replace(/\r\n?/g, "\n");
      // Unlike a textarea, a pre's final newline does not create another visible line.
      const lines = (editable ? source : source.replace(/\n$/, "")).split("\n");
      const textBottom = padding + lines.length * lineHeight;
      // Measure without the extra clearance so resizing can remove it again.
      const contentHeight = Math.max(editable ? code.clientHeight : 0, textBottom + padding);
      const buttonTop = contentHeight - inset - height;
      const count = Math.max(0, Math.ceil((textBottom - buttonTop + inset) / lineHeight));
      const available = code.clientWidth - padding - width - 2 * inset;
      const overlaps =
        count > 0 &&
        lines.slice(-count).some((line) => {
          const expanded = line
            .split("\t")
            .reduce(
              (text, part, index) =>
                text + (index ? " ".repeat(tabSize - (text.length % tabSize)) : "") + part,
              "",
            );
          return canvas.measureText(expanded).width > available;
        });
      host.style.setProperty("--report-clearance", `${overlaps ? height + 2 * inset : padding}px`);
      if (!editable) host.style.minHeight = `${height + 2 * inset}px`;
      position();
      onLayout?.();
    };
    measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateLayout);
    };
    const reveal = () => {
      code.scrollTop = code.scrollHeight;
      host.scrollTop = 0;
      position();
    };
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    observer.observe(code);
    observer.observe(button);
    if (editable) {
      code.addEventListener("scroll", position);
      // Keyboard focus and scrollIntoView must scroll the textarea, not its overlay host.
      button.addEventListener("focus", reveal);
      host.addEventListener("scroll", reveal);
    }
    document.fonts.addEventListener("loadingdone", measure);
    measure();
    onCleanup(() => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      code.removeEventListener("scroll", position);
      button.removeEventListener("focus", reveal);
      host.removeEventListener("scroll", reveal);
      document.fonts.removeEventListener("loadingdone", measure);
    });
  });
  createEffect(() => {
    void value();
    measure();
  });
}
