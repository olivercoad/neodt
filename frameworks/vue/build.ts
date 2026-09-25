import { cp, readdir } from "node:fs/promises";
import path from "node:path";

import type { UserConfig } from "tsdown";
export default {
  plugins: [
    {
      name: "vue-components",
      resolveId(id) {
        if (id.endsWith(".vue")) return { id: `./${path.basename(id)}`, external: true };
      },
    },
  ],
  hooks: {
    "build:done": async () => {
      for (const file of await readdir("generated/vue"))
        if (file.endsWith(".vue")) await cp(`generated/vue/${file}`, `dist/vue/${file}`);
    },
  },
} satisfies UserConfig;
