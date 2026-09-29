// Compile and bundle actual published entries with only the selected peers available.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "vite";

import { frameworks, frameworkPackages, packageEntry } from "../frameworks.ts";
import { loadFrameworkTooling } from "../frameworks/tooling.ts";
import { libraries, datetimePackages } from "../libraries.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const temporary = await mkdtemp(path.join(tmpdir(), "neodt-consumer-"));
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
for (const name of [...datetimePackages, ...frameworkPackages]) {
  assert(!packageJson.dependencies?.[name], `${name} must not be a runtime dependency`);
  assert(packageJson.peerDependenciesMeta?.[name]?.optional, `${name} must be an optional peer`);
}
assert(packageJson.exports["."], "The package root must provide Vanilla");
try {
  const [tarball] = JSON.parse(
    execFileSync("npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", temporary], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }),
  );
  execFileSync("tar", ["-xzf", path.join(temporary, tarball.filename), "-C", temporary]);
  for (const framework of frameworks) {
    const { consumer: host, plugins } = await loadFrameworkTooling(framework.id);
    for (const library of libraries) {
      const cwd = path.join(temporary, framework.id, library.id);
      const installed = path.join(cwd, "node_modules", "@olicoad", "neodt");
      await mkdir(installed, { recursive: true });
      await cp(path.join(temporary, "package"), installed, { recursive: true });
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
      const entry = packageEntry(framework.id, library.entry);
      if (!framework.serverRendering) {
        // Browser mounting must not prevent plain Node consumers from importing utilities.
        execFileSync(
          process.execPath,
          [
            "--input-type=module",
            "-e",
            `
          const entry = await import(${JSON.stringify(entry)});
          if (typeof entry.default !== "function" || typeof entry.parseNaturalDate !== "function")
            throw new Error("Missing browser mount or parser export");
        `,
          ],
          { cwd, stdio: "pipe" },
        );
      }
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
      const genericScript = `import Neodt, { parseNaturalDate, type NeodtProps } from "${packageEntry(framework.id, "/generic")}";
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
            experimentalDecorators: true,
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
      execFileSync(path.join(root, "node_modules/.bin", host.compiler), host.compilerArgs(cwd), {
        cwd,
        stdio: "pipe",
      });
      const modules = new Set();
      const bundle = await build({
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
      const retained = [bundle]
        .flat()
        .flatMap((result) => result.output)
        .filter((item) => item.type === "chunk")
        .flatMap((chunk) =>
          Object.entries(chunk.modules)
            .filter(([, module]) => module.renderedLength > 0)
            .map(([id]) => id.replaceAll("\\", "/")),
        );
      for (const id of retained) {
        const relative = path.relative(path.join(installed, "dist"), id).replaceAll("\\", "/");
        if (relative.startsWith("../")) continue;
        assert(
          relative.startsWith(`${framework.id}/`),
          `${entry} retained another framework: ${id}`,
        );
        const implementation = relative.match(/\/src\/libraries\/([^/]+)\.[jt]sx?$/)?.[1];
        assert(
          !implementation || implementation === library.id,
          `${entry} retained another adapter: ${id}`,
        );
      }
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
      // A utility re-export must not keep the component, its styles, or any peer alive.
      const utility = path.join(cwd, "utility.js");
      await writeFile(
        utility,
        `export { getNaturalDateCompletions } from ${JSON.stringify(entry)};`,
      );
      const utilityBundle = await build({
        configFile: false,
        root: cwd,
        logLevel: "silent",
        plugins: plugins("consumer"),
        build: { write: false, minify: true, lib: { entry: utility, formats: ["es"] } },
      });
      for (const item of [utilityBundle].flat().flatMap((result) => result.output)) {
        if (item.type === "asset") {
          assert(!item.fileName.endsWith(".css"), `${entry} utility retained CSS`);
          continue;
        }
        assert(!item.code.includes("datetime-neo"), `${entry} utility retained the UI`);
        for (const [id, module] of Object.entries(item.modules)) {
          if (!module.renderedLength) continue;
          for (const peer of [...datetimePackages, ...frameworkPackages])
            assert(
              !id.replaceAll("\\", "/").includes(`/node_modules/${peer}/`),
              `${entry} utility retained ${peer}`,
            );
        }
      }
      process.stdout.write(
        `${framework.id}/${library.id}: isolated types, examples, bundle and tree-shaking passed\n`,
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
