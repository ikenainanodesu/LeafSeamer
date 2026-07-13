import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { deepEqual, equal, ok, test } from "./test-harness";
import {
  checkDashboardUiSnapshots,
  DASHBOARD_UI_TARGETS,
  DASHBOARD_UI_VERSION,
  syncDashboardUiSnapshots,
} from "../scripts/sync-dashboard-ui";

const projectRoot = path.resolve(__dirname, "..");

// 在临时项目中复制权威源，避免漂移测试污染仓库中的已提交快照。
const withDashboardUiFixture = (body: (fixtureRoot: string) => void): void => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "leafseamer-dashboard-ui-"));
  try {
    fs.mkdirSync(path.join(fixtureRoot, "shared"), { recursive: true });
    fs.cpSync(
      path.join(projectRoot, "shared", "dashboard-ui"),
      path.join(fixtureRoot, "shared", "dashboard-ui"),
      { recursive: true }
    );
    syncDashboardUiSnapshots(fixtureRoot);
    body(fixtureRoot);
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
};

// 返回临时项目内指定 Bundle 的快照根目录。
const fixtureSnapshotDirectory = (fixtureRoot: string, bundle = "atem-control"): string =>
  path.join(fixtureRoot, "bundles", bundle, "src", "dashboard", "_leaf-ui");

test("dashboard UI target list excludes graphics", () => {
  deepEqual(DASHBOARD_UI_TARGETS, [
    "atem-control",
    "backup-system",
    "logger-system",
    "mixer-control",
    "obs-control",
    "schedule-manager",
    "seamer",
    "vb-matrix-control",
  ]);
  equal(DASHBOARD_UI_TARGETS.includes("graphics-package" as never), false);
  equal(DASHBOARD_UI_VERSION, "1.0.0");
});

test("dashboard UI snapshots match the canonical source", () => {
  deepEqual(checkDashboardUiSnapshots(projectRoot), []);
});

test("dashboard UI snapshot fixture starts without drift", () => {
  withDashboardUiFixture((fixtureRoot) => {
    deepEqual(checkDashboardUiSnapshots(fixtureRoot), []);
  });
});

test("dashboard UI snapshot check reports a missing manifest", () => {
  withDashboardUiFixture((fixtureRoot) => {
    fs.rmSync(path.join(fixtureSnapshotDirectory(fixtureRoot), "manifest.json"));
    deepEqual(checkDashboardUiSnapshots(fixtureRoot), ["atem-control: missing manifest.json"]);
  });
});

test("dashboard UI snapshot check reports a deleted file as stale", () => {
  withDashboardUiFixture((fixtureRoot) => {
    fs.rmSync(path.join(fixtureSnapshotDirectory(fixtureRoot), "index.css"));
    ok(checkDashboardUiSnapshots(fixtureRoot).includes("atem-control: stale index.css"));
  });
});

test("dashboard UI snapshot check reports modified content as stale", () => {
  withDashboardUiFixture((fixtureRoot) => {
    const target = path.join(fixtureSnapshotDirectory(fixtureRoot), "index.css");
    fs.appendFileSync(target, "/* 漂移 */\n", "utf8");
    ok(checkDashboardUiSnapshots(fixtureRoot).includes("atem-control: stale index.css"));
  });
});

test("dashboard UI snapshot check reports a modified manifest", () => {
  withDashboardUiFixture((fixtureRoot) => {
    const target = path.join(fixtureSnapshotDirectory(fixtureRoot), "manifest.json");
    const manifest = JSON.parse(fs.readFileSync(target, "utf8")) as { version: string };
    manifest.version = "0.0.0";
    fs.writeFileSync(target, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    ok(checkDashboardUiSnapshots(fixtureRoot).includes("atem-control: manifest mismatch"));
  });
});

test("dashboard UI snapshot check reports an unexpected file", () => {
  withDashboardUiFixture((fixtureRoot) => {
    fs.writeFileSync(path.join(fixtureSnapshotDirectory(fixtureRoot), "obsolete.txt"), "obsolete\n", "utf8");
    ok(checkDashboardUiSnapshots(fixtureRoot).includes("atem-control: unexpected snapshot files"));
  });
});

test("dashboard UI snapshot check accepts CRLF generated CSS", () => {
  withDashboardUiFixture((fixtureRoot) => {
    const target = path.join(fixtureSnapshotDirectory(fixtureRoot), "index.css");
    const css = fs.readFileSync(target, "utf8").replace(/\n/g, "\r\n");
    fs.writeFileSync(target, css, "utf8");
    deepEqual(checkDashboardUiSnapshots(fixtureRoot), []);
  });
});

test("dashboard UI sync removes obsolete snapshot files", () => {
  withDashboardUiFixture((fixtureRoot) => {
    const obsoletePath = path.join(fixtureSnapshotDirectory(fixtureRoot), "obsolete.txt");
    fs.writeFileSync(obsoletePath, "obsolete\n", "utf8");
    syncDashboardUiSnapshots(fixtureRoot);
    equal(fs.existsSync(obsoletePath), false);
    deepEqual(checkDashboardUiSnapshots(fixtureRoot), []);
  });
});

test("dashboard UI tokens match the approved console palette", () => {
  const css = fs.readFileSync(
    path.join(projectRoot, "shared", "dashboard-ui", "tokens.css"),
    "utf8"
  );
  const cssWithoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const declarations = new Map<string, string[]>();
  // 使用前瞻保留分号，保证全局匹配能够继续读取下一条声明。
  const declarationPattern = /(?:^|[;{}])\s*(--leaf-[a-z0-9-]+)\s*:\s*([^;{}]*?)\s*(?=;|\s*[{}]|$)/g;

  // 只从真实 CSS 声明中提取属性，避免注释和非声明文本影响合同结果。
  for (const match of cssWithoutComments.matchAll(declarationPattern)) {
    const [, name, value] = match;
    const values = declarations.get(name) ?? [];
    values.push(value.trim());
    declarations.set(name, values);
  }

  for (const [name, expectedValue] of [
    ["--leaf-bg", "#0c0e11"],
    ["--leaf-surface", "#14171b"],
    ["--leaf-surface-raised", "#20242a"],
    ["--leaf-surface-deep", "#090b0d"],
    ["--leaf-border", "#2a3037"],
    ["--leaf-text", "#f2f4f6"],
    ["--leaf-text-muted", "#959da7"],
    ["--leaf-text-faint", "#68717c"],
    ["--leaf-command", "#61a9ff"],
    ["--leaf-success", "#52d273"],
    ["--leaf-warning", "#ffbd4a"],
    ["--leaf-danger", "#ff626b"],
  ] as const) {
    const values = declarations.get(name) ?? [];
    equal(values.length, 1);
    equal(values[0], expectedValue);
  }
});
