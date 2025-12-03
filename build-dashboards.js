const esbuild = require("esbuild");
const { glob } = require("glob");
const path = require("path");

async function buildDashboards() {
  // Find all .tsx files in dashboard and graphics directories
  const tsxFiles = glob.sync("bundles/**/{dashboard,graphics}/*.tsx");

  console.log(`Found ${tsxFiles.length} files to build`);

  for (const file of tsxFiles) {
    const outfile = file.replace(".tsx", ".js");
    console.log(`Building ${file} -> ${outfile}`);

    try {
      await esbuild.build({
        entryPoints: [file],
        bundle: true,
        outfile: outfile,
        format: "esm",
        jsx: "automatic",
        platform: "browser",
        target: "es2020",
        external: [], // Bundle everything
        minify: false,
        sourcemap: true,
      });
      console.log(`  ✓ Built ${path.basename(outfile)}`);
    } catch (error) {
      console.error(`  ✗ Failed to build ${file}:`, error.message);
    }
  }

  console.log("Build complete!");
}

buildDashboards().catch(console.error);
