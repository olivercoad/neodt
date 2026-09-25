// These framework checkers require the JavaScript compiler API. Keep the main
// project on TypeScript 7 while giving the checkers their own TypeScript 6.
module.exports = {
  hooks: {
    readPackage(pkg) {
      if (pkg.name === "vue-tsc" || pkg.name === "svelte-check") {
        delete pkg.peerDependencies?.typescript;
        pkg.dependencies = { ...pkg.dependencies, typescript: "6.0.3" };
      }
      return pkg;
    },
  },
};
