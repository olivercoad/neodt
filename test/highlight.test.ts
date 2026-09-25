import { expect, it } from "vitest";

import { highlight } from "../dev/code/highlight";

it("highlights JavaScript expressions inside Svelte attributes", () => {
  const source = "<Neodt onValueChange={next => { value = next; }} />";
  const svelte = highlight(source, "svelte");

  expect(svelte).toContain('class="token language-javascript"');
  expect(svelte).toContain('class="token operator"');
  expect(svelte).not.toBe(highlight(source, "html"));
  const code = document.createElement("code");
  code.innerHTML = svelte;
  expect(code.textContent).toBe(source);
});
