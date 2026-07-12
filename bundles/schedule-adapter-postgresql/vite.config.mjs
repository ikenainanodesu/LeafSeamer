import { builtinModules } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig } from "vite";

const bundleDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    lib: { entry: path.join(bundleDir, "extension/index.ts"), formats: ["cjs"], fileName: () => "index.js" },
    outDir: path.join(bundleDir, "extension"),
    emptyOutDir: false,
    minify: false,
    rollupOptions: {
      external: (id) => id === "nodecg" || id.startsWith("nodecg/") || id === "pg" || id.startsWith("pg/") || builtinModules.includes(id.replace(/^node:/, "")),
      output: { exports: "auto" },
    },
  },
});
