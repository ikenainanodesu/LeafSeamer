import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { ok, test } from "./test-harness";

const projectRoot = path.resolve(__dirname, "..");

const entries = [
  "bundles/atem-control/src/dashboard/atem-connection.tsx",
  "bundles/atem-control/src/dashboard/atem-control.tsx",
  "bundles/mixer-control/src/dashboard/mixer-connection.tsx",
  "bundles/mixer-control/src/dashboard/mixer-panel.tsx",
  "bundles/obs-control/src/dashboard/obs-connection.tsx",
  "bundles/obs-control/src/dashboard/obs-control-panel.tsx",
];

const parseSource = (relative: string): ts.SourceFile =>
  ts.createSourceFile(
    relative,
    fs.readFileSync(path.join(projectRoot, relative), "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

const descendants = (node: ts.Node): ts.Node[] => {
  const result: ts.Node[] = [];
  const visit = (current: ts.Node): void => {
    result.push(current);
    ts.forEachChild(current, visit);
  };
  ts.forEachChild(node, visit);
  return result;
};

const stringLiteralValue = (node: ts.Expression | undefined): string | undefined =>
  node && ts.isStringLiteralLike(node) ? node.text : undefined;

const jsxTagName = (node: ts.JsxTagNameExpression): string | undefined => {
  if (ts.isIdentifier(node)) {
    return node.text;
  }
  if (ts.isPropertyAccessExpression(node)) {
    return `${jsxTagName(node.expression as ts.JsxTagNameExpression) ?? ""}.${node.name.text}`;
  }
  return undefined;
};

const isPanelErrorBoundary = (node: ts.Node): node is ts.JsxElement | ts.JsxSelfClosingElement => {
  if (!ts.isJsxElement(node) && !ts.isJsxSelfClosingElement(node)) {
    return false;
  }
  const tagName = ts.isJsxElement(node) ? node.openingElement.tagName : node.tagName;
  return jsxTagName(tagName) === "PanelErrorBoundary";
};

const isApplicationComponent = (node: ts.Node): node is ts.JsxElement | ts.JsxSelfClosingElement => {
  if (!ts.isJsxElement(node) && !ts.isJsxSelfClosingElement(node)) {
    return false;
  }
  const tagName = ts.isJsxElement(node) ? node.openingElement.tagName : node.tagName;
  const name = jsxTagName(tagName);
  return Boolean(name && /^[A-Z]/.test(name.split(".").pop() ?? ""));
};

const boundaryWrapsApplication = (renderArgument: ts.Expression): boolean =>
  [renderArgument, ...descendants(renderArgument)].some(
    (node) =>
      isPanelErrorBoundary(node) &&
      descendants(node).some(
        (child) => child !== node && isApplicationComponent(child)
      )
  );

const renderArgumentFromFixture = (text: string): ts.Expression => {
  const source = ts.createSourceFile(
    "device-boundary-fixture.tsx",
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  const renderCall = descendants(source).find(
    (node): node is ts.CallExpression =>
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === "root" &&
      node.expression.name.text === "render" &&
      node.arguments.length > 0
  );
  if (!renderCall) {
    throw new Error("夹具缺少 root.render 调用");
  }
  return renderCall.arguments[0];
};

const hasLocalCssImport = (source: ts.SourceFile): boolean =>
  source.statements.some(
    (statement) =>
      ts.isImportDeclaration(statement) &&
      statement.importClause === undefined &&
      stringLiteralValue(statement.moduleSpecifier) === "./_leaf-ui/index.css"
  );

const hasPanelErrorBoundaryImport = (source: ts.SourceFile): boolean =>
  source.statements.some((statement) => {
    if (
      !ts.isImportDeclaration(statement) ||
      stringLiteralValue(statement.moduleSpecifier) !== "./_leaf-ui/components"
    ) {
      return false;
    }
    const bindings = statement.importClause?.namedBindings;
    return (
      bindings !== undefined &&
      ts.isNamedImports(bindings) &&
      bindings.elements.some((element) => element.name.text === "PanelErrorBoundary")
    );
  });

const hasProtectedRootRender = (source: ts.SourceFile): boolean =>
  descendants(source).some(
    (node) =>
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === "root" &&
      node.expression.name.text === "render" &&
      node.arguments.length > 0 &&
      boundaryWrapsApplication(node.arguments[0])
  );

const entryContractFailures = (relative: string): string[] => {
  const source = parseSource(relative);
  const failures: string[] = [];
  if (!hasLocalCssImport(source)) {
    failures.push("未从本地导入 ./_leaf-ui/index.css");
  }
  if (!hasPanelErrorBoundaryImport(source)) {
    failures.push("未从本地组件导入 PanelErrorBoundary");
  }
  if (!hasProtectedRootRender(source)) {
    failures.push("root.render 未由边界真实包裹应用组件");
  }
  return failures;
};

type CommandContract = {
  relative: string;
  receiver?: string;
  callee: string;
  argumentIndex: number;
  command: string;
};

const commandContracts: CommandContract[] = [
  {
    relative: "bundles/atem-control/src/dashboard/atem-panel.tsx",
    receiver: "nodecg",
    callee: "sendMessage",
    argumentIndex: 0,
    command: "atem:cut",
  },
  {
    relative: "bundles/atem-control/src/dashboard/atem-panel.tsx",
    receiver: "nodecg",
    callee: "sendMessage",
    argumentIndex: 0,
    command: "atem:auto",
  },
  {
    relative: "bundles/atem-control/src/dashboard/atem-panel.tsx",
    receiver: "nodecg",
    callee: "sendMessage",
    argumentIndex: 0,
    command: "atem:setSource",
  },
  {
    relative: "bundles/mixer-control/src/dashboard/mixer-control-panel.tsx",
    receiver: "nodecg",
    callee: "sendMessageToBundle",
    argumentIndex: 0,
    command: "setMixerFader",
  },
  {
    relative: "bundles/mixer-control/src/dashboard/mixer-control-panel.tsx",
    receiver: "nodecg",
    callee: "sendMessageToBundle",
    argumentIndex: 0,
    command: "setMixerMute",
  },
  {
    relative: "bundles/mixer-control/src/dashboard/output-control-panel.tsx",
    receiver: "nodecg",
    callee: "sendMessageToBundle",
    argumentIndex: 0,
    command: "setMixerOutputFader",
  },
  {
    relative: "bundles/obs-control/src/dashboard/obs-control-panel.tsx",
    receiver: "nodecg",
    callee: "sendMessageToBundle",
    argumentIndex: 0,
    command: "setOBSScene",
  },
  {
    relative: "bundles/obs-control/src/dashboard/obs-control-panel.tsx",
    callee: "sendAuthenticatedCommand",
    argumentIndex: 1,
    command: "obs.startStreaming",
  },
  {
    relative: "bundles/obs-control/src/dashboard/obs-control-panel.tsx",
    callee: "sendAuthenticatedCommand",
    argumentIndex: 1,
    command: "obs.stopStreaming",
  },
];

const hasCommandCall = (source: ts.SourceFile, contract: CommandContract): boolean =>
  descendants(source).some((node) => {
    if (!ts.isCallExpression(node)) {
      return false;
    }
    if (contract.receiver !== undefined) {
      if (
        !ts.isPropertyAccessExpression(node.expression) ||
        !ts.isIdentifier(node.expression.expression) ||
        node.expression.expression.text !== contract.receiver ||
        node.expression.name.text !== contract.callee
      ) {
        return false;
      }
    } else if (!ts.isIdentifier(node.expression) || node.expression.text !== contract.callee) {
      return false;
    }
    return stringLiteralValue(node.arguments[contract.argumentIndex]) === contract.command;
  });

const commandFixture = (): ts.SourceFile =>
  ts.createSourceFile(
    "device-command-fixture.tsx",
    `// nodecg.sendMessage("atem:cut");
const text = "atem:cut";
const fake = () => "nodecg.sendMessage(\\\"atem:cut\\\")";`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

// 设备入口必须使用各自 bundle 的 UI 快照，并在真实渲染树中设置错误边界。
test("设备 Dashboard 入口使用本地 UI 快照和错误边界", () => {
  const failures = entries.flatMap((relative) =>
    entryContractFailures(relative).map((failure) => `${relative}: ${failure}`)
  );
  if (failures.length > 0) {
    throw new Error(failures.join("; "));
  }
});

// 关键命令必须来自指定调用节点的真实字符串字面量参数。
test("设备 UI 改造保留关键设备命令名称", () => {
  const failures = commandContracts
    .filter((contract) => !hasCommandCall(parseSource(contract.relative), contract))
    .map((contract) => `${contract.relative}: 缺少 ${contract.command}`);
  if (failures.length > 0) {
    throw new Error(failures.join("; "));
  }
});

// 夹具反例确保注释、字符串、空边界和伪造命令不会满足 AST 合同。
test("设备合同夹具拒绝注释字符串和空边界", () => {
  ok(
    boundaryWrapsApplication(
      renderArgumentFromFixture(
        "root.render(<PanelErrorBoundary><Panel /></PanelErrorBoundary>);"
      )
    )
  );
  ok(
    !boundaryWrapsApplication(
      renderArgumentFromFixture(
        "root.render(<PanelErrorBoundary>{/* <Panel /> */}</PanelErrorBoundary>);"
      )
    )
  );
  ok(
    !boundaryWrapsApplication(
      renderArgumentFromFixture(
        'root.render(<PanelErrorBoundary>{"<Panel />"}</PanelErrorBoundary>);'
      )
    )
  );
  ok(
    !boundaryWrapsApplication(
      renderArgumentFromFixture("root.render(<PanelErrorBoundary />);")
    )
  );
  ok(
    !hasCommandCall(commandFixture(), {
      receiver: "nodecg",
      callee: "sendMessage",
      argumentIndex: 0,
      command: "atem:cut",
      relative: "fixture",
    })
  );
});
