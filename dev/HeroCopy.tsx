import {
  createEffect,
  createSignal,
  createUniqueId,
  For,
  Show,
  onCleanup,
  onMount,
} from "solid-js";
import { Portal } from "solid-js/web";

import packageJson from "../package.json";
import { frameworks as frameworkRegistry, currentFramework, demoPath } from "./framework";
import { libraries as libraryRegistry } from "./libraries";
import { useLibrary } from "./library";

import styles from "./HeroCopy.module.css";

const frameworks = frameworkRegistry.map((item) => item.id);
const libraries = libraryRegistry.map((item) => item.id);
type OptionPresentation = { label: string; description?: string; sentence: string };
const frameworkPresentation = Object.fromEntries(
  frameworkRegistry.map((item) => [
    item.id,
    {
      label: item.label,
      description: item.description,
      sentence: item.id === "vanilla" ? "Typescript" : item.label,
    },
  ]),
);
const libraryPresentation = Object.fromEntries(
  libraryRegistry.map((item) => [
    item.id,
    {
      label: item.label,
      description: item.description,
      sentence: item.id === "native-temporal" ? "Temporal" : item.label,
    },
  ]),
);

type LayoutUpdate = (update: () => void) => void;

function RotatingWord(props: { value: string; paused: boolean; updateLayout: LayoutUpdate }) {
  let wordWindow!: HTMLSpanElement;
  let word!: HTMLSpanElement;
  let sequence = 0;
  const initial = props.value;
  let previous = initial;

  const renderLetters = (value: string) => {
    word.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
    word.replaceChildren(
      ...Array.from(value, (character) => {
        const letter = document.createElement("span");
        letter.className = styles.letter!;
        letter.textContent = character === " " ? "\u00a0" : character;
        return letter;
      }),
    );
    return Array.from(word.children) as HTMLElement[];
  };

  onMount(() => {
    renderLetters(initial);
    // Keep an explicit width so replacing the letters doesn't snap the layout.
    // Observe the intrinsic word, which also handles font loading and resizing.
    const updateWidth = () => {
      const width = `${word.getBoundingClientRect().width}px`;
      if (wordWindow.style.width === width) return;
      props.updateLayout(() => {
        wordWindow.style.width = width;
      });
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(word);
    onCleanup(() => observer.disconnect());
  });

  createEffect(() => {
    const next = props.value;
    if (props.paused) {
      ++sequence;
      previous = next;
      renderLetters(next);
      return;
    }
    if (next === previous) return;
    previous = next;
    const current = ++sequence;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      renderLetters(next);
      return;
    }

    const outgoing = Array.from(word.children) as HTMLElement[];
    Promise.all(
      outgoing.map(
        (letter, index) =>
          letter.animate(
            { transform: ["translateY(0%)", "translateY(-110%)"], opacity: [1, 0] },
            {
              duration: 220,
              delay: index * Math.min(14, 120 / Math.max(1, outgoing.length - 1)),
              easing: "ease-in",
              fill: "forwards",
            },
          ).finished,
      ),
    )
      .then(() => {
        if (current !== sequence) return;
        const incoming = renderLetters(next);
        incoming.forEach((letter, index) => {
          letter.animate(
            { transform: ["translateY(110%)", "translateY(0%)"], opacity: [0, 1] },
            {
              duration: 440,
              delay: index * Math.min(18, 160 / Math.max(1, incoming.length - 1)),
              easing: "cubic-bezier(.16, 1, .3, 1)",
              fill: "backwards",
            },
          );
        });
      })
      .catch(() => {
        /* A replaced or unmounted word cancels its outgoing animation. */
      });
  });

  onCleanup(() => {
    sequence++;
    word.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
  });

  return (
    <span ref={wordWindow} class={styles.wordWindow} aria-hidden="true">
      <span ref={word} class={styles.rotatingWord}>
        {initial}
      </span>
    </span>
  );
}

function StackDropdown(props: {
  label: string;
  options: string[];
  value: string;
  paused: boolean;
  updateLayout: LayoutUpdate;
  presentation?: Record<string, OptionPresentation>;
  onChange: (value: string) => void;
}) {
  const optionLabel = (value: string) => props.presentation?.[value]?.label ?? value;
  const sentenceValue = () => props.presentation?.[props.value]?.sentence ?? props.value;
  const id = createUniqueId();
  const [open, setOpen] = createSignal(false);
  const [active, setActive] = createSignal(0);
  const [position, setPosition] = createSignal({ left: "0px", top: "0px", "max-height": "320px" });
  let trigger!: HTMLButtonElement;
  let menu!: HTMLDivElement;
  let search = "";
  let searchedAt = 0;

  const placeMenu = () => {
    const rect = trigger.getBoundingClientRect();
    const height = Math.min(344, window.innerHeight - 24);
    const below = window.innerHeight - rect.bottom - 20;
    const above = rect.top - 20;
    const useAbove = below < height && above > below;
    const available = Math.max(80, useAbove ? above : below);
    setPosition({
      left: `${Math.max(12, Math.min(rect.left, window.innerWidth - 252))}px`,
      top: `${useAbove ? Math.max(12, rect.top - Math.min(height, available) - 8) : rect.bottom + 8}px`,
      "max-height": `${Math.min(height, available)}px`,
    });
  };
  const reveal = () => {
    setActive(props.options.indexOf(props.value));
    placeMenu();
    setOpen(true);
  };
  const move = (index: number) => {
    setActive((index + props.options.length) % props.options.length);
    document.getElementById(`${id}-${active()}`)?.scrollIntoView({ block: "nearest" });
  };
  const choose = (index: number) => {
    props.onChange(props.options[index]!);
    setOpen(false);
    trigger.focus();
  };
  const keydown = (event: KeyboardEvent) => {
    if (event.key === "Escape" || event.key === "Tab") {
      if (event.key === "Escape" && open()) event.preventDefault();
      setOpen(false);
      return;
    }
    if (["ArrowDown", "ArrowUp", "Home", "End", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      if (!open()) {
        reveal();
        return;
      }
      if (event.key === "Enter" || event.key === " ") choose(active());
      else
        move(
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? props.options.length - 1
              : active() + (event.key === "ArrowDown" ? 1 : -1),
        );
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      if (!open()) reveal();
      search = (Date.now() - searchedAt < 700 ? search : "") + event.key.toLowerCase();
      searchedAt = Date.now();
      const index = props.options.findIndex((option) =>
        optionLabel(option).toLowerCase().startsWith(search),
      );
      if (index >= 0) move(index);
    }
  };
  onMount(() => {
    const outside = (event: PointerEvent) => {
      if (!trigger.contains(event.target as Node) && !menu?.contains(event.target as Node))
        setOpen(false);
    };
    const reposition = () => {
      if (open()) placeMenu();
    };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    onCleanup(() => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    });
  });
  return (
    <>
      <button
        ref={trigger}
        data-layout
        type="button"
        class={styles.wordPicker}
        role="combobox"
        aria-label={`${props.label}: ${optionLabel(props.value)}`}
        aria-haspopup="listbox"
        aria-expanded={open()}
        aria-controls={open() ? id : undefined}
        aria-activedescendant={open() ? `${id}-${active()}` : undefined}
        onClick={() => {
          // Safari does not focus buttons on pointer clicks by default. Keep the
          // whole sentence paused while interacting with the portalled menu.
          trigger.focus();
          if (open()) setOpen(false);
          else reveal();
        }}
        onKeyDown={keydown}
        onBlur={() => setOpen(false)}
      >
        <RotatingWord
          value={sentenceValue()}
          paused={props.paused || open()}
          updateLayout={props.updateLayout}
        />
        <svg
          class={styles.chevron}
          classList={{ [styles.chevronOpen!]: open() }}
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="m4 6 4 4 4-4"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
      <Show when={open()}>
        <Portal>
          <div
            ref={menu}
            class={styles.dropdownMenu}
            style={position()}
            onPointerDown={(event) => event.preventDefault()}
          >
            <div class={styles.dropdownHeading}>{props.label}</div>
            <div id={id} role="listbox" aria-label={props.label}>
              <For each={props.options}>
                {(option, index) => (
                  <div
                    id={`${id}-${index()}`}
                    role="option"
                    aria-selected={option === props.value}
                    class={styles.dropdownOption}
                    classList={{ [styles.optionActive!]: active() === index() }}
                    onPointerMove={() => setActive(index())}
                    onClick={() => choose(index())}
                  >
                    <span class={styles.optionText}>
                      <span>{optionLabel(option)}</span>
                      <Show when={props.presentation?.[option]?.description}>
                        {(description) => (
                          <span class={styles.optionDescription}>{description()}</span>
                        )}
                      </Show>
                    </span>
                    <Show when={option === props.value}>
                      <span class={styles.optionCheck} aria-hidden="true">
                        ✓
                      </span>
                    </Show>
                  </div>
                )}
              </For>
            </div>
          </div>
        </Portal>
      </Show>
    </>
  );
}

export default function HeroCopy() {
  const current = currentFramework();
  const currentLibrary = useLibrary();
  let heroCopy!: HTMLDivElement;
  let layoutReady = false;
  const layoutAnimations = new Map<HTMLElement, Animation>();
  const updateLayout: LayoutUpdate = (update) => {
    if (!layoutReady) {
      update();
      return;
    }
    const elements = Array.from(heroCopy.querySelectorAll<HTMLElement>("[data-layout]"));
    // Capture visible positions so interrupted transitions continue smoothly.
    const before = elements.map((element) => element.getBoundingClientRect());
    layoutAnimations.forEach((animation) => animation.cancel());
    layoutAnimations.clear();
    update();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const after = elements.map((element) => element.getBoundingClientRect());
    elements.forEach((element, index) => {
      const x = before[index]!.left - after[index]!.left;
      const y = before[index]!.top - after[index]!.top;
      if (Math.abs(x) < 0.5 && Math.abs(y) < 0.5) return;
      // Wrap once, then translate into place without stretching the text.
      const animation = element.animate(
        [{ transform: `translate(${x}px, ${y}px)` }, { transform: "translate(0, 0)" }],
        { duration: 440, easing: "cubic-bezier(.16, 1, .3, 1)" },
      );
      layoutAnimations.set(element, animation);
      animation.onfinish = () => layoutAnimations.delete(element);
    });
  };
  onMount(() => {
    layoutReady = true;
  });
  onCleanup(() => layoutAnimations.forEach((animation) => animation.cancel()));
  const [copyStatus, setCopyStatus] = createSignal("");
  let packageName!: HTMLElement;
  let copyTimer: ReturnType<typeof setTimeout> | undefined;
  const copyPackage = async () => {
    clearTimeout(copyTimer);
    try {
      await navigator.clipboard.writeText("@olicoad/neodt");
      setCopyStatus("Copied!");
    } catch {
      const range = document.createRange();
      range.selectNodeContents(packageName);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      setCopyStatus("Selected — copy with your keyboard or menu.");
    }
    copyTimer = setTimeout(() => setCopyStatus(""), 2500);
  };
  onCleanup(() => clearTimeout(copyTimer));

  // The landing page rotates; actual demo entry pages keep their selected stack.
  const directPage = () => location.pathname !== "/" && location.pathname !== "/index.html";
  const [hovered, setHovered] = createSignal(false);
  const [focused, setFocused] = createSignal(false);
  const [editing, setEditing] = createSignal(false);
  const picking = () => directPage() || hovered() || focused() || editing();
  const [frameworkIndex, setFrameworkIndex] = createSignal(frameworks.indexOf(current.id));
  const [libraryIndex, setLibraryIndex] = createSignal(libraries.indexOf(currentLibrary.id));
  const hasChanges = () => framework() !== current.id || library() !== currentLibrary.id;
  const canGo = () => !directPage() || hasChanges();
  const showGo = () => hovered() || focused() || editing();
  const framework = () => frameworks[frameworkIndex()]!;
  const library = () => libraries[libraryIndex()]!;
  let rotatingSentence!: HTMLFormElement;

  const go = (event: SubmitEvent) => {
    event.preventDefault();
    if (canGo()) location.assign(demoPath(framework(), library()));
  };

  onMount(() => {
    if (!directPage() && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const entrance = rotatingSentence.animate(
        { opacity: [0, 1], transform: ["translateY(14px)", "translateY(0px)"] },
        {
          duration: 650,
          easing: "cubic-bezier(.16, 1, .3, 1)",
        },
      );
      onCleanup(() => entrance.cancel());
    }
    let p = 0;
    const timer = setInterval(() => {
      if (picking()) return;
      if (p++ % 2 === 0) {
        setFrameworkIndex((i) => (i + 1) % frameworks.length);
      } else {
        setLibraryIndex((i) => (i + 1) % libraries.length);
      }
    }, 2000);
    onCleanup(() => {
      window.clearInterval(timer);
    });
  });

  return (
    <div ref={heroCopy} class={styles.heroCopy}>
      <div data-layout class={styles.eyebrow}>
        THE DATETIME INPUT THAT FITS YOUR STACK
      </div>
      <h1 data-layout id="hero-title" class={styles.headline}>
        <span class={styles.headlineIntro}>DateTime,</span>
        <span class={styles.headlineAccent}>your way.</span>
      </h1>
      <form
        ref={rotatingSentence}
        class={styles.stackPicker}
        classList={{ [styles.picking!]: picking() }}
        aria-label="Choose your framework and datetime library"
        onSubmit={go}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") setHovered(true);
        }}
        onPointerLeave={() => setHovered(false)}
        onFocusIn={() => setFocused(true)}
        onFocusOut={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
        }}
      >
        <div class={styles.pickerRow}>
          <div class={styles.rotatingSentence}>
            <span class={styles.sentenceLine}>
              <span data-layout>For</span>
              <StackDropdown
                label="Framework"
                options={frameworks}
                presentation={frameworkPresentation}
                value={framework()}
                paused={picking()}
                updateLayout={updateLayout}
                onChange={(value) => {
                  setEditing(true);
                  setFrameworkIndex(frameworks.findIndex((id) => id === value));
                }}
              />
            </span>
            <span class={styles.sentenceLine}>
              <span data-layout>with</span>
              <StackDropdown
                label="Datetime library"
                options={libraries}
                presentation={libraryPresentation}
                value={library()}
                paused={picking()}
                updateLayout={updateLayout}
                onChange={(value) => {
                  setEditing(true);
                  setLibraryIndex(libraries.findIndex((id) => id === value));
                }}
              />
            </span>
          </div>
          <button
            data-layout
            type="submit"
            class={styles.goButton}
            classList={{ [styles.goVisible!]: showGo() }}
            disabled={!canGo()}
            tabIndex={showGo() ? 0 : -1}
            aria-hidden={!showGo()}
          >
            Go <span aria-hidden="true">→</span>
          </button>
        </div>
        <div data-layout class={styles.pickerActions}>
          <span>
            {directPage() ? "Your stack. Switch either option anytime." : "Choose your stack."}
          </span>
        </div>
      </form>
      <p data-layout class={styles.heroDescription}>
        A familiar, timezone-aware datetime input that works with the framework and datetime library
        you already use.
      </p>
      <p data-layout class={styles.packageDetails}>
        <button
          type="button"
          class={styles.packageName}
          onClick={copyPackage}
          aria-label="Copy @olicoad/neodt"
          title="Copy package name"
        >
          <code ref={packageName}>@olicoad/neodt</code>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            aria-hidden="true"
          >
            <rect x="8" y="8" width="12" height="12" rx="2" />
            <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
          </svg>
        </button>{" "}
        <a href="https://www.npmjs.com/package/@olicoad/neodt">
          <span>v{packageJson.version} on npm</span>
          <span aria-hidden="true"> ↗</span>
        </a>
        <span class={styles.copyStatus} role="status">
          {copyStatus()}
        </span>
      </p>
    </div>
  );
}
