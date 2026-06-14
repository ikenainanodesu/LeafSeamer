import { builtinModules } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";

const bundleDir = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  fs.readFileSync(path.join(bundleDir, "package.json"), "utf8")
);
const dependencies = Object.keys(pkg.dependencies || {});

export default defineConfig({
  build: {
    lib: {
      entry: path.join(bundleDir, "extension/index.ts"),
      formats: ["cjs"],
      fileName: () => "index.js",
    },
    outDir: path.join(bundleDir, "extension"),
    emptyOutDir: false,
    minify: false,
    rollupOptions: {
      external: (id) =>
        id === "nodecg" ||
        id.startsWith("nodecg/") ||
        builtinModules.includes(id.replace(/^node:/, "")) ||
        dependencies.some(
          (dependency) =>
            id === dependency || id.startsWith(`${dependency}/`)
        ),
      output: { exports: "auto" },
    },
  },
});
