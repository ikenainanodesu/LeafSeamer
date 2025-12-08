import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

async function buildBundles() {
  const bundlesDir = path.resolve(__dirname, "../bundles");

  if (!fs.existsSync(bundlesDir)) {
    console.error("Bundles directory not found.");
    process.exit(1);
  }

  // 获取所有bundles,排除frontend-assets
  const bundles = fs.readdirSync(bundlesDir).filter((file) => {
    const bundlePath = path.join(bundlesDir, file);
    const stats = fs.statSync(bundlePath);
    return stats.isDirectory() && file !== "frontend-assets";
  });

  console.log(`Found ${bundles.length} bundles to build.`);

  for (const bundle of bundles) {
    const bundlePath = path.join(bundlesDir, bundle);
    const packageJsonPath = path.join(bundlePath, "package.json");

    if (!fs.existsSync(packageJsonPath)) {
      console.log(`Skipping ${bundle} (no package.json)`);
      continue;
    }

    console.log(`\nBuilding ${bundle}...`);

    try {
      const srcDir = path.join(bundlePath, "src");

      // 检查extension - 可能在src/extension或根目录的extension
      const hasExtension =
        fs.existsSync(path.join(srcDir, "extension")) ||
        fs.existsSync(path.join(bundlePath, "extension"));
      const hasDashboard = fs.existsSync(path.join(srcDir, "dashboard"));
      const hasGraphics = fs.existsSync(path.join(srcDir, "graphics"));

      // 构建extension (使用Vite)
      if (hasExtension) {
        console.log(`  Building extension...`);
        await execAsync("npm run build:extension", {
          cwd: bundlePath,
          env: { ...process.env, BUNDLE_NAME: bundle },
        });
      }

      // 构建dashboard/graphics (使用Vite)
      if (hasDashboard || hasGraphics) {
        console.log(`  Building dashboard/graphics...`);
        await execAsync("npm run build:dashboard", {
          cwd: bundlePath,
          env: { ...process.env, BUNDLE_NAME: bundle },
        });
      }

      if (!hasExtension && !hasDashboard && !hasGraphics) {
        console.log(`  No src/ directory found, skipping`);
        continue;
      }

      console.log(`  ✓ Successfully built ${bundle}`);
    } catch (error: any) {
      console.error(`  ✗ Failed to build ${bundle}`);
      console.error(`  Error: ${error.message}`);
      if (error.stdout) console.error(`  stdout: ${error.stdout}`);
      if (error.stderr) console.error(`  stderr: ${error.stderr}`);
      process.exit(1);
    }
  }

  console.log("\n✓ All bundles built successfully!");
}

buildBundles().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
