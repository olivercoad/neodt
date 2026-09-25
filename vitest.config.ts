import { defineConfig, type ViteUserConfig } from "vitest/config";

import { frameworkPlugins } from "./dev/framework-plugin.ts";

export default defineConfig(async ({ mode }): Promise<ViteUserConfig> => {
  // to test in server environment, run with "--mode ssr" or "--mode test:ssr" flag
  // loads only server.test.ts file
  const testSSR = mode === "test:ssr" || mode === "ssr";

  return {
    plugins: await frameworkPlugins(testSSR ? "server-test" : "client-test"),
    oxc: { jsx: { development: !testSSR } },
    test: {
      watch: false,
      isolate: !testSSR,
      env: {
        NODE_ENV: testSSR ? "production" : "development",
      },
      environment: testSSR ? "node" : "jsdom",
      ...(testSSR
        ? {
            include: ["test/server.test.{ts,tsx}", "test/framework-server.test.ts"],
          }
        : {
            include: ["test/*.test.{ts,tsx}"],
            exclude: ["test/server.test.{ts,tsx}", "test/framework-server.test.ts"],
          }),
    },
    resolve: {
      conditions: testSSR ? ["node"] : ["browser", "development"],
    },
    define: {
      "import.meta.env.DEV": JSON.stringify(!testSSR),
      "import.meta.env.PROD": JSON.stringify(testSSR),
      "import.meta.env.SSR": JSON.stringify(testSSR),
    },
  };
});
