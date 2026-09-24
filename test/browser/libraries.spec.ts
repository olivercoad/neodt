import { expect, test } from "@playwright/test";

import { libraries, libraryPath } from "../../dev/libraries";

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const dependencyPatterns = Object.fromEntries(
  libraries
    .filter((library) => library.dependencies.length)
    .map((library) => [
      library.id,
      new RegExp(
        `/(?:${[...library.dependencies, ...library.demoPackages].map((name) => name.split("/").map(escapeRegExp).join("(?:/|_)")).join("|")})(?:[./_-]|$)`,
      ),
    ]),
);

for (const library of libraries) {
  test(`${library.id}: direct URLs preserve the library, query, and docs section`, async ({
    page,
  }) => {
    await page.goto(`/${library.id}?direct=1#/docs/libraries`);
    await expect(page).toHaveURL(`http://127.0.0.1:3000/${library.id}/?direct=1#/docs/libraries`);
    await expect(page.locator("html")).toHaveAttribute("data-adapter", library.id);
    await expect(page.getByRole("combobox", { name: "Datetime library" })).toHaveValue(library.id);
  });

  test(`${library.id}: loads only the selected datetime dependency`, async ({ page }) => {
    const modules: string[] = [];
    page.on("request", (request) => {
      if (request.resourceType() === "script") modules.push(decodeURIComponent(request.url()));
    });
    const supported =
      library.id !== "native-temporal" ||
      (await page.evaluate(() => typeof Temporal !== "undefined"));
    await page.goto(`${libraryPath(library.id)}#/docs/styling`);
    await expect(page.getByRole("combobox", { name: "Datetime library" })).toHaveValue(library.id);
    if (supported) {
      await expect(
        page
          .getByRole("article", { name: "Paper & ink" })
          .getByRole("spinbutton", { name: "hour", exact: true })
          .first(),
      ).toBeVisible();
    } else {
      await expect(
        page.getByRole("heading", { name: "Native Temporal is unavailable in this browser" }),
      ).toBeVisible();
    }
    const dependencies = modules.filter((url) => url.includes("/node_modules/"));
    for (const [name, pattern] of Object.entries(dependencyPatterns)) {
      expect(
        dependencies.some((url) => pattern.test(url)),
        `${name} in ${library.id}: ${dependencies.join("\n")}`,
      ).toBe(name === library.id);
    }
    expect(modules.some((url) => url.includes("/test/helpers/"))).toBe(false);
  });

  test(`${library.id}: the navigation selector preserves the docs section and reloads its entry`, async ({
    page,
  }) => {
    await page.goto("/temporal-polyfill/#/docs/libraries/temporal-polyfills");
    await page.getByRole("combobox", { name: "Datetime library" }).selectOption(library.id);
    await expect(page).toHaveURL(new RegExp(`/${library.id}/#/docs/libraries/temporal-polyfills$`));
    await expect(page.locator("html")).toHaveAttribute("data-adapter", library.id);
    await page.reload();
    await expect(page.getByRole("combobox", { name: "Datetime library" })).toHaveValue(library.id);
    if (library.id !== "temporal-polyfill") {
      await page.goBack();
      await expect(page.getByRole("combobox", { name: "Datetime library" })).toHaveValue(
        "temporal-polyfill",
      );
    }
  });
}
