import type { MitosisComponent, MitosisNode } from "@builder.io/mitosis";

// Render shared view components as keyed template functions for Lit and Vanilla.
// Mitosis 0.14's Lit target loses classes and emits invalid spreads/class bindings.
export function generateComponent(component: MitosisComponent, runtime = "lit") {
  const expression = (code: string) => `\${${code}}`;
  const template = (nodes: MitosisNode[]) => `html\`${nodes.map(node).join("")}\``;
  function node(item: MitosisNode): string {
    if (item.properties._text !== undefined) return item.properties._text;
    if (item.bindings._text) return expression(item.bindings._text.code);
    if (item.name === "Fragment") return item.children.map(node).join("");
    if (item.name === "Show")
      return expression(
        `${item.bindings.when!.code} ? ${template(item.children)} : ${item.meta.else ? template([item.meta.else as unknown as MitosisNode]) : "nothing"}`,
      );
    if (item.name === "For") {
      const scope = item.scope as { forName: string; indexName?: string };
      const args = `${scope.forName}, ${scope.indexName ?? "index"}`;
      const key = item.children[0]?.bindings.key?.code ?? scope.indexName ?? "index";
      return expression(
        `repeat(${item.bindings.each!.code}, (${args}) => ${key}, (${args}) => ${template(item.children)})`,
      );
    }
    if (/^[A-Z]/.test(item.name)) {
      const props = Object.entries(item.bindings)
        .filter(([key]) => key !== "key")
        .map(([key, binding]) => `${key}: ${binding!.code}`);
      return expression(`${item.name}({${props.join(",")}})`);
    }
    const attrs = Object.entries(item.properties).map(
      ([key, value]) => `${key}=${JSON.stringify(value)}`,
    );
    for (const [key, binding] of Object.entries(item.bindings)) {
      if (!binding || ["key", "ref", "suppressContentEditableWarning"].includes(key)) continue;
      if (binding.type === "spread") {
        // Bindings apply other native attributes to their host or rendered root.
        attrs.push(
          `class=${expression(`${binding.code}.class`)}`,
          `style=${expression(`ifDefined(${binding.code}.style)`)}`,
        );
      } else if (key.startsWith("on")) {
        attrs.push(
          `@${key.slice(2).toLowerCase()}=${expression(`(${binding.arguments?.join(",") ?? "event"}) => { ${binding.code} }`)}`,
        );
      } else if (["disabled", "readOnly"].includes(key)) {
        attrs.push(`?${key.toLowerCase()}=${expression(binding.code)}`);
      } else if (key === "value") {
        attrs.push(`.value=${expression(binding.code)}`);
      } else {
        attrs.push(`${key.toLowerCase()}=${expression(`ifDefined(${binding.code})`)}`);
      }
    }
    const open = `<${item.name} ${attrs.join(" ")}>`;
    return ["input", "br", "hr"].includes(item.name)
      ? open
      : `${open}${item.children.map(node).join("")}</${item.name}>`;
  }
  const imports = component.imports
    .map(
      (item) =>
        `import ${Object.keys(item.imports)[0]} from ${JSON.stringify(item.path.replace(".lite", ".ts"))};`,
    )
    .join("\n");
  return `// @ts-nocheck\n// Generated from the shared Mitosis view; lifecycle belongs to the binding.
import { html, nothing } from "${runtime}";
import { ifDefined } from "${runtime}/directives/if-defined.js";
import { repeat } from "${runtime}/directives/repeat.js";
${imports}
export default function ${component.name}(props) { return ${template(component.children)}; }
`;
}
