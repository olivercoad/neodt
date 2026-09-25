// Compile and bundle actual published entries with only the selected peers available.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "vite";

import { frameworks, frameworkPackages } from "../frameworks.ts";
import { loadFrameworkTooling } from "../frameworks/tooling.ts";
import { libraries, datetimePackages } from "../libraries.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const temporary = await mkdtemp(path.join(tmpdir(), "neodt-consumer-"));
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
for (const name of [...datetimePackages, ...frameworkPackages]) {
  assert(!packageJson.dependencies?.[name], `${name} must not be a runtime dependency`);
  assert(packageJson.peerDependenciesMeta?.[name]?.optional, `${name} must be an optional peer`);
}
assert(!packageJson.exports["."], "Framework-less compatibility entries must not be published");
try {
  for (const framework of frameworks) {
    const { consumer: host, plugins } = await loadFrameworkTooling(framework.id);
    for (const library of libraries) {
      const cwd = path.join(temporary, framework.id, library.id);
      const installed = path.join(cwd, "node_modules", "@olicoad", "neodt");
      await mkdir(installed, { recursive: true });
      await cp(path.join(root, "dist"), path.join(installed, "dist"), { recursive: true });
      await writeFile(path.join(installed, "package.json"), JSON.stringify(packageJson));
      const packages = [
        ...framework.packages,
        ...framework.typePackages,
        ...library.dependencies,
        ...library.typePackages,
      ];
      for (const name of packages) {
        const target = path.join(cwd, "node_modules", name);
        await mkdir(path.dirname(target), { recursive: true });
        await symlink(await realpath(path.join(root, "node_modules", name)), target, "dir");
      }
      await writeFile(path.join(cwd, "package.json"), '{"name":"neodt-consumer","type":"module"}');
      const entry = `@olicoad/neodt/${framework.id}${library.entry}`;
      const filename = `consumer.${host.extension}`;
      const script = `import Neodt, { parseNaturalDate, type NeodtProps, type NaturalDateParseOptions } from "${entry}";
${library.imports}
const referenceTime: ${library.type} = ${library.now};
const props: NeodtProps = { referenceTime };
const options: NaturalDateParseOptions = { referenceTime };
const result: typeof referenceTime | undefined = parseNaturalDate("tomorrow", options);
// @ts-expect-error References must match the configured value type.
parseNaturalDate("now", { referenceTime: "invalid" });
// @ts-expect-error Configured entries do not accept an adapter override.
const invalidProps: NeodtProps = { referenceTime, adapter: {} };
${host.render(false, library.callback)}
`;
      await writeFile(path.join(cwd, filename), host.wrap(script));
      const genericScript = `import Neodt, { parseNaturalDate, type NeodtProps } from "@olicoad/neodt/${framework.id}/generic";
import { ${library.factory} } from "${entry}";
${library.imports}
const adapter = ${library.factory}(${library.implementation});
const referenceTime: ${library.type} = ${library.now};
const parsed: typeof referenceTime | undefined = parseNaturalDate("now", { adapter, referenceTime });
// @ts-expect-error The adapter is required.
const invalidProps: NeodtProps<typeof referenceTime> = { referenceTime };
${host.render(true, library.callback)}
`;
      await writeFile(path.join(cwd, `generic.${host.extension}`), host.wrap(genericScript));
      // Documentation examples are part of the same isolated consumer check.
      await writeFile(path.join(cwd, `example.${host.extension}`), framework.example(library));
      await writeFile(
        path.join(cwd, "tsconfig.json"),
        JSON.stringify({
          compilerOptions: {
            strict: true,
            skipLibCheck: false,
            target: "ESNext",
            lib: [library.id === "native-temporal" ? "ESNext" : "ES2022", "DOM"],
            module: "ESNext",
            moduleResolution: "bundler",
            jsx: framework.jsx,
            jsxImportSource: framework.jsxImportSource,
            types: [],
            noEmit: true,
          },
          include: [`*.${host.extension}`],
        }),
      );
      execFileSync(path.join(root, "node_modules/.bin", host.compiler), ["-p", cwd], {
        cwd,
        stdio: "pipe",
      });
      const modules = new Set();
      await build({
        configFile: false,
        root: cwd,
        logLevel: "silent",
        plugins: [
          ...plugins("consumer"),
          {
            name: "record-modules",
            moduleParsed(module) {
              modules.add(module.id.replaceAll("\\", "/"));
            },
          },
        ],
        build: {
          write: false,
          minify: true,
          lib: {
            entry: [path.join(cwd, filename), path.join(cwd, `generic.${host.extension}`)],
            formats: ["es"],
          },
        },
      });
      for (const name of [...datetimePackages, ...frameworkPackages].filter(
        (name) => !packages.includes(name),
      ))
        assert(
          ![...modules].some((id) => id.includes(`/node_modules/${name}/`)),
          `${framework.id}/${library.id} bundled unused ${name}`,
        );
      const publicFile = await readFile(
        path.join(
          installed,
          "dist",
          framework.id,
          `${library.entry.slice(1) || "index"}.${framework.outputExtension}`,
        ),
        "utf8",
      );
      assert(
        !/\bintegration\b|["'](?:moment-timezone|dayjs\/plugin[^"']*)["']/.test(publicFile),
        "Demo initialization leaked into the package",
      );
      process.stdout.write(
        `${framework.id}/${library.id}: isolated types, examples and bundle passed\n`,
      );
    }
  }
} catch (error) {
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  throw error;
} finally {
  await rm(temporary, { recursive: true, force: true });
}
