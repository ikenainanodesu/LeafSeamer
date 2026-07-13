import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const CORE_SNAPSHOT_VERSION = "1.0.0";
export const CORE_SNAPSHOT_TARGETS = [
  "atem-control",
  "logger-system",
  "obs-control",
  "schedule-manager",
  "seamer",
  "seamer-adapter-atem",
  "seamer-adapter-mixer",
  "seamer-adapter-obs",
  "seamer-adapter-schedule",
  "seamer-adapter-vb",
  "vb-matrix-control",
] as const;

interface CoreSnapshotManifest {
  version: string;
  sourceHash: string;
  files: string[];
}

const sourceDirectories = ["integration", "security"] as const;
const generatedHeader = "// 此文件由 scripts/sync-bundle-core.ts 生成，请勿手工修改。\n";

const listFiles = (directory: string): string[] =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(target) : [target];
  });

const expectedFiles = (projectRoot: string): Map<string, string> => {
  const root = path.join(projectRoot, "shared");
  const files = sourceDirectories.flatMap((directory) =>
    listFiles(path.join(root, directory))
  );
  return new Map(
    files.map((file) => {
      const relative = (path.relative(root, file) as any).replaceAll("\\", "/");
      const source = (fs.readFileSync(file, "utf8") as any).replaceAll("\r\n", "\n");
      return [relative, `${generatedHeader}${source}`];
    })
  );
};

const createManifest = (files: Map<string, string>): CoreSnapshotManifest => {
  const names = [...files.keys()].sort();
  const hash = crypto.createHash("sha256");
  for (const name of names) {
    hash.update(name);
    hash.update("\0");
    hash.update(files.get(name) ?? "");
    hash.update("\0");
  }
  return { version: CORE_SNAPSHOT_VERSION, sourceHash: hash.digest("hex"), files: names };
};

const snapshotDirectory = (projectRoot: string, bundle: string): string =>
  path.join(projectRoot, "bundles", bundle, "src", "_leaf-core");

export const syncBundleCoreSnapshots = (projectRoot: string): void => {
  const files = expectedFiles(projectRoot);
  const manifest = createManifest(files);
  for (const bundle of CORE_SNAPSHOT_TARGETS) {
    const output = snapshotDirectory(projectRoot, bundle);
    const bundlesRoot = path.join(projectRoot, "bundles");
    if (!output.startsWith(`${bundlesRoot}${path.sep}`)) {
      throw new Error(`Refusing to write outside bundles: ${output}`);
    }
    fs.rmSync(output, { recursive: true, force: true });
    for (const [relative, content] of files) {
      const target = path.join(output, relative);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, content, "utf8");
    }
    fs.writeFileSync(
      path.join(output, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8"
    );
  }
};

export const checkBundleCoreSnapshots = (projectRoot: string): string[] => {
  const files = expectedFiles(projectRoot);
  const expectedManifest = createManifest(files);
  const errors: string[] = [];
  for (const bundle of CORE_SNAPSHOT_TARGETS) {
    const output = snapshotDirectory(projectRoot, bundle);
    const manifestPath = path.join(output, "manifest.json");
    if (!fs.existsSync(manifestPath)) {
      errors.push(`${bundle}: missing manifest.json`);
      continue;
    }
    const actualManifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as CoreSnapshotManifest;
    if (JSON.stringify(actualManifest) !== JSON.stringify(expectedManifest)) {
      errors.push(`${bundle}: manifest mismatch`);
    }
    for (const [relative, content] of files) {
      const target = path.join(output, relative);
      if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== content) {
        errors.push(`${bundle}: stale ${relative}`);
      }
    }
  }
  return errors;
};

if (require.main === module) {
  const projectRoot = path.resolve(__dirname, "..");
  if (process.argv.includes("--check")) {
    const errors = checkBundleCoreSnapshots(projectRoot);
    if (errors.length > 0) {
      process.stderr.write(`${errors.join("\n")}\n`);
      process.exitCode = 1;
    }
  } else {
    syncBundleCoreSnapshots(projectRoot);
  }
}
