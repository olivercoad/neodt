import path from "node:path";

import type { UserConfig } from "tsdown";
import type { PluginOption } from "vite";

import { frameworks, type FrameworkId } from "../frameworks.ts";

export type ToolingMode = "development" | "client-test" | "server-test" | "consumer";
export type FrameworkTooling = {
  plugins?: (context: { mode: ToolingMode; include: string[] }) => PluginOption[];
  build?: UserConfig;
  consumer?: {
    compiler?: string;
    extension?: string;
    render?: (generic: boolean, callback: string) => string;
    wrap?: (script: string) => string;
  };
};

/** Defaults cover JSX frameworks; native compilers and syntax override only what differs. */
export async function loadFrameworkTooling(id: FrameworkId): Promise<{
  plugins: (mode: ToolingMode) => PluginOption[];
  build: UserConfig;
  consumer: Required<NonNullable<FrameworkTooling["consumer"]>>;
}> {
  const framework = frameworks.find((framework) => framework.id === id)!;
  const { default: tooling }: { default: FrameworkTooling } = await import(
    path.resolve(import.meta.dirname, id, "tooling.ts")
  );
  return {
    plugins: (mode: ToolingMode) =>
      tooling.plugins?.({
        mode,
        include: [`**/frameworks/${id}/**`, `**/generated/${id}/**`],
      }) ?? [],
    build: {
      outExtensions: () => ({ js: `.${framework.outputExtension}` }),
      ...(framework.jsx === "react-jsx"
        ? {
            inputOptions: {
              transform: {
                jsx: { runtime: "automatic" as const, importSource: framework.jsxImportSource },
              },
            },
          }
        : {}),
      ...tooling.build,
    } satisfies UserConfig,
    consumer: {
      compiler: "tsc",
      extension: framework.sourceExtension,
      render: (generic: boolean, callback: string) =>
        `export const control = <Neodt ${generic ? "adapter={adapter}" : ""} referenceTime={referenceTime} onValueChange={value => { ${callback}; }} />;
// @ts-expect-error Mixed datetime values must be rejected.
<Neodt ${generic ? "adapter={adapter}" : ""} referenceTime={referenceTime} value="invalid" />;`,
      wrap: (script: string) => script,
      ...tooling.consumer,
    },
  };
}
