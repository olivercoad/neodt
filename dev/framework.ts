import { frameworks, demoPath, type FrameworkId } from "../frameworks";
export { frameworks, demoPath, type FrameworkId };
export const currentFramework = () =>
  frameworks.find(
    ({ id }) =>
      id ===
      (typeof document === "undefined" ? "solid" : document.documentElement.dataset.framework),
  ) ?? frameworks.find(({ id }) => id === "solid")!;
