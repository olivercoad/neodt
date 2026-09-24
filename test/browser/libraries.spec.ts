import { expect, test, type Page } from "@playwright/test";

import { libraries, libraryPath } from "../../dev/libraries";

async function expectLibrary(page: Page, library: (typeof libraries)[number]) {
  if (await page.getByRole("combobox", { name: "Datetime library" }).count()) {
    await expect(page.getByRole("combobox", { name: "Datetime library" })).toHaveValue(library.id);
  } else {
    await expect(page.getByLabel("Datetime library", { exact: true })).toContainText(library.label);
  }
}

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
    await expectLibrary(page, library);
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
    await expectLibrary(page, library);
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
    await page.getByLabel("Datetime library", { exact: true }).click();
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: library.label, exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/${library.id}/#/docs/libraries/temporal-polyfills$`));
    await expect(page.locator("html")).toHaveAttribute("data-adapter", library.id);
    await page.reload();
    await expectLibrary(page, library);
    if (library.id !== "temporal-polyfill") {
      await page.goBack();
      await expectLibrary(
        page,
        libraries.find(({ id }) => id === "temporal-polyfill")!,
      );
    }
  });
}
