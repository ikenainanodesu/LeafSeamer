import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { ok, test } from "./test-harness";

const projectRoot = path.resolve(__dirname, "..");

type ComponentBinding =
  | { kind: "local" }
  | { kind: "default-import"; module: string };

type DashboardEntry = {
  relative: string;
  component: string;
  binding: ComponentBinding;
};

const entries: DashboardEntry[] = [
  {
    relative: "bundles/schedule-manager/src/dashboard/schedule-panel.tsx",
    component: "SchedulePanel",
    binding: { kind: "local" },
  },
  {
    relative: "bundles/seamer/src/dashboard/main.tsx",
    component: "App",
    binding: { kind: "default-import", module: "./App" },
  },
  {
    relative: "bundles/backup-system/src/dashboard/backup-control.tsx",
    component: "BackupControl",
    binding: { kind: "local" },
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

const importClauseModule = (node: ts.ImportClause): string | undefined =>
  ts.isImportDeclaration(node.parent)
    ? stringLiteralValue(node.parent.moduleSpecifier)
    : undefined;

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

const hasUniqueExactDefaultImport = (
  source: ts.SourceFile,
  name: string,
  moduleSpecifier: string
): boolean => {
  const owners = bindingOwners(source, name);
  return (
    owners.length === 1 &&
    ts.isImportClause(owners[0]) &&
    owners[0].name?.text === name &&
    importClauseModule(owners[0]) === moduleSpecifier
  );
};

const hasUniqueLocalComponent = (source: ts.SourceFile, name: string): boolean => {
  const owners = bindingOwners(source, name);
  const owner = owners[0];
  const hasExecutableInitializer =
    owner !== undefined &&
    ts.isVariableDeclaration(owner) &&
    owner.initializer !== undefined &&
    (ts.isArrowFunction(owner.initializer) ||
      ts.isFunctionExpression(owner.initializer) ||
      ts.isClassExpression(owner.initializer));
  return (
    owners.length === 1 &&
    (hasExecutableInitializer ||
      ts.isFunctionDeclaration(owner) ||
      ts.isClassDeclaration(owner))
  );
};

const hasExpectedComponentBinding = (
  source: ts.SourceFile,
  entry: DashboardEntry
): boolean =>
  entry.binding.kind === "local"
    ? hasUniqueLocalComponent(source, entry.component)
    : hasUniqueExactDefaultImport(source, entry.component, entry.binding.module);

const jsxTagName = (node: ts.JsxTagNameExpression): string | undefined => {
  if (ts.isIdentifier(node)) {
    return node.text;
  }
  if (ts.isPropertyAccessExpression(node)) {
    return `${jsxTagName(node.expression as ts.JsxTagNameExpression) ?? ""}.${node.name.text}`;
  }
  return undefined;
};

const isPanelErrorBoundary = (
  node: ts.Node
): node is ts.JsxElement | ts.JsxSelfClosingElement => {
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
  if (!hasExpectedComponentBinding(source, entry)) {
    failures.push(`入口组件 ${entry.component} 不是实际声明或精确导入绑定`);
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

const parseCommandSource = (relative: string): ts.SourceFile =>
  parseText(
    relative,
    `${readSourceText(relative)}\n${ambientDeclarationText(relative)}`
  );

type CommandContract = {
  relative: string;
  receiver: "nodecg";
  callee: "sendMessage";
  argumentIndex: number;
  command: string;
};

const commandContracts: CommandContract[] = [
  {
    relative: "bundles/schedule-manager/src/dashboard/schedule-panel.tsx",
    receiver: "nodecg",
    callee: "sendMessage",
    argumentIndex: 0,
    command: "replaceSchedule",
  },
  {
    relative: "bundles/seamer/src/dashboard/App.tsx",
    receiver: "nodecg",
    callee: "sendMessage",
    argumentIndex: 0,
    command: "runSeamerCard",
  },
  {
    relative: "bundles/backup-system/src/dashboard/backup-control.tsx",
    receiver: "nodecg",
    callee: "sendMessage",
    argumentIndex: 0,
    command: "createBackup",
  },
];

const isCommandCall = (
  node: ts.Node,
  contract: CommandContract
): node is ts.CallExpression => {
  if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) {
    return false;
  }
  return (
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === contract.receiver &&
    node.expression.name.text === contract.callee &&
    stringLiteralValue(node.arguments[contract.argumentIndex]) === contract.command
  );
};

const hasCommandCall = (
  source: ts.SourceFile,
  contract: CommandContract
): boolean =>
  hasUniqueAmbientNodecgBinding(source) &&
  descendants(source).some((node) => isCommandCall(node, contract));

const propertyNameText = (name: ts.PropertyName): string | undefined =>
  ts.isIdentifier(name) || ts.isStringLiteralLike(name) ? name.text : undefined;

const hasSecretPassphrasePayload = (source: ts.SourceFile): boolean => {
  const contract = commandContracts[2];
  if (!hasUniqueAmbientNodecgBinding(source)) {
    return false;
  }

  return descendants(source).some((node) => {
    if (!isCommandCall(node, contract) || node.arguments.length < 2) {
      return false;
    }
    const payload = node.arguments[1];
    if (!ts.isIdentifier(payload)) {
      return false;
    }

    const payloadOwners = bindingOwners(source, payload.text);
    if (payloadOwners.length !== 1 || !ts.isVariableDeclaration(payloadOwners[0])) {
      return false;
    }
    const initializer = payloadOwners[0].initializer;
    if (!initializer || !ts.isObjectLiteralExpression(initializer)) {
      return false;
    }

    const property = initializer.properties.find(
      (candidate): candidate is ts.PropertyAssignment =>
        ts.isPropertyAssignment(candidate) &&
        propertyNameText(candidate.name) === "secretPassphrase"
    );
    if (!property) {
      return false;
    }

    const valueOwners = bindingOwners(source, "secretPassphrase");
    return (
      [property.initializer, ...descendants(property.initializer)].some(
        (valueNode) =>
          ts.isIdentifier(valueNode) && valueNode.text === "secretPassphrase"
      ) &&
      valueOwners.length === 1 &&
      ts.isVariableDeclaration(valueOwners[0])
    );
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
      `${fileName} 夹具编译失败: ${errors
        .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, " "))
        .join("; ")}`
    );
  }
  return parseText(fileName, text);
};

const entryFixture = (
  body: string,
  setup = "",
  componentDeclaration = "const SchedulePanel = () => <div />;"
): string => `
import { createRoot } from "react-dom/client";
import { PanelErrorBoundary } from "./_leaf-ui/components";
import "./_leaf-ui/index.css";
const Button = () => <button />;
${componentDeclaration}
${setup}
${body}
`;

const commandFixture = (body: string): string => `
declare const nodecg: { sendMessage: (...args: unknown[]) => void };
${body}
`;

// 三个 Operations 入口必须绑定本地 UI、真实错误边界、createRoot 和唯一渲染结构。
test("Operations 入口聚合合同", () => {
  const failures = entries.flatMap((entry) =>
    entryContractFailures(parseSource(entry.relative), entry).map(
      (failure) => `${entry.relative}: ${failure}`
    )
  );
  if (failures.length > 0) {
    throw new Error(failures.join("; "));
  }
});

// 关键业务命令必须绑定实际 receiver、callee、参数索引和字符串字面量。
test("Operations 命令合同绑定真实业务 API", () => {
  const failures = commandContracts
    .filter((contract) => !hasCommandCall(parseCommandSource(contract.relative), contract))
    .map((contract) => `${contract.relative}: 缺少真实绑定的 ${contract.command}`);
  const backupSource = parseCommandSource(commandContracts[2].relative);
  if (!hasSecretPassphrasePayload(backupSource)) {
    failures.push("backup-control.tsx: createBackup 的同一 payload 缺少 secretPassphrase 实际绑定");
  }
  if (failures.length > 0) {
    throw new Error(failures.join("; "));
  }
});

// 可编译夹具必须拒绝伪造组件、伪 root、重复渲染、局部遮蔽和伪造密钥属性。
test("Operations 合同夹具拒绝伪造绑定", () => {
  const valid = compileFixture(
    "operations-valid-entry-fixture.tsx",
    entryFixture(
      "const root = createRoot(document.getElementById(\"root\")!); root.render(<PanelErrorBoundary><SchedulePanel /></PanelErrorBoundary>);"
    )
  );
  ok(entryContractFailures(valid, entries[0]).length === 0);

  const identifierComponent = compileFixture(
    "operations-identifier-component-fixture.tsx",
    entryFixture(
      "const root = createRoot(document.getElementById(\"root\")!); root.render(<PanelErrorBoundary><SchedulePanel /></PanelErrorBoundary>);",
      "",
      "const SchedulePanel = Button;"
    )
  );
  ok(entryContractFailures(identifierComponent, entries[0]).length > 0);

  const aliasedButton = compileFixture(
    "operations-aliased-button-fixture.tsx",
    entryFixture(
      "const root = createRoot(document.getElementById(\"root\")!); root.render(<PanelErrorBoundary><SchedulePanel /></PanelErrorBoundary>);"
    ).replace(
      "const SchedulePanel = () => <div />;",
      'import { Button as SchedulePanel } from "./_leaf-ui/components";'
    )
  );
  ok(entryContractFailures(aliasedButton, entries[0]).length > 0);

  const arbitraryUppercaseComponent = compileFixture(
    "operations-arbitrary-uppercase-fixture.tsx",
    entryFixture(
      "const root = createRoot(document.getElementById(\"root\")!); root.render(<PanelErrorBoundary><OtherPanel /></PanelErrorBoundary>);",
      "const OtherPanel = () => <section />;"
    )
  );
  ok(entryContractFailures(arbitraryUppercaseComponent, entries[0]).length > 0);

  const aliasedBoundary = compileFixture(
    "operations-aliased-boundary-fixture.tsx",
    entryFixture(
      "const root = createRoot(document.getElementById(\"root\")!); root.render(<PanelErrorBoundary><SchedulePanel /></PanelErrorBoundary>);"
    ).replace(
      'import { PanelErrorBoundary } from "./_leaf-ui/components";',
      'import { Button as PanelErrorBoundary } from "./_leaf-ui/components";'
    )
  );
  ok(entryContractFailures(aliasedBoundary, entries[0]).length > 0);

  const pseudoRoot = compileFixture(
    "operations-pseudo-root-fixture.tsx",
    entryFixture(
      "const fakeRoot = { render: (_value: unknown) => {} }; const root = fakeRoot; root.render(<PanelErrorBoundary><SchedulePanel /></PanelErrorBoundary>);"
    )
  );
  ok(entryContractFailures(pseudoRoot, entries[0]).length > 0);

  const duplicateRender = compileFixture(
    "operations-duplicate-render-fixture.tsx",
    entryFixture(
      "const root = createRoot(document.getElementById(\"root\")!); root.render(<PanelErrorBoundary><SchedulePanel /></PanelErrorBoundary>); root.render(<SchedulePanel />);"
    )
  );
  ok(entryContractFailures(duplicateRender, entries[0]).length > 0);

  const shadowedCreateRoot = compileFixture(
    "operations-shadowed-create-root-fixture.tsx",
    entryFixture(
      "const makeRoot = () => { const createRoot = () => ({ render: (_value: unknown) => {} }); return createRoot; }; const root = createRoot(document.getElementById(\"root\")!); root.render(<PanelErrorBoundary><SchedulePanel /></PanelErrorBoundary>);"
    )
  );
  ok(entryContractFailures(shadowedCreateRoot, entries[0]).length > 0);

  const shadowedNodecg = compileFixture(
    "operations-shadowed-nodecg-fixture.ts",
    commandFixture(
      "const run = () => { const nodecg = { sendMessage: (..._args: unknown[]) => {} }; nodecg.sendMessage(\"replaceSchedule\", []); };"
    )
  );
  ok(
    !hasCommandCall(shadowedNodecg, {
      relative: "fixture",
      receiver: "nodecg",
      callee: "sendMessage",
      argumentIndex: 0,
      command: "replaceSchedule",
    })
  );

  const commentAndString = compileFixture(
    "operations-comment-and-string-fixture.ts",
    commandFixture(
      '// nodecg.sendMessage("replaceSchedule"); const text = "replaceSchedule"; const fake = () => "nodecg.sendMessage(\\"replaceSchedule\\")";'
    )
  );
  ok(
    !hasCommandCall(commentAndString, {
      relative: "fixture",
      receiver: "nodecg",
      callee: "sendMessage",
      argumentIndex: 0,
      command: "replaceSchedule",
    })
  );

  const validBackup = compileFixture(
    "operations-valid-backup-fixture.ts",
    commandFixture(
      'const secretPassphrase = "a-valid-passphrase"; const request = { secretPassphrase: secretPassphrase }; nodecg.sendMessage("createBackup", request);'
    )
  );
  ok(hasSecretPassphrasePayload(validBackup));

  const literalBackup = compileFixture(
    "operations-literal-backup-fixture.ts",
    commandFixture(
      'const secretPassphrase = "a-valid-passphrase"; const request = { secretPassphrase: "literal-only" }; nodecg.sendMessage("createBackup", request);'
    )
  );
  ok(!hasSecretPassphrasePayload(literalBackup));

  const separateBackupObject = compileFixture(
    "operations-separate-backup-object-fixture.ts",
    commandFixture(
      'const secretPassphrase = "a-valid-passphrase"; const request = {}; const secrets = { secretPassphrase: secretPassphrase }; nodecg.sendMessage("createBackup", request);'
    )
  );
  ok(!hasSecretPassphrasePayload(separateBackupObject));
});
