// Compare the working tree with a git revision using the same Node and Luxon.
// Timing is diagnostic, not a CI threshold: node --expose-gc scripts/bench-core.mjs [revision]
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { DateTime } from "luxon";
import { build } from "vite";

const root = path.resolve(import.meta.dirname, "..");
const revision = process.argv[2] ?? "HEAD";
const temporary = await mkdtemp(path.join(root, "node_modules", ".core-bench-"));
const iterations = { create: 200, edit: 500, unchanged: 10000, parse: 500, calendar: 10000 };
const results = {};
let checksum = 0;
try {
  const before = path.join(temporary, "before");
  await mkdir(before);
  const archive = execFileSync("git", ["archive", revision, "src"], { cwd: root });
  execFileSync("tar", ["-x", "-C", before], { input: archive });
  const implementations = {};
  for (const [name, directory] of Object.entries({ before, after: root })) {
    const entry = path.join(temporary, `${name}.ts`);
    await writeFile(
      entry,
      [
        ["createController", "core/controller"],
        ["createLuxonAdapter", "libraries/luxon"],
        ["parseNaturalDate", "natural-parser"],
        ["calendarDate", "calendar"],
      ]
        .map(
          ([symbol, file]) =>
            `export { ${symbol} } from ${JSON.stringify(`${directory}/src/${file}.ts`)};`,
        )
        .join("\n"),
    );
    const bundle = await build({
      configFile: false,
      root,
      logLevel: "silent",
      build: {
        write: false,
        target: "es2022",
        minify: "oxc",
        rolldownOptions: {
          input: entry,
          external: ["luxon"],
          preserveEntrySignatures: "strict",
          output: { format: "es" },
        },
      },
    });
    const output = path.join(temporary, `${name}.mjs`);
    await writeFile(output, bundle.output.find((item) => item.type === "chunk").code);
    implementations[name] = await import(pathToFileURL(output));
  }
  const referenceTime = DateTime.fromISO("2026-08-17T15:30:00", { zone: "Australia/Melbourne" });
  const dates = Array.from({ length: 31 }, (_, index) => referenceTime.plus({ days: index }));
  const expressions = ["tomorrow 9am", "in 3 days", "next friday", "2026-12-25", "3 months ago"];
  const tasks = {};
  for (const [name, api] of Object.entries(implementations)) {
    const adapter = api.createLuxonAdapter(DateTime);
    const props = {
      adapter,
      referenceTime,
      defaultValue: referenceTime,
      locale: "en-GB",
      id: "bench",
    };
    const controller = api.createController(props);
    tasks[name] = {
      create() {
        const instance = api.createController(props);
        checksum += instance.getSnapshot().segmentCount;
        instance.unmount();
      },
      edit(index) {
        controller.update({ ...props, value: dates[index % dates.length] });
        checksum += controller.getSnapshot().nativeValue.length;
      },
      unchanged() {
        controller.update(props);
        checksum += controller.getSnapshot().segmentCount;
      },
      parse(index) {
        const value = api.parseNaturalDate(expressions[index % expressions.length], {
          adapter,
          referenceTime,
        });
        checksum += value.day;
      },
      calendar(index) {
        const value = api.calendarDate(adapter, dates[index % dates.length]);
        checksum += value.year + value.month + value.day + value.hour + value.minute;
      },
    };
    results[name] = {};
  }
  for (const [task, count] of Object.entries(iterations)) {
    const samples = { before: [], after: [] };
    for (const name of ["before", "after"])
      for (let index = 0; index < count; index++) tasks[name][task](index);
    for (let round = 0; round < 9; round++) {
      // Alternate order to reduce warmup/load bias; collect GC outside the timed region.
      for (const name of round % 2 ? ["after", "before"] : ["before", "after"]) {
        globalThis.gc?.();
        const start = performance.now();
        for (let index = 0; index < count; index++) tasks[name][task](index);
        samples[name].push(((performance.now() - start) * 1000) / count);
      }
    }
    for (const name of ["before", "after"])
      results[name][task] = samples[name].sort((a, b) => a - b)[4];
  }
  process.stdout.write(
    `${JSON.stringify({ revision, node: process.version, unit: "median microseconds/operation", iterations, results, checksum }, null, 2)}\n`,
  );
} finally {
  await rm(temporary, { recursive: true, force: true });
}
