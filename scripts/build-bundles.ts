import { build } from "vite";
import { glob } from "glob";
import path from "path";
import fs from "fs";
import react from "@vitejs/plugin-react";

async function buildBundles() {
  const bundlesDir = path.resolve(__dirname, "../bundles");
  if (!fs.existsSync(bundlesDir)) {
    console.error("Bundles directory not found.");
    process.exit(1);
  }

  const bundles = fs.readdirSync(bundlesDir).filter((file) => {
    return fs.statSync(path.join(bundlesDir, file)).isDirectory();
  });

  console.log(`Found ${bundles.length} bundles.`);

  for (const bundle of bundles) {
    const bundlePath = path.join(bundlesDir, bundle);
    const srcDir = path.join(bundlePath, "src");

    if (!fs.existsSync(srcDir)) {
      console.log(`Skipping ${bundle} (no src directory)`);
      continue;
    }

    console.log(`Building ${bundle}...`);

    // Find entry points (HTML files) in src/dashboard and src/graphics
    const entryPoints = glob.sync("**/*.html", { cwd: srcDir, absolute: true });

    if (entryPoints.length === 0) {
      console.log(`  No HTML entry points found in ${bundle}/src`);
      continue;
    }

    // Create input map for Rollup
    // Key should be relative path from bundle root to output file (minus extension for safety, though Rollup keys are arbitrary usually)
    // Actually, naming keys to match relative path helps structure output if we weren't being careful.
    // For local bundle dev, we want:
    // bundles/foo/src/graphics/bar.html -> bundles/foo/graphics/bar.html
    // bundles/foo/src/dashboard/baz.html -> bundles/foo/dashboard/baz.html

    const input: Record<string, string> = {};
    entryPoints.forEach((entry) => {
      // e.g. /path/to/bundles/graphics-package/src/graphics/lower-third.html
      const relativeToSrc = path.relative(srcDir, entry);
      // graphics/lower-third.html

      const name = relativeToSrc.replace(/\\/g, "/").replace(/\.html$/, "");
      // graphics/lower-third

      input[name] = entry;
    });

    try {
      await build({
        root: srcDir,
        base: "./",
        configFile: false,
        plugins: [react()],
        build: {
          outDir: path.join(bundlePath, "dist"),
          assetsDir: "shared",
          emptyOutDir: true,
          rollupOptions: {
            input: input,
          },
          write: true,
          minify: false,
        },
        resolve: {
          alias: {
            "@shared": path.resolve(__dirname, "../shared"),
          },
        },
      });
      console.log(`  ✓ Built ${bundle}`);
    } catch (e) {
      console.error(`  ✗ Failed to build ${bundle}`, e);
      process.exit(1);
    }
  }
}

buildBundles().catch((err) => {
  console.error(err);
  process.exit(1);
});
