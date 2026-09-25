import { example as reactExample } from "./frameworks/react/example.ts";
import { example as solidExample } from "./frameworks/solid/example.ts";
import { example as vueExample } from "./frameworks/vue/example.ts";
/** Metadata only. All generation, package and documentation matrices derive from this registry. */
export const frameworks = [
  {
    id: "solid",
    example: solidExample,
    codeLanguage: "tsx",
    sourceExtension: "tsx",
    outputExtension: "jsx",
    label: "Solid",
    target: "solid",
    generator: "componentToSolid",
    extension: "jsx",
    packages: ["solid-js"],
    typePackages: [],
    jsxImportSource: "solid-js",
    jsx: "preserve",
    options: {},
  },
  {
    id: "react",
    example: reactExample,
    codeLanguage: "tsx",
    sourceExtension: "tsx",
    outputExtension: "js",
    label: "React",
    target: "react",
    generator: "componentToReact",
    extension: "jsx",
    packages: ["react", "react-dom"],
    typePackages: ["@types/react", "@types/react-dom"],
    jsxImportSource: "react",
    jsx: "react-jsx",
    options: {},
  },
  {
    id: "vue",
    example: vueExample,
    codeLanguage: "html",
    sourceExtension: "ts",
    outputExtension: "js",
    label: "Vue",
    target: "vue",
    generator: "componentToVue",
    extension: "vue",
    packages: ["vue"],
    typePackages: [],
    jsxImportSource: "vue",
    jsx: "preserve",
    options: { api: "composition" },
  },
] as const;
export type FrameworkId = (typeof frameworks)[number]["id"];
export const frameworkPackages = [
  ...new Set(frameworks.flatMap((framework) => [...framework.packages])),
];
export const demoPath = (framework: FrameworkId, library: string) => `/${framework}/${library}/`;
