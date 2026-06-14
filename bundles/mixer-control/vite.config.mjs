import { builtinModules } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const bundleDir = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(fs.readFileSync(path.join(bundleDir, "package.json")));
const dependencies = Object.keys(pkg.dependencies || {});
const isExternal = (id) =>
  id === "nodecg" ||
  id.startsWith("nodecg/") ||
  builtinModules.includes(id.replace(/^node:/, "")) ||
  dependencies.some((name) => id === name || id.startsWith(`${name}/`));
const findHtml = (directory) =>
  fs.existsSync(directory)
    ? fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const target = path.join(directory, entry.name);
        return entry.isDirectory()
          ? findHtml(target)
          : entry.name.endsWith(".html")
            ? [target]
            : [];
      })
    : [];

export default defineConfig(({ mode }) => {
  if (mode === "extension") {
    return {
      build: {
        lib: { entry: path.join(bundleDir, "extension/index.ts"), formats: ["cjs"], fileName: () => "index.js" },
        outDir: path.join(bundleDir, "extension"),
        emptyOutDir: false,
        minify: false,
        rollupOptions: { external: isExternal, output: { exports: "auto" } },
      },
    };
  }
  const srcDir = path.join(bundleDir, "src");
  const input = Object.fromEntries(
    findHtml(srcDir).map((file) => [
      path.relative(srcDir, file).replaceAll("\\", "/").replace(/\.html$/, ""),
      file,
    ])
  );
  return {
    root: srcDir,
    base: "./",
    plugins: [react()],
    build: {
      outDir: bundleDir,
      emptyOutDir: false,
      rollupOptions: { input, output: { entryFileNames: "[name]-[hash].js", chunkFileNames: "shared/[name]-[hash].js", assetFileNames: "shared/[name]-[hash].[ext]" } },
    },
  };
});
