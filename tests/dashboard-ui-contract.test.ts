import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { deepEqual, equal, ok, test, throws } from "./test-harness";
import {
  checkDashboardUiSnapshots,
  DASHBOARD_UI_TARGETS,
  DASHBOARD_UI_VERSION,
  syncDashboardUiSnapshots,
} from "../scripts/sync-dashboard-ui";

const projectRoot = path.resolve(__dirname, "..");

// 检查确认对话框的可访问名称和描述是否由真实 JSX 变量连接到标题与消息节点。
const assertConfirmDialogAccessibilityContract = (source: string): void => {
  const reactImport = source.match(/import\s*\{([^}]*)\}\s*from\s*["']react["']/);
  ok(reactImport?.[1].split(",").some((name) => name.trim() === "useId"));

  const dialog = source.match(/<dialog\b[\s\S]*?<\/dialog>/)?.[0];
  ok(dialog);
  if (!dialog) throw new Error("ConfirmDialog must render a dialog element");
  const readBinding = (attribute: string): string => {
    const binding = dialog.match(new RegExp(`${attribute}\\s*=\\s*\\{\\s*([A-Za-z_$][\\w$]*)\\s*\\}`));
    ok(binding?.[1]);
    return binding?.[1] ?? "";
  };
  const titleBinding = readBinding("aria-labelledby");
  const messageBinding = readBinding("aria-describedby");
  const titleNode = dialog.match(/<h2\b[^>]*\bid\s*=\s*\{\s*([A-Za-z_$][\w$]*)\s*\}/);
  const messageNode = dialog.match(/<p\b[^>]*\bid\s*=\s*\{\s*([A-Za-z_$][\w$]*)\s*\}/);
  equal(titleNode?.[1], titleBinding);
  equal(messageNode?.[1], messageBinding);

  const useIdBindings = new Set(
    [...source.matchAll(/\b(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*useId\s*\(\s*\)/g)].map(
      (match) => match[1]
    )
  );
  ok(useIdBindings.has(titleBinding));
  ok(useIdBindings.has(messageBinding));
};

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

test("each dashboard bundle declares its icon dependency", () => {
  for (const bundle of DASHBOARD_UI_TARGETS) {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(projectRoot, "bundles", bundle, "package.json"), "utf8")
    ) as { dependencies?: Record<string, string> };
    equal(packageJson.dependencies?.["lucide-react"], "1.23.0");
  }
});

test("graphics package does not declare the dashboard icon dependency", () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(projectRoot, "bundles", "graphics-package", "package.json"), "utf8")
  ) as { dependencies?: Record<string, string> };
  equal(Object.prototype.hasOwnProperty.call(packageJson.dependencies ?? {}, "lucide-react"), false);
});

test("dashboard server lifecycle regressions are exposed and enforced by CI", () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(projectRoot, "package.json"), "utf8")
  ) as { scripts?: Record<string, string> };
  const workflow = fs.readFileSync(path.join(projectRoot, ".github", "workflows", "ci.yml"), "utf8");

  // 生命周期与路径边界测试必须有稳定的本地入口，并由 Windows CI 显式执行。
  equal(
    packageJson.scripts?.["test:server"],
    "node --test tests/dashboard-server-lifecycle.test.mjs"
  );
  ok(/^\s*- run: npm run test:server\s*$/m.test(workflow));
});

test("ConfirmDialog binds dialog name and description to useId nodes", () => {
  const source = fs.readFileSync(
    path.join(projectRoot, "shared", "dashboard-ui", "components", "ConfirmDialog.tsx"),
    "utf8"
  );
  assertConfirmDialogAccessibilityContract(source);

  const equivalentSource = `
    import { useId } from "react";
    const Example = () => {
      const messageId = useId();
      const titleId = useId();
      return (
        <dialog
          aria-describedby={messageId}
          aria-labelledby={titleId}
        >
          <h2 id={titleId}>Title</h2>
          <p id={messageId}>Message</p>
        </dialog>
      );
    };
  `;
  assertConfirmDialogAccessibilityContract(equivalentSource);

  const constantForgery = `
    import { useEffect, useId } from "react";
    const Example = () => {
      const titleId = "confirm-title";
      const messageId = "confirm-message";
      return (
        <dialog aria-labelledby={titleId} aria-describedby={messageId}>
          <h2 id={titleId}>Title</h2>
          <p id={messageId}>Message</p>
        </dialog>
      );
    };
  `;
  throws(() => assertConfirmDialogAccessibilityContract(constantForgery));

  const brokenChain = `
    import { useId } from "react";
    const Example = () => {
      const titleId = useId();
      const messageId = useId();
      return (
        <dialog aria-labelledby={titleId} aria-describedby={messageId}>
          <h2 id={messageId}>Title</h2>
          <p id={titleId}>Message</p>
        </dialog>
      );
    };
  `;
  throws(() => assertConfirmDialogAccessibilityContract(brokenChain));
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
