import fs from "node:fs";
import path from "node:path";
import { deepEqual, equal, test } from "./test-harness";
import {
  DASHBOARD_UI_TARGETS,
  DASHBOARD_UI_VERSION,
} from "../scripts/sync-dashboard-ui";

const projectRoot = path.resolve(__dirname, "..");

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

test("dashboard UI tokens match the approved console palette", () => {
  const css = fs.readFileSync(
    path.join(projectRoot, "shared", "dashboard-ui", "tokens.css"),
    "utf8"
  );
  const cssWithoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const declarations = new Map<string, string[]>();
  const declarationPattern = /(?:^|[;{}])\s*(--leaf-[a-z0-9-]+)\s*:\s*([^;{}]*?)\s*(?:;|(?=\s*[{}]|$))/g;

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
