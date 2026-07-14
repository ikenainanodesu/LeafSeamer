import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { ok, test } from "./test-harness";

const projectRoot = path.resolve(__dirname, "..");

type DashboardEntry = {
  relative: string;
  component: string;
};

const entries: DashboardEntry[] = [
  {
    relative: "bundles/atem-control/src/dashboard/atem-connection.tsx",
    component: "AtemConnection",
  },
  {
    relative: "bundles/atem-control/src/dashboard/atem-control.tsx",
    component: "AtemControl",
  },
  {
    relative: "bundles/mixer-control/src/dashboard/mixer-connection.tsx",
    component: "MixerConnection",
  },
  {
    relative: "bundles/mixer-control/src/dashboard/mixer-panel.tsx",
    component: "MixerPanel",
  },
  {
    relative: "bundles/obs-control/src/dashboard/obs-connection.tsx",
    component: "ObsConnection",
  },
  {
    relative: "bundles/obs-control/src/dashboard/obs-control-panel.tsx",
    component: "ObsControlPanel",
  },
];

const parseText = (fileName: string, text: string): ts.SourceFile =>
  ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

const readSourceText = (relative: string): string =>
  fs.readFileSync(path.join(projectRoot, relative), "utf8");

const parseSource = (relative: string): ts.SourceFile =>
  parseText(relative, readSourceText(relative));

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

const bindingNameIncludes = (name: ts.BindingName, expected: string): boolean => {
  if (ts.isIdentifier(name)) {
    return name.text === expected;
  }
  return name.elements.some((element) => {
    if (ts.isBindingElement(element)) {
      return bindingNameIncludes(element.name, expected);
    }
    return false;
  });
};

// 收集变量、参数、函数、类、导入和捕获变量的真实绑定所有者。
const bindingOwners = (source: ts.SourceFile, name: string): ts.Node[] => {
  const owners = new Set<ts.Node>();
  const addBinding = (node: ts.Node, bindingName: ts.BindingName | undefined): void => {
    if (bindingName && bindingNameIncludes(bindingName, name)) {
      owners.add(node);
    }
  };

  for (const node of descendants(source)) {
    if (ts.isVariableDeclaration(node) || ts.isParameter(node)) {
      addBinding(node, node.name);
    } else if (
      (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) &&
      node.name?.text === name
    ) {
      owners.add(node);
    } else if (
      (ts.isClassDeclaration(node) || ts.isClassExpression(node)) &&
      node.name?.text === name
    ) {
      owners.add(node);
    } else if (ts.isCatchClause(node)) {
      addBinding(node.variableDeclaration ?? node, node.variableDeclaration?.name);
    } else if (ts.isImportClause(node) && node.name?.text === name) {
      owners.add(node);
    } else if (
      (ts.isImportSpecifier(node) || ts.isNamespaceImport(node)) &&
      node.name.text === name
    ) {
      owners.add(node);
    }
  }
  return [...owners];
};

const hasDeclareModifierInAncestors = (node: ts.Node): boolean => {
  let current: ts.Node | undefined = node;
  while (current) {
    if (
      ts.isVariableStatement(current) &&
      current.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.DeclareKeyword
      )
    ) {
      return true;
    }
    if (
      ts.isModuleDeclaration(current) &&
      current.name.getText() === "global" &&
      current.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.DeclareKeyword
      )
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
};

const isAmbientNodecgOwner = (node: ts.Node): boolean =>
  ts.isVariableDeclaration(node) &&
  ts.isIdentifier(node.name) &&
  node.name.text === "nodecg" &&
  hasDeclareModifierInAncestors(node);

const hasUniqueAmbientNodecgBinding = (source: ts.SourceFile): boolean => {
  const owners = bindingOwners(source, "nodecg");
  return owners.length === 1 && isAmbientNodecgOwner(owners[0]);
};

const importSpecifierModule = (node: ts.Node): string | undefined => {
  if (!ts.isImportSpecifier(node) || !ts.isNamedImports(node.parent)) {
    return undefined;
  }
  const importClause = node.parent.parent;
  if (!ts.isImportClause(importClause) || !ts.isImportDeclaration(importClause.parent)) {
    return undefined;
  }
  return stringLiteralValue(importClause.parent.moduleSpecifier);
};

const importedSymbolName = (node: ts.ImportSpecifier): string =>
  node.propertyName?.text ?? node.name.text;

const hasUniqueExactNamedImport = (
  source: ts.SourceFile,
  name: string,
  moduleSpecifier: string
): boolean => {
  const owners = bindingOwners(source, name);
  return (
    owners.length === 1 &&
    ts.isImportSpecifier(owners[0]) &&
    owners[0].name.text === name &&
    importedSymbolName(owners[0]) === name &&
    importSpecifierModule(owners[0]) === moduleSpecifier
  );
};

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

const isExpectedComponent = (node: ts.Node, component: string): boolean => {
  if (!ts.isJsxElement(node) && !ts.isJsxSelfClosingElement(node)) {
    return false;
  }
  const tagName = ts.isJsxElement(node) ? node.openingElement.tagName : node.tagName;
  return jsxTagName(tagName) === component;
};

const boundaryWrapsComponent = (
  renderArgument: ts.Expression,
  component: string
): boolean =>
  [renderArgument, ...descendants(renderArgument)].some(
    (node) =>
      isPanelErrorBoundary(node) &&
      descendants(node).some(
        (child) => child !== node && isExpectedComponent(child, component)
      )
  );

const isCreateRootInitializer = (node: ts.Node): node is ts.VariableDeclaration =>
  ts.isVariableDeclaration(node) &&
  ts.isIdentifier(node.name) &&
  node.initializer !== undefined &&
  ts.isCallExpression(node.initializer) &&
  ts.isIdentifier(node.initializer.expression) &&
  node.initializer.expression.text === "createRoot";

const isRootRenderCall = (node: ts.Node): node is ts.CallExpression =>
  ts.isCallExpression(node) &&
  ts.isPropertyAccessExpression(node.expression) &&
  ts.isIdentifier(node.expression.expression) &&
  node.expression.expression.text === "root" &&
  node.expression.name.text === "render";

const hasLocalCssImport = (source: ts.SourceFile): boolean =>
  source.statements.some(
    (statement) =>
      ts.isImportDeclaration(statement) &&
      statement.importClause === undefined &&
      stringLiteralValue(statement.moduleSpecifier) === "./_leaf-ui/index.css"
  );

const entryContractFailures = (
  source: ts.SourceFile,
  entry: DashboardEntry
): string[] => {
  const failures: string[] = [];
  if (!hasLocalCssImport(source)) {
    failures.push("未从本地导入 ./_leaf-ui/index.css");
  }
  if (
    !hasUniqueExactNamedImport(
      source,
      "PanelErrorBoundary",
      "./_leaf-ui/components"
    )
  ) {
    failures.push("PanelErrorBoundary 不是本地模块中的同名精确命名导入");
  }
  if (!hasUniqueExactNamedImport(source, "createRoot", "react-dom/client")) {
    failures.push("createRoot 不是 react-dom/client 中无遮蔽的精确命名导入");
  }

  const rootOwners = bindingOwners(source, "root");
  const createRootVariables = descendants(source).filter(isCreateRootInitializer);
  const rootVariable = rootOwners.length === 1 ? rootOwners[0] : undefined;
  if (
    createRootVariables.length !== 1 ||
    rootVariable !== createRootVariables[0] ||
    !ts.isVariableDeclaration(rootVariable) ||
    !ts.isIdentifier(rootVariable.name) ||
    rootVariable.name.text !== "root"
  ) {
    failures.push("root 不是唯一由 createRoot(...) initializer 建立的变量");
  }

  const rootRenderCalls = descendants(source).filter(isRootRenderCall);
  if (rootRenderCalls.length !== 1) {
    failures.push("root.render 不是唯一渲染调用");
  } else if (
    rootRenderCalls[0].arguments.length === 0 ||
    !boundaryWrapsComponent(rootRenderCalls[0].arguments[0], entry.component)
  ) {
    failures.push(`root.render 未由边界精确包裹 ${entry.component}`);
  }
  return failures;
};

const ambientDeclarationText = (relative: string): string => {
  const sourceDirectory = path.resolve(
    projectRoot,
    path.dirname(relative),
    ".."
  );
  const globalFile = path.join(sourceDirectory, "global.d.ts");
  return fs.existsSync(globalFile) ? fs.readFileSync(globalFile, "utf8") : "";
};

const parseCommandSource = (relative: string): ts.SourceFile => {
  const source = parseSource(relative);
  if (hasUniqueAmbientNodecgBinding(source)) {
    return source;
  }
  return parseText(
    relative,
    `${readSourceText(relative)}\n${ambientDeclarationText(relative)}`
  );
};

type CommandContract = {
  relative: string;
  receiver?: "nodecg";
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

const hasCommandBinding = (source: ts.SourceFile, contract: CommandContract): boolean =>
  contract.receiver === "nodecg"
    ? hasUniqueAmbientNodecgBinding(source)
    : hasUniqueExactNamedImport(
        source,
        "sendAuthenticatedCommand",
        "../_leaf-core/security/authenticated-command-client"
      );

const hasCommandCall = (source: ts.SourceFile, contract: CommandContract): boolean => {
  if (!hasCommandBinding(source, contract)) {
    return false;
  }
  return descendants(source).some((node) => {
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
};

const compileFixture = (fileName: string, text: string): ts.SourceFile => {
  const result = ts.transpileModule(text, {
    fileName,
    reportDiagnostics: true,
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const errors = (result.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error
  );
  if (errors.length > 0) {
    throw new Error(
      `${fileName} fixture 编译失败: ${errors
        .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, " "))
        .join("; ")}`
    );
  }
  return parseText(fileName, text);
};

const entryFixture = (body: string, setup = ""): string => `
import { createRoot } from "react-dom/client";
import { PanelErrorBoundary } from "./_leaf-ui/components";
import "./_leaf-ui/index.css";
const AtemConnection = () => <div />;
const Button = () => <button />;
${setup}
${body}
`;

const commandFixture = (body: string): string => `
declare const nodecg: { sendMessage: (command: string, payload: { ip: string }) => void };
${body}
`;

const authenticatedCommandFixture = (body: string): string => `
import { sendAuthenticatedCommand } from "../_leaf-core/security/authenticated-command-client";
${body}
`;

// 设备入口必须锁定真实组件、错误边界、createRoot 和唯一 root.render 结构。
test("设备 Dashboard 入口绑定真实入口组件和渲染 API", () => {
  const failures = entries.flatMap((entry) =>
    entryContractFailures(parseSource(entry.relative), entry).map(
      (failure) => `${entry.relative}: ${failure}`
    )
  );
  if (failures.length > 0) {
    throw new Error(failures.join("; "));
  }
});

// 关键命令必须绑定到 ambient nodecg 或本 bundle 的认证命令导入。
test("设备 UI 改造保留绑定到真实 API 的关键命令", () => {
  const failures = commandContracts
    .filter((contract) => !hasCommandCall(parseCommandSource(contract.relative), contract))
    .map((contract) => `${contract.relative}: 缺少真实绑定的 ${contract.command}`);
  if (failures.length > 0) {
    throw new Error(failures.join("; "));
  }
});

// 可编译夹具覆盖伪造组件、伪 root、多次 render、错误导入和局部遮蔽。
test("设备合同夹具拒绝伪造入口和 API 绑定", () => {
  const valid = compileFixture(
    "valid-entry-fixture.tsx",
    entryFixture(
      "const root = createRoot(document.getElementById(\"root\")!); root.render(<PanelErrorBoundary><AtemConnection /></PanelErrorBoundary>);"
    )
  );
  ok(entryContractFailures(valid, entries[0]).length === 0);

  const buttonChild = compileFixture(
    "button-child-fixture.tsx",
    entryFixture(
      "const root = createRoot(document.getElementById(\"root\")!); root.render(<PanelErrorBoundary><Button /></PanelErrorBoundary>);"
    )
  );
  ok(entryContractFailures(buttonChild, entries[0]).length > 0);

  const aliasedBoundary = compileFixture(
    "aliased-boundary-fixture.tsx",
    entryFixture(
      "const root = createRoot(document.getElementById(\"root\")!); root.render(<PanelErrorBoundary><AtemConnection /></PanelErrorBoundary>);"
    ).replace(
      'import { PanelErrorBoundary } from "./_leaf-ui/components";',
      'import { Button as PanelErrorBoundary } from "./_leaf-ui/components";'
    )
  );
  ok(entryContractFailures(aliasedBoundary, entries[0]).length > 0);

  const pseudoRoot = compileFixture(
    "pseudo-root-fixture.tsx",
    entryFixture(
      "const fakeRoot = { render: (_value: unknown) => {} }; const root = fakeRoot; root.render(<PanelErrorBoundary><AtemConnection /></PanelErrorBoundary>);"
    ).replace(
      'const AtemConnection = () => <div />;\n',
      'const AtemConnection = () => <div />;\n'
    )
  );
  ok(entryContractFailures(pseudoRoot, entries[0]).length > 0);

  const duplicateRender = compileFixture(
    "duplicate-render-fixture.tsx",
    entryFixture(
      "const root = createRoot(document.getElementById(\"root\")!); root.render(<PanelErrorBoundary><AtemConnection /></PanelErrorBoundary>); root.render(<AtemConnection />);"
    )
  );
  ok(entryContractFailures(duplicateRender, entries[0]).length > 0);

  const shadowedCreateRoot = compileFixture(
    "shadowed-create-root-fixture.tsx",
    entryFixture(
      "const makeRoot = () => { const createRoot = () => ({ render: (_value: unknown) => {} }); return createRoot; }; const root = createRoot(document.getElementById(\"root\")!); root.render(<PanelErrorBoundary><AtemConnection /></PanelErrorBoundary>);"
    )
  );
  ok(entryContractFailures(shadowedCreateRoot, entries[0]).length > 0);

  const shadowedNodecg = compileFixture(
    "shadowed-nodecg-fixture.tsx",
    commandFixture(
      "const useLocalNodecg = () => { const nodecg = { sendMessage: (_command: string, _payload: { ip: string }) => {} }; nodecg.sendMessage(\"atem:cut\", { ip: \"127.0.0.1\" }); };"
    )
  );
  ok(
    !hasCommandCall(shadowedNodecg, {
      relative: "fixture",
      receiver: "nodecg",
      callee: "sendMessage",
      argumentIndex: 0,
      command: "atem:cut",
    })
  );

  const shadowedAuthenticatedCommand = compileFixture(
    "shadowed-authenticated-command-fixture.tsx",
    authenticatedCommandFixture(
      "const useLocalCommand = () => { const sendAuthenticatedCommand = (_bundle: string, _command: string) => {}; sendAuthenticatedCommand(\"obs-control\", \"obs.startStreaming\"); };"
    )
  );
  ok(
    !hasCommandCall(shadowedAuthenticatedCommand, {
      relative: "fixture",
      callee: "sendAuthenticatedCommand",
      argumentIndex: 1,
      command: "obs.startStreaming",
    })
  );

  const commentAndString = compileFixture(
    "comment-and-string-fixture.tsx",
    commandFixture(
      '// 注释中的 nodecg.sendMessage("atem:cut");\nconst text = "atem:cut"; const fake = () => "nodecg.sendMessage(\\\"atem:cut\\\")";'
    )
  );
  ok(
    !hasCommandCall(commentAndString, {
      relative: "fixture",
      receiver: "nodecg",
      callee: "sendMessage",
      argumentIndex: 0,
      command: "atem:cut",
    })
  );
});

const jsxAttributes = (node: ts.JsxOpeningLikeElement): ts.JsxAttributes => node.attributes;

const hasJsxAttribute = (
  node: ts.JsxOpeningLikeElement,
  name: string,
  expectedText?: string
): boolean =>
  jsxAttributes(node).properties.some(
    (property): property is ts.JsxAttribute =>
      ts.isJsxAttribute(property) &&
      ts.isIdentifier(property.name) &&
      property.name.text === name &&
      (expectedText === undefined || property.initializer?.getText().includes(expectedText) === true)
  );

const jsxOpenings = (source: ts.SourceFile): ts.JsxOpeningLikeElement[] => {
  const openings: ts.JsxOpeningLikeElement[] = [];
  for (const node of descendants(source)) {
    if (ts.isJsxElement(node)) openings.push(node.openingElement);
    if (ts.isJsxSelfClosingElement(node)) openings.push(node);
  }
  return openings;
};

const hasUseRefLock = (source: ts.SourceFile, lockName: string): boolean =>
  descendants(source).some(
    (node) =>
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === lockName &&
      node.initializer !== undefined &&
      ts.isCallExpression(node.initializer) &&
      ts.isIdentifier(node.initializer.expression) &&
      node.initializer.expression.text === "useRef"
  );

const hasFinallyLockRelease = (source: ts.SourceFile, lockName: string): boolean =>
  descendants(source).some(
    (node) =>
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "finally" &&
      node.arguments.some((argument) =>
        descendants(argument).some(
          (child) =>
            ts.isBinaryExpression(child) &&
            child.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
            ts.isPropertyAccessExpression(child.left) &&
            ts.isIdentifier(child.left.expression) &&
            child.left.expression.text === lockName &&
            child.left.name.text === "current" &&
            child.right.kind === ts.SyntaxKind.FalseKeyword
        )
      )
  );

const hasPendingButtonContract = (source: ts.SourceFile, pendingName: string): boolean =>
  jsxOpenings(source).some(
    (opening) =>
      (jsxTagName(opening.tagName) === "Button" || jsxTagName(opening.tagName) === "button") &&
      hasJsxAttribute(opening, "disabled", pendingName) &&
      hasJsxAttribute(opening, "aria-busy", pendingName)
  );

const constFunction = (source: ts.SourceFile, name: string): ts.ArrowFunction | undefined =>
  descendants(source).find(
    (node): node is ts.ArrowFunction =>
      ts.isVariableDeclaration(node.parent) &&
      ts.isIdentifier(node.parent.name) &&
      node.parent.name.text === name &&
      ts.isArrowFunction(node)
  );

const assignmentPosition = (source: ts.SourceFile, body: ts.Node, text: string): number | undefined =>
  descendants(body)
    .filter((node): node is ts.BinaryExpression => ts.isBinaryExpression(node))
    .find((node) => node.getText(source) === text)
    ?.getStart(source);

const authenticatedCallPosition = (source: ts.SourceFile, body: ts.Node): number | undefined =>
  descendants(body)
    .filter((node): node is ts.CallExpression => ts.isCallExpression(node))
    .find(
      (node) =>
        ts.isIdentifier(node.expression) &&
        node.expression.text === "sendAuthenticatedCommand"
    )
    ?.getStart(source);

const promiseReceiverRoot = (expression: ts.Expression): ts.Identifier | undefined => {
  if (ts.isIdentifier(expression)) return expression;
  if (ts.isCallExpression(expression) && ts.isPropertyAccessExpression(expression.expression)) {
    return promiseReceiverRoot(expression.expression.expression);
  }
  return undefined;
};

const finallyOriginatesFromAuthenticatedCommand = (
  source: ts.SourceFile,
  body: ts.Node,
  receiver: ts.Expression
): boolean => {
  if (receiver.getText(source).includes("sendAuthenticatedCommand")) return true;
  const root = promiseReceiverRoot(receiver);
  if (!root) return false;
  return descendants(body).some(
    (node) =>
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === root.text &&
      node.initializer !== undefined &&
      authenticatedCallPosition(source, node.initializer) !== undefined
  );
};

const hasMountedRef = (source: ts.SourceFile): boolean => {
  const text = source.getFullText();
  return hasUseRefLock(source, "isMountedRef") && text.includes("isMountedRef.current = false");
};

const setterIsMountedGuarded = (
  source: ts.SourceFile,
  functionName: string,
  setterName: string
): boolean => {
  const handler = constFunction(source, functionName);
  if (!handler) return false;
  return descendants(handler).some((node) => {
    if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression) || node.expression.text !== setterName) {
      return false;
    }
    let current: ts.Node | undefined = node.parent;
    while (current && current !== handler) {
      if (ts.isIfStatement(current) && current.expression.getText(source).includes("isMountedRef.current")) {
        return true;
      }
      current = current.parent;
    }
    return false;
  });
};

const handlerHasRealLockContract = (
  source: ts.SourceFile,
  handlerName: string,
  lockName: string,
  pendingSetter: string
): boolean => {
  const handler = constFunction(source, handlerName);
  if (!handler || !hasUseRefLock(source, lockName) || !hasMountedRef(source)) return false;
  const sendPosition = authenticatedCallPosition(source, handler.body);
  const lockPosition = assignmentPosition(source, handler.body, `${lockName}.current = true`);
  const pendingPosition = descendants(handler.body)
    .filter((node): node is ts.CallExpression => ts.isCallExpression(node))
    .find((node) => ts.isIdentifier(node.expression) && node.expression.text === pendingSetter)
    ?.getStart(source);
  const guardPosition = descendants(handler.body)
    .filter((node): node is ts.IfStatement => ts.isIfStatement(node))
    .find((node) => node.expression.getText(source).includes(`${lockName}.current`))
    ?.getStart(source);
  const finallyCall = descendants(handler.body).find(
    (node): node is ts.CallExpression =>
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "finally" &&
      finallyOriginatesFromAuthenticatedCommand(source, handler.body, node.expression.expression)
  );
  return (
    sendPosition !== undefined &&
    lockPosition !== undefined &&
    pendingPosition !== undefined &&
    guardPosition !== undefined &&
    guardPosition < lockPosition &&
    lockPosition < pendingPosition &&
    pendingPosition < sendPosition &&
    finallyCall !== undefined &&
    assignmentPosition(source, finallyCall, `${lockName}.current = false`) !== undefined &&
    setterIsMountedGuarded(source, handlerName, pendingSetter)
  );
};

const handlerHasCallbackLockContract = (
  source: ts.SourceFile,
  handlerName: string,
  lockName: string,
  pendingSetter: string
): boolean => {
  const handler = constFunction(source, handlerName);
  if (!handler || !hasUseRefLock(source, lockName) || !hasMountedRef(source)) return false;
  const bodyText = handler.body.getText(source);
  const guardPosition = bodyText.indexOf(`${lockName}.current.has(connectionId)`);
  const lockPosition = bodyText.indexOf(`${lockName}.current.add(connectionId)`);
  const pendingPosition = descendants(handler.body)
    .filter((node): node is ts.CallExpression => ts.isCallExpression(node))
    .find((node) => ts.isIdentifier(node.expression) && node.expression.text === pendingSetter)
    ?.getStart(source);
  const callbackPosition = descendants(handler.body)
    .filter((node): node is ts.CallExpression => ts.isCallExpression(node))
    .find((node) => ts.isIdentifier(node.expression) && node.expression.text === "command")
    ?.getStart(source);
  const finallyCall = descendants(handler.body).find(
    (node): node is ts.CallExpression =>
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "finally" &&
      node.expression.expression.getText(source).includes("command()")
  );
  return (
    lockPosition >= 0 &&
    pendingPosition !== undefined &&
    callbackPosition !== undefined &&
    guardPosition >= 0 &&
    guardPosition < lockPosition &&
    handler.body.getStart(source) + lockPosition < pendingPosition &&
    pendingPosition < callbackPosition &&
    finallyCall !== undefined &&
    descendants(finallyCall).some(
      (node) =>
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === "delete" &&
        node.expression.expression.getText(source) === `${lockName}.current` &&
        node.arguments[0]?.getText(source) === "connectionId"
    ) &&
    setterIsMountedGuarded(source, handlerName, pendingSetter)
  );
};

// 同步锁、认证调用与 finally 必须属于同一真实 handler，诱饵 ref 或无关 finally 不能通过。
test("终审命令合同拒绝诱饵锁和卸载后的状态更新", () => {
  const atem = parseSource("bundles/atem-control/src/dashboard/atem-panel.tsx");
  const obsPanel = parseSource("bundles/obs-control/src/dashboard/obs-control-panel.tsx");
  const patchStatus = parseSource("bundles/vb-matrix-control/src/dashboard/components/PatchStatus.tsx");
  const obsConnection = parseSource("bundles/obs-control/src/dashboard/obs-connection.tsx");
  ok(handlerHasRealLockContract(atem, "handleRunMacro", "macroCommandLockRef", "setPendingMacroId"));
  ok(handlerHasRealLockContract(obsPanel, "toggleStreaming", "streamCommandLockRef", "setIsStreamCommandPending"));
  ok(handlerHasRealLockContract(patchStatus, "updatePatch", "patchCommandLockRef", "setIsPatchCommandPending"));
  ok(hasPendingButtonContract(atem, "pendingMacroId"));
  ok(hasPendingButtonContract(obsPanel, "isStreamCommandPending"));
  ok(hasPendingButtonContract(patchStatus, "isPatchCommandPending"));
  ok(hasMountedRef(obsConnection));
  ok(handlerHasCallbackLockContract(obsConnection, "runConnectionCommand", "connectionCommandLockRef", "setPendingConnectionActions"));
  ok(setterIsMountedGuarded(obsConnection, "saveConnection", "setConnections"));
  ok(setterIsMountedGuarded(obsConnection, "runConnectionCommand", "setPendingConnectionActions"));
  ok(hasPendingButtonContract(obsConnection, "isThisConnectionPending"));

  const decoy = parseText(
    "decoy.tsx",
    'const Component = () => { const isMountedRef = useRef(true); const lock = useRef(false); const handler = () => { sendAuthenticatedCommand("x", "y"); lock.current = true; setPending(true); Promise.resolve().finally(() => { lock.current = false; }); }; return null; };'
  );
  ok(!handlerHasRealLockContract(decoy, "handler", "lock", "setPending"));
  ok(!handlerHasCallbackLockContract(decoy, "handler", "lock", "setPending"));
  const pendingDecoy = parseText("pending-decoy.tsx", "const view = <button disabled={pending} aria-busy={other} />;");
  ok(!hasPendingButtonContract(pendingDecoy, "pending"));
});

// Scene 的两个原生按钮必须同级，展开按钮交给浏览器默认键盘行为。
test("OBS Scene 合同拒绝嵌套或手写键盘触发", () => {
  const source = parseSource("bundles/obs-control/src/dashboard/obs-control-panel.tsx");
  const sceneButton = jsxOpenings(source).find(
    (opening) => jsxTagName(opening.tagName) === "button" && hasJsxAttribute(opening, "className", "obs-scene")
  );
  ok(sceneButton !== undefined && !hasJsxAttribute(sceneButton, "onKeyDown"));
  ok(
    jsxOpenings(source).some(
      (opening) => jsxTagName(opening.tagName) === "button" && hasJsxAttribute(opening, "onClick", "handleSwitchScene")
    )
  );
  const decoy = parseText("scene-decoy.tsx", 'const view = <button className="obs-scene" onKeyDown={() => {}} />;');
  ok(
    !jsxOpenings(decoy).some(
      (opening) => jsxTagName(opening.tagName) === "button" && hasJsxAttribute(opening, "className", "obs-scene") && !hasJsxAttribute(opening, "onKeyDown")
    )
  );
});

// Playlist 和 Network 焦点合同必须绑定真实 DOM 结构与稳定 ref，而非孤立字符串。
test("Playlist 与 Network 焦点合同拒绝诱饵实现", () => {
  const playlist = parseSource("bundles/obs-control/src/dashboard/obs-control-panel.tsx");
  const network = parseSource("bundles/vb-matrix-control/src/dashboard/components/NetworkConfigList.tsx");
  const dialog = jsxOpenings(playlist).find((opening) => hasJsxAttribute(opening, "role", '"dialog"'));
  ok(dialog !== undefined && hasJsxAttribute(dialog, "aria-modal", '"true"') && hasJsxAttribute(dialog, "ref", "playlistDialogRef") && hasJsxAttribute(dialog, "onKeyDown", "handleKeyDown"));
  const playlistText = playlist.getFullText();
  ok(playlistText.includes("event.key === \"Escape\"") && playlistText.includes("event.key !== \"Tab\"") && playlistText.includes("trigger?.isConnected"));
  const networkText = network.getFullText();
  ok(hasUseRefLock(network, "removeButtonRefs") && hasUseRefLock(network, "focusFrameRef"));
  ok(networkText.includes("cancelAnimationFrame") && networkText.includes("removeButtonRefs.current.get") && !networkText.includes("querySelector"));
  const obsConnection = parseSource("bundles/obs-control/src/dashboard/obs-connection.tsx");
  const obsConnectionText = obsConnection.getFullText();
  ok(hasUseRefLock(obsConnection, "removeButtonRefs") && hasUseRefLock(obsConnection, "focusFrameRef"));
  ok(hasUseRefLock(obsConnection, "addConnectionButtonRef") && hasUseRefLock(obsConnection, "focusAfterRemovalRef"));
  ok(obsConnectionText.includes("cancelAnimationFrame") && obsConnectionText.includes("removeButtonRefs.current.get") && !obsConnectionText.includes("querySelector"));

  const decoy = parseText("focus-decoy.tsx", 'const view = <div role="dialog" aria-modal="true" />; const ref = useRef(null);');
  const decoyDialog = jsxOpenings(decoy).find((opening) => hasJsxAttribute(opening, "role", '"dialog"'));
  ok(!(decoyDialog && hasJsxAttribute(decoyDialog, "ref", "playlistDialogRef") && hasJsxAttribute(decoyDialog, "onKeyDown", "handleKeyDown")));
});
