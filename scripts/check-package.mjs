// Check the published surface from a directory with no unused datetime packages.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "vite";
import solid from "vite-plugin-solid";

const root = fileURLToPath(new URL("../", import.meta.url));
const temporary = await mkdtemp(path.join(tmpdir(), "neodt-consumer-"));
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const datetimePackages = [
  "@internationalized/date",
  "luxon",
  "moment",
  "dayjs",
  "date-fns",
  "spacetime",
  "@js-temporal/polyfill",
  "temporal-polyfill",
];
for (const name of datetimePackages) {
  assert(!packageJson.dependencies?.[name], `${name} must not be a runtime dependency`);
  assert(packageJson.peerDependenciesMeta?.[name]?.optional, `${name} must be an optional peer`);
}
const cases = [
  {
    name: "native",
    packages: [],
    entry: "",
    source: `const referenceTime = Temporal.Now.zonedDateTimeISO();`,
    callback: "value?.toInstant()",
  },
  {
    name: "custom-temporal",
    entry: "/generic",
    generic: true,
    packages: [],
    source: `import { createTemporalAdapter } from "@olicoad/neodt/adapters/temporal";
class Zoned {
  constructor(readonly epochMilliseconds: number, readonly timeZoneId: string) {}
  applicationMethod() { return "native"; }
}
const Temporal = { Instant: { fromEpochMilliseconds: (ms: number) => ({ toZonedDateTimeISO: (zone: string) => new Zoned(ms, zone) }) } };
const adapter = createTemporalAdapter(Temporal);
const referenceTime = new Zoned(0, "UTC");`,
    callback: "value?.applicationMethod()",
  },
  {
    name: "luxon",
    entry: "/luxon",
    packages: ["luxon", "@types/luxon"],
    source: `import { DateTime } from "luxon";
const referenceTime: DateTime = DateTime.now();`,
    callback: "value?.toISO()",
  },
  {
    name: "moment",
    entry: "/moment",
    packages: ["moment"],
    source: `import moment from "moment";
const referenceTime = moment();`,
    callback: "value?.format()",
  },
  {
    name: "dayjs",
    entry: "/dayjs",
    packages: ["dayjs"],
    source: `import dayjs from "dayjs";
const referenceTime = dayjs();`,
    callback: "value?.format()",
  },
  {
    name: "date-fns",
    entry: "/date-fns",
    packages: ["date-fns"],
    source: `const referenceTime = new Date();`,
    callback: "value?.getTime()",
  },
  {
    name: "spacetime",
    entry: "/spacetime",
    packages: ["spacetime"],
    source: `import spacetime from "spacetime";
const referenceTime = spacetime.now();`,
    callback: "value?.epoch",
  },
  {
    name: "internationalized-date",
    entry: "/internationalized-date",
    packages: ["@internationalized/date"],
    source: `import { now } from "@internationalized/date";
const referenceTime = now("Australia/Sydney");`,
    callback: "value?.toAbsoluteString()",
  },
  {
    name: "internationalized-date-adapter",
    entry: "/generic",
    generic: true,
    packages: ["@internationalized/date"],
    source: `import { fromAbsolute, now } from "@internationalized/date";
import { createInternationalizedDateAdapter } from "@olicoad/neodt/adapters/internationalized-date";
const adapter = createInternationalizedDateAdapter(fromAbsolute);
const referenceTime = now("Australia/Sydney");`,
    callback: "value?.toAbsoluteString()",
  },
  ...["@js-temporal/polyfill", "temporal-polyfill"].map((name) => ({
    name: name.replaceAll("/", "-"),
    entry: name === "temporal-polyfill" ? "/temporal-polyfill" : "/js-temporal-polyfill",
    packages: [name],
    source: `import { Temporal } from "${name}";
const referenceTime = Temporal.Now.zonedDateTimeISO();`,
    callback: "value?.toInstant()",
  })),
];

try {
  for (const fixture of cases) {
    const cwd = path.join(temporary, fixture.name);
    const installed = path.join(cwd, "node_modules", "@olicoad", "neodt");
    await mkdir(installed, { recursive: true });
    await cp(path.join(root, "dist"), path.join(installed, "dist"), { recursive: true });
    await writeFile(path.join(installed, "package.json"), JSON.stringify(packageJson));
    for (const name of ["solid-js", "@solid-primitives/resize-observer", ...fixture.packages]) {
      const target = path.join(cwd, "node_modules", name);
      await mkdir(path.dirname(target), { recursive: true });
      await symlink(await realpath(path.join(root, "node_modules", name)), target, "dir");
    }
    await writeFile(path.join(cwd, "package.json"), '{"name":"neodt-consumer","type":"module"}');
    await writeFile(
      path.join(cwd, "consumer.tsx"),
      `import Neodt, { parseNaturalDate, type NeodtProps, type NaturalDateParseOptions } from "@olicoad/neodt${fixture.entry}";
${fixture.source}
const result = parseNaturalDate("tomorrow", { ${fixture.generic ? "adapter, " : ""}referenceTime });
const same: typeof referenceTime | undefined = result;
export { same };
${
  fixture.generic
    ? `// @ts-expect-error The generic entry requires an adapter.
<Neodt referenceTime={referenceTime} />;`
    : `
const props: NeodtProps = { referenceTime };
const options: NaturalDateParseOptions = { referenceTime };
<Neodt {...props} />;
parseNaturalDate("now", options);
// @ts-expect-error Configured entries do not accept an adapter override.
<Neodt referenceTime={referenceTime} adapter={{}} />;
// @ts-expect-error Parser references must match the configured value type.
parseNaturalDate("now", { referenceTime: "invalid" });`
}

export const control = <Neodt ${fixture.generic ? "adapter={adapter} " : ""} referenceTime={referenceTime} onValueChange={value => { ${fixture.callback}; }} />;
// @ts-expect-error Mixed values must be rejected in the published declarations too.
<Neodt ${fixture.generic ? "adapter={adapter} " : ""} referenceTime={referenceTime} value="not a datetime" />;
`,
    );
    await writeFile(
      path.join(cwd, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          strict: true,
          skipLibCheck: false,
          target: "ESNext",
          lib: [fixture.name === "native" ? "ESNext" : "ES2022", "DOM"],
          module: "ESNext",
          moduleResolution: "bundler",
          jsx: "preserve",
          jsxImportSource: "solid-js",
          types: [],
          noEmit: true,
        },
        include: ["consumer.tsx"],
      }),
    );
    execFileSync(path.join(root, "node_modules/.bin/tsc"), ["-p", cwd], { cwd, stdio: "pipe" });
    const modules = new Set();
    const outputs = await build({
      configFile: false,
      root: cwd,
      logLevel: "silent",
      plugins: [
        solid(),
        {
          name: "record-modules",
          moduleParsed(module) {
            modules.add(module.id.replaceAll("\\\\", "/"));
          },
        },
      ],
      build: {
        write: false,
        minify: true,
        lib: { entry: path.join(cwd, "consumer.tsx"), formats: ["es"] },
      },
    });
    for (const name of datetimePackages.filter((name) => !fixture.packages.includes(name))) {
      assert(
        ![...modules].some((id) => id.includes(`/node_modules/${name}/`)),
        `${fixture.name} bundled unused ${name}`,
      );
    }
    const bundles = Array.isArray(outputs) ? outputs : [outputs];
    const bytes = bundles
      .flatMap((output) => output.output)
      .filter((output) => output.type === "chunk")
      .reduce((sum, output) => sum + Buffer.byteLength(output.code), 0);
    process.stdout.write(
      `${fixture.name}: isolated types and bundle passed (${bytes} JS bytes, including Solid and selected library)\n`,
    );
  }
} catch (error) {
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  throw new Error(error.message, { cause: error.stdout ? undefined : error });
} finally {
  await rm(temporary, { recursive: true, force: true });
}
