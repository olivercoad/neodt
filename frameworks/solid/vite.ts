import type { PluginOption } from "vite";
import solid from "vite-plugin-solid";
export function plugins(server?: boolean): PluginOption[] {
  return [
    solid({
      ssr: server === undefined,
      include: ["**/frameworks/solid/**", "**/generated/solid/**", "**/test/**"],
      hot: false,
      solid: server === undefined ? undefined : { generate: server ? "ssr" : "dom" },
    }),
  ];
}
