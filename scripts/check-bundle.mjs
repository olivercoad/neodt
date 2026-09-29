// Measure production browser bundles, including the published 0.2.0 baseline.
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { gzipSync, brotliCompressSync } from "node:zlib";

import { build } from "vite";
import solid from "vite-plugin-solid";

import { frameworkPackages } from "../frameworks.ts";
import { datetimePackages } from "../libraries.ts";

const root = path.resolve(import.meta.dirname, "..");
const temporary = await mkdtemp(path.join(root, "node_modules", ".bundle-check-"));
const sizes = (source) => ({
  bytes: Buffer.byteLength(source),
  gzip: gzipSync(source, { level: 9 }).length,
  brotli: brotliCompressSync(source).length,
});
const shared = `import { render } from "solid-js/web";
import { DateTime } from "luxon";
const referenceTime = DateTime.now();
`;
const fixtures = {
  baseline: `${shared}render(() => <span>{referenceTime.toISO()}</span>, document.body);`,
  "0.2.0": `${shared}import Neodt from "neodt-v02";
render(() => <Neodt referenceTime={referenceTime} onValueChange={value => console.log(value?.toISO())} />, document.body);`,
  current: `${shared}import Neodt from "@olicoad/neodt/solid/luxon";
render(() => <Neodt referenceTime={referenceTime} onValueChange={value => console.log(value?.toISO())} />, document.body);`,
  parser: `import { parseNaturalDate } from "@olicoad/neodt/solid/luxon";
import { DateTime } from "luxon";
console.log(parseNaturalDate(location.hash.slice(1), { referenceTime: DateTime.now() }));`,
  completions: `import { getNaturalDateCompletions } from "@olicoad/neodt/solid/luxon";
console.log(getNaturalDateCompletions(location.hash.slice(1)));`,
  adapter: `import { createLuxonAdapter } from "@olicoad/neodt/solid/luxon";
console.log(createLuxonAdapter);`,
  unused: `import Neodt from "@olicoad/neodt/solid/luxon";
console.log("unused");`,
  core: `export { createController } from ${JSON.stringify(path.join(root, "src/core/controller.ts"))};`,
};
const results = {};
try {
  for (const [name, source] of Object.entries(fixtures)) {
    const entry = path.join(temporary, `${name}.jsx`);
    await writeFile(entry, source);
    const result = await build({
      configFile: false,
      root,
      logLevel: "silent",
      plugins: [solid()],
      build: {
        write: false,
        target: "es2022",
        minify: "oxc",
        cssMinify: "lightningcss",
        rolldownOptions: {
          input: entry,
          preserveEntrySignatures: "strict",
          output: { format: "es" },
        },
      },
    });
    const chunks = result.output.filter((item) => item.type === "chunk");
    const js = chunks.map((item) => item.code).join("\n");
    const css = result.output
      .filter((item) => item.type === "asset" && item.fileName.endsWith(".css"))
      .map((item) => item.source)
      .join("\n");
    const modules = chunks.flatMap((chunk) =>
      Object.entries(chunk.modules)
        .filter(([, module]) => module.renderedLength > 0)
        .map(([id]) => id.replaceAll("\\", "/")),
    );
    results[name] = { js: sizes(js), css: css ? sizes(css) : { bytes: 0, gzip: 0, brotli: 0 } };
    if (["current", "0.2.0"].includes(name)) {
      assert(js.includes("datetime-neo__"), `${name} lost the UI`);
      assert(css.includes(".datetime-neo"), `${name} lost its styles`);
    }
    if (name !== "0.2.0") {
      for (const peer of [...frameworkPackages, ...datetimePackages]) {
        if (["solid-js", "luxon"].includes(peer)) continue;
        assert(
          !modules.some((id) => id.includes(`/node_modules/${peer}/`)),
          `${name} retained ${peer}`,
        );
      }
      assert(
        !modules.some((id) => /\/dist\/(react|vue|svelte|angular|lit|vanilla)\//.test(id)),
        `${name} retained another framework`,
      );
    }
    if (
      !process.argv.includes("--measure-only") &&
      ["parser", "completions", "adapter", "unused"].includes(name)
    ) {
      assert(!js.includes("datetime-neo__"), `${name} retained the UI`);
      assert.equal(css, "", `${name} retained the component styles`);
      assert(
        !modules.some((id) => id.includes("/node_modules/solid-js/")),
        `${name} retained Solid`,
      );
      if (["completions", "adapter", "unused"].includes(name))
        assert(
          !modules.some((id) => id.includes("/node_modules/luxon/")),
          `${name} retained Luxon`,
        );
    }
  }
  for (const name of ["0.2.0", "current"]) {
    results[name].contribution = Object.fromEntries(
      Object.keys(results[name].js).map((metric) => [
        metric,
        results[name].js[metric] - results.baseline.js[metric] + results[name].css[metric],
      ]),
    );
  }
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
