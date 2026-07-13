import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const DASHBOARD_UI_VERSION = "1.0.0";
export const DASHBOARD_UI_TARGETS = [
  "atem-control",
  "backup-system",
  "logger-system",
  "mixer-control",
  "obs-control",
  "schedule-manager",
  "seamer",
  "vb-matrix-control",
] as const;

interface DashboardUiManifest {
  version: string;
  sourceHash: string;
  files: string[];
}

interface DashboardUiSnapshot {
  files: Map<string, string>;
  manifest: DashboardUiManifest;
}

// 递归收集目录中的全部文件，以便生成和检查快照。
const listFiles = (directory: string): string[] =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(target) : [target];
  });

// 统一快照清单与哈希使用的跨平台路径格式。
const toPosixPath = (filePath: string): string => filePath.replace(/\\/g, "/");

// 统一源文件与快照文件的文本换行，避免 CRLF 造成内容漂移误报。
const normalizeText = (content: string): string => content.replace(/\r\n/g, "\n");

// 生成文件必须明确标识来源，避免在 Bundle 内被误作权威代码编辑。
const generatedHeader = (relative: string): string =>
  relative.endsWith(".css")
    ? "/* 此文件由 scripts/sync-dashboard-ui.ts 生成，请勿手工修改。 */\n"
    : "// 此文件由 scripts/sync-dashboard-ui.ts 生成，请勿手工修改。\n";

// 从唯一权威源构造包含规范化换行和生成头的预期快照。
const buildDashboardUiSnapshot = (projectRoot: string): DashboardUiSnapshot => {
  const sourceRoot = path.join(projectRoot, "shared", "dashboard-ui");
  const sourceManifest = JSON.parse(
    fs.readFileSync(path.join(sourceRoot, "manifest.json"), "utf8")
  ) as { version: string; targets: string[] };
  if (sourceManifest.version !== DASHBOARD_UI_VERSION) {
    throw new Error("Dashboard UI version does not match manifest.json");
  }
  if (JSON.stringify(sourceManifest.targets) !== JSON.stringify(DASHBOARD_UI_TARGETS)) {
    throw new Error("Dashboard UI targets do not match manifest.json");
  }

  const files = new Map<string, string>();
  for (const file of listFiles(sourceRoot)) {
    const relative = toPosixPath(path.relative(sourceRoot, file));
    if (relative === "manifest.json") continue;
    const source = normalizeText(fs.readFileSync(file, "utf8"));
    files.set(relative, `${generatedHeader(relative)}${source}`);
  }

  const names = [...files.keys()].sort();
  const hash = crypto.createHash("sha256");
  for (const name of names) {
    hash.update(name);
    hash.update("\0");
    hash.update(files.get(name) ?? "");
    hash.update("\0");
  }
  return {
    files,
    manifest: {
      version: DASHBOARD_UI_VERSION,
      sourceHash: hash.digest("hex"),
      files: names,
    },
  };
};

// 每个受管 Bundle 只接收自己的 Dashboard UI 本地快照。
const snapshotDirectory = (projectRoot: string, bundle: string): string =>
  path.join(projectRoot, "bundles", bundle, "src", "dashboard", "_leaf-ui");

// 确认写入目录确实位于 bundles 根目录之内，拒绝路径逃逸。
const assertSnapshotWithinBundles = (output: string, bundlesRoot: string): void => {
  const relative = path.relative(bundlesRoot, output);
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write outside bundles: ${output}`);
  }
};

// 删除旧快照后完整重建，确保同步不会保留已从权威源移除的文件。
const writeDashboardUiSnapshot = (
  projectRoot: string,
  bundle: string,
  snapshot: DashboardUiSnapshot
): void => {
  const output = snapshotDirectory(projectRoot, bundle);
  assertSnapshotWithinBundles(output, path.join(projectRoot, "bundles"));
  fs.rmSync(output, { recursive: true, force: true });
  for (const [relative, content] of snapshot.files) {
    const target = path.join(output, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, "utf8");
  }
  fs.writeFileSync(
    path.join(output, "manifest.json"),
    `${JSON.stringify(snapshot.manifest, null, 2)}\n`,
    "utf8"
  );
};

// 比较清单、内容与实际文件集合，报告所有可修复的漂移项。
const compareDashboardUiSnapshot = (
  projectRoot: string,
  bundle: string,
  snapshot: DashboardUiSnapshot
): string[] => {
  const output = snapshotDirectory(projectRoot, bundle);
  const manifestPath = path.join(output, "manifest.json");
  if (!fs.existsSync(manifestPath)) return [`${bundle}: missing manifest.json`];

  const errors: string[] = [];
  const actualManifest = JSON.parse(
    fs.readFileSync(manifestPath, "utf8")
  ) as DashboardUiManifest;
  if (JSON.stringify(actualManifest) !== JSON.stringify(snapshot.manifest)) {
    errors.push(`${bundle}: manifest mismatch`);
  }
  for (const [relative, content] of snapshot.files) {
    const target = path.join(output, relative);
    if (!fs.existsSync(target) || normalizeText(fs.readFileSync(target, "utf8")) !== content) {
      errors.push(`${bundle}: stale ${relative}`);
    }
  }
  const actualFiles = listFiles(output)
    .map((file) => toPosixPath(path.relative(output, file)))
    .filter((file) => file !== "manifest.json")
    .sort();
  if (JSON.stringify(actualFiles) !== JSON.stringify(snapshot.manifest.files)) {
    errors.push(`${bundle}: unexpected snapshot files`);
  }
  return errors;
};

// 将同一权威 UI 快照写入八个受管 Dashboard Bundle。
export const syncDashboardUiSnapshots = (projectRoot: string): void => {
  const snapshot = buildDashboardUiSnapshot(projectRoot);
  for (const bundle of DASHBOARD_UI_TARGETS) {
    writeDashboardUiSnapshot(projectRoot, bundle, snapshot);
  }
};

// 检查八个本地快照是否仍与权威 UI 源完全一致。
export const checkDashboardUiSnapshots = (projectRoot: string): string[] => {
  const snapshot = buildDashboardUiSnapshot(projectRoot);
  return DASHBOARD_UI_TARGETS.flatMap((bundle) =>
    compareDashboardUiSnapshot(projectRoot, bundle, snapshot)
  );
};

// CLI 默认同步，--check 仅报告漂移并以非零状态退出。
if (require.main === module) {
  const projectRoot = path.resolve(__dirname, "..");
  if (process.argv.includes("--check")) {
    const errors = checkDashboardUiSnapshots(projectRoot);
    if (errors.length > 0) {
      process.stderr.write(`${errors.join("\n")}\n`);
      process.exitCode = 1;
    }
  } else {
    syncDashboardUiSnapshots(projectRoot);
  }
}
