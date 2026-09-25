import type { PluginOption } from "vite";
import solid from "vite-plugin-solid";
export const plugins = (): PluginOption[] => [solid()];
export const compiler = "tsc";
export const extension = "tsx";
export const render = (
  generic: boolean,
  callback: string,
) => `export const control = <Neodt ${generic ? "adapter={adapter}" : ""} referenceTime={referenceTime} onValueChange={value => { ${callback}; }} />;
// @ts-expect-error Mixed datetime values must be rejected.
<Neodt ${generic ? "adapter={adapter}" : ""} referenceTime={referenceTime} value="invalid" />;`;
export const wrap = (script: string) => script;
