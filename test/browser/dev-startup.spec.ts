import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { expect, test } from "@playwright/test";
import { createServer } from "vite";

import { frameworks } from "../../frameworks";
import { libraries } from "../../libraries";

test("cold startup serves every entry point without reloading open pages", async ({
  page,
  context,
}) => {
  test.setTimeout(90_000);
  // A shared, warmed Vite cache hides dependencies missed by the startup scan.
  const cacheDir = await mkdtemp(path.join(tmpdir(), "neodt-vite-"));
  const server = await createServer({
    root: path.resolve("dev"),
    cacheDir,
    logLevel: "error",
    server: { host: "127.0.0.1", port: 0, strictPort: false, open: false },
  });
  try {
    await server.listen();
    const baseURL = server.resolvedUrls!.local[0]!;
    const reloads: string[] = [];
    const failures: string[] = [];
    context.on("response", (response) => {
      if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
    });
    page.on("websocket", (socket) => {
      socket.on("framereceived", ({ payload }) => {
        if (JSON.parse(String(payload)).type === "full-reload") reloads.push(String(payload));
      });
    });
    let documents = 0;
    page.on("request", (request) => {
      if (request.resourceType() === "document") documents++;
    });
    await page.goto(`${baseURL}vanilla/internationalized-date/#/docs/api`);
    await expect(page.locator("#natural-language-parser")).toBeVisible();

    // Discovering dependencies in another tab used to invalidate this page's modules.
    const visitor = await context.newPage();
    try {
      const demos = [
        ...frameworks.map(({ id }) => `${id}/native-temporal/`),
        ...libraries.map(({ id }) => `vanilla/${id}/`),
      ];
      for (const demo of demos) {
        await visitor.goto(`${baseURL}${demo}?fixture=layout`);
        await expect(visitor.locator("#host .datetime-neo")).toBeVisible();
      }
      for (const { id } of frameworks.filter(({ serverRendering }) => serverRendering)) {
        await visitor.goto(`${baseURL}@neodt/hydration/${id}`);
        await expect(visitor.locator("html")).toHaveAttribute("data-hydrated", "true");
      }
      expect(failures).toEqual([]);
      expect(reloads).toEqual([]);
      expect(documents).toBe(1);
    } finally {
      await visitor.close();
    }
  } finally {
    await server.close();
    await rm(cacheDir, { recursive: true, force: true });
  }
});
