import ts from "typescript-api";

import type { FrameworkTooling } from "../tooling.ts";
function compiler() {
  return {
    name: "angular-decorators",
    transform(code: string, id: string) {
      if (!/\/generated\/angular\/.*\.ts$/.test(id)) return;
      return {
        code: ts.transpileModule(code, {
          compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ESNext,
            experimentalDecorators: true,
          },
        }).outputText,
        map: null,
      };
    },
  };
}
export default {
  plugins: () => [compiler()],
  build: { plugins: [compiler()] },
  transformGenerated(source) {
    return (
      "// @ts-nocheck\n" +
      source
        .replace("  Input,", "  Input,\n  inject,\n  PLATFORM_ID,")
        .replace("import { CommonModule }", "import { isPlatformBrowser, CommonModule }")
        .replace(
          "constructor(private renderer: Renderer2) {}",
          "renderer = inject(Renderer2); isBrowser = isPlatformBrowser(inject(PLATFORM_ID));",
        )
        .replaceAll(/from "\.\/(\w+)\.js"/g, 'from "./$1"')
        .replaceAll(/\[attr\.(readOnly|disabled|value)\]/g, "[$1]")
        .replaceAll("[attr.tabIndex]", "[attr.tabindex]")
        .replaceAll("[attr.contentEditable]", "[attr.contenteditable]")
        .replaceAll("[attr.spellCheck]", "[attr.spellcheck]")
        .replaceAll("[attr.inputMode]", "[attr.inputmode]")
        .replaceAll(/\s*\[attr\.suppressContentEditableWarning\]="[^"]*"/g, "")
        .replace("this.controller.mount(this.element?.nativeElement);", "")
        .replace(
          "  _listenerFns =",
          "  _attributes = new WeakMap<HTMLElement, Record<string, unknown>>();\n  _listenerFns =",
        )
        .replace(
          'const target = typeof changes === "undefined" ? value : changes;',
          `const target = value;
    for (const key of Object.keys(this._attributes.get(el) ?? {})) {
      if (!(key in target)) {
        this.renderer.removeAttribute(el, key.toLowerCase());
        this._listenerFns.get(key)?.();
        this._listenerFns.delete(key);
      }
    }
    this._attributes.set(el, { ...target });`,
        )
        .replace(
          'this.renderer.setAttribute(el, key.toLowerCase(), target[key] ?? "");',
          `if (target[key] == null) this.renderer.removeAttribute(el, key.toLowerCase());
        else this.renderer.setAttribute(el, key.toLowerCase(), String(target[key]));`,
        )
        .replace(
          "ngAfterViewInit() {",
          "ngAfterViewInit() {\n    if (this.isBrowser) this.controller.mount(this.element?.nativeElement);",
        )
        .replace(
          "ngOnChanges(changes: SimpleChanges) {",
          "ngAfterViewChecked() { this.controller.afterRender(); }\n\n  ngOnChanges(changes: SimpleChanges) {",
        )
    );
  },
  consumer: {
    extension: "ts",
    render: (generic, callback) =>
      `export const control: InstanceType<typeof Neodt${generic ? "<typeof referenceTime, typeof adapter extends import('@olicoad/neodt/angular/generic').DateAdapter<infer _T, infer Z> ? Z : never>" : ""}>["props"] = { ${generic ? "adapter," : ""} referenceTime, onValueChange: value => { ${callback}; } };\n// @ts-expect-error Mixed datetime values must be rejected.\nconst invalid: typeof control = { ...control, value: "invalid" };`,
  },
} satisfies FrameworkTooling;
