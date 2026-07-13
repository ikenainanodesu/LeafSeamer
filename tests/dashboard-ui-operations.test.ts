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

const isNullLiteral = (node: ts.Node): boolean =>
  node.kind === ts.SyntaxKind.NullKeyword;

const isIdentifierNamed = (node: ts.Node, name: string): boolean =>
  ts.isIdentifier(node) && node.text === name;

const arrowBinding = (source: ts.SourceFile, name: string): ts.ArrowFunction | undefined => {
  const owners = bindingOwners(source, name);
  if (owners.length !== 1 || !ts.isVariableDeclaration(owners[0])) {
    return undefined;
  }
  return owners[0].initializer && ts.isArrowFunction(owners[0].initializer)
    ? owners[0].initializer
    : undefined;
};

const requiredIdentifierParameter = (
  arrow: ts.ArrowFunction,
  index: number
): string | undefined => {
  const parameter = arrow.parameters[index];
  return (
    parameter &&
    !parameter.dotDotDotToken &&
    !parameter.questionToken &&
    !parameter.initializer &&
    ts.isIdentifier(parameter.name)
  )
    ? parameter.name.text
    : undefined;
};

const isDirectCall = (
  expression: ts.Expression,
  name: string,
  argumentCount: number
): expression is ts.CallExpression =>
  ts.isCallExpression(expression) &&
  isIdentifierNamed(expression.expression, name) &&
  expression.arguments.length === argumentCount;

const isExpressionCall = (
  statement: ts.Statement,
  name: string,
  argumentCount: number
): boolean =>
  ts.isExpressionStatement(statement) &&
  isDirectCall(statement.expression, name, argumentCount);

const isPropertyAccess = (
  expression: ts.Expression,
  objectName: string,
  propertyName: string
): boolean =>
  ts.isPropertyAccessExpression(expression) &&
  isIdentifierNamed(expression.expression, objectName) &&
  expression.name.text === propertyName;

const isBareReturn = (statement: ts.Statement): boolean =>
  ts.isReturnStatement(statement) && statement.expression === undefined;

const isReturnOnly = (statement: ts.Statement): boolean =>
  isBareReturn(statement) ||
  (ts.isBlock(statement) && statement.statements.length === 1 && isBareReturn(statement.statements[0]));

const expressionArrowBody = (arrow: ts.ArrowFunction): ts.Expression | undefined =>
  ts.isBlock(arrow.body) ? undefined : arrow.body;

const unwrapParentheses = (expression: ts.Expression): ts.Expression =>
  ts.isParenthesizedExpression(expression)
    ? unwrapParentheses(expression.expression)
    : expression;

const isLocalComparison = (
  expression: ts.Expression,
  operator: ts.SyntaxKind.EqualsEqualsEqualsToken | ts.SyntaxKind.ExclamationEqualsEqualsToken,
  matchesTarget: (candidate: ts.Expression) => boolean
): boolean => {
  const comparison = unwrapParentheses(expression);
  return (
    ts.isBinaryExpression(comparison) &&
    comparison.operatorToken.kind === operator &&
    ((matchesTarget(comparison.left) && stringLiteralValue(comparison.right) === "local") ||
      (stringLiteralValue(comparison.left) === "local" && matchesTarget(comparison.right)))
  );
};

const isExactFilterCallback = (expression: ts.Expression): boolean => {
  if (!ts.isArrowFunction(expression) || expression.parameters.length !== 1) {
    return false;
  }
  const parameterName = requiredIdentifierParameter(expression, 0);
  const body = expressionArrowBody(expression);
  return (
    parameterName !== undefined &&
    body !== undefined &&
    isLocalComparison(
      body,
      ts.SyntaxKind.EqualsEqualsEqualsToken,
      (candidate) => isPropertyAccess(candidate, parameterName, "sourceId")
    )
  );
};

const isExactMapBinding = (parameter: ts.ParameterDeclaration): boolean => {
  if (
    parameter.dotDotDotToken ||
    parameter.questionToken ||
    parameter.initializer ||
    !ts.isObjectBindingPattern(parameter.name) ||
    parameter.name.elements.length !== 5
  ) {
    return false;
  }
  const expected = new Set(["id", "time", "title", "description", "active"]);
  const names = parameter.name.elements.map((element) =>
    ts.isIdentifier(element.name) ? element.name.text : undefined
  );
  return (
    names.every(
      (name) => name !== undefined && expected.has(name)
    ) &&
    new Set(names).size === expected.size &&
    parameter.name.elements.every(
      (element) =>
      !element.dotDotDotToken &&
      !element.propertyName &&
      !element.initializer &&
      ts.isIdentifier(element.name)
    )
  );
};

const isExactMapCallback = (expression: ts.Expression): boolean => {
  if (
    !ts.isArrowFunction(expression) ||
    expression.parameters.length !== 1 ||
    !isExactMapBinding(expression.parameters[0])
  ) {
    return false;
  }
  const body = expressionArrowBody(expression);
  const payload = body ? unwrapParentheses(body) : undefined;
  if (!payload || !ts.isObjectLiteralExpression(payload) || payload.properties.length !== 5) {
    return false;
  }
  const expected = new Set(["id", "time", "title", "description", "active"]);
  const names = payload.properties.map((property) =>
    ts.isShorthandPropertyAssignment(property) ? property.name.text : undefined
  );
  return (
    names.every(
      (name) => name !== undefined && expected.has(name)
    ) &&
    new Set(names).size === expected.size &&
    payload.properties.every(
      (property) =>
      ts.isShorthandPropertyAssignment(property) &&
      !property.objectAssignmentInitializer
    )
  );
};

const hasExactSchedulePayload = (payload: ts.Expression): boolean => {
  if (
    !ts.isCallExpression(payload) ||
    !ts.isPropertyAccessExpression(payload.expression) ||
    payload.expression.name.text !== "map" ||
    payload.arguments.length !== 1
  ) {
    return false;
  }
  const filter = payload.expression.expression;
  return (
    ts.isCallExpression(filter) &&
    ts.isPropertyAccessExpression(filter.expression) &&
    filter.expression.name.text === "filter" &&
    isIdentifierNamed(filter.expression.expression, "items") &&
    filter.arguments.length === 1 &&
    isExactFilterCallback(filter.arguments[0]) &&
    isExactMapCallback(payload.arguments[0])
  );
};

const hasPersistLocalItemsContract = (source: ts.SourceFile): boolean => {
  const persist = arrowBinding(source, "persistLocalItems");
  if (!persist || persist.parameters.length !== 1 || requiredIdentifierParameter(persist, 0) !== "items") {
    return false;
  }
  const body = persist.body;
  if (!ts.isBlock(body) || body.statements.length !== 1 || !ts.isExpressionStatement(body.statements[0])) {
    return false;
  }
  const command = body.statements[0].expression;
  return (
    isCommandCall(command, commandContracts[0]) &&
    command.arguments.length === 2 &&
    hasExactSchedulePayload(command.arguments[1])
  );
};

const isScheduleIndexSourceId = (expression: ts.Expression, indexName: string): boolean =>
  ts.isPropertyAccessExpression(expression) &&
  expression.questionDotToken !== undefined &&
  expression.name.text === "sourceId" &&
  ts.isElementAccessExpression(expression.expression) &&
  isIdentifierNamed(expression.expression.expression, "schedule") &&
  expression.expression.argumentExpression !== undefined &&
  isIdentifierNamed(expression.expression.argumentExpression, indexName);

const isExactIndexedLocalGuard = (statement: ts.Statement, indexName: string): boolean => {
  if (!ts.isIfStatement(statement)) {
    return false;
  }
  return (
    isLocalComparison(
      statement.expression,
      ts.SyntaxKind.ExclamationEqualsEqualsToken,
      (candidate) => isScheduleIndexSourceId(candidate, indexName)
    ) &&
    isReturnOnly(statement.thenStatement)
  );
};

const isExactFindSourceId = (expression: ts.Expression, idName: string): boolean => {
  if (
    !ts.isPropertyAccessExpression(expression) ||
    expression.questionDotToken === undefined ||
    expression.name.text !== "sourceId" ||
    !ts.isCallExpression(expression.expression) ||
    !ts.isPropertyAccessExpression(expression.expression.expression)
  ) {
    return false;
  }
  const find = expression.expression;
  const findProperty = expression.expression.expression;
  if (
    findProperty.name.text !== "find" ||
    !isIdentifierNamed(findProperty.expression, "schedule") ||
    find.arguments.length !== 1 ||
    !ts.isArrowFunction(find.arguments[0]) ||
    find.arguments[0].parameters.length !== 1
  ) {
    return false;
  }
  const itemName = requiredIdentifierParameter(find.arguments[0], 0);
  const body = expressionArrowBody(find.arguments[0]);
  return (
    itemName !== undefined &&
    body !== undefined &&
    ts.isBinaryExpression(body) &&
    body.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken &&
    isPropertyAccess(body.left, itemName, "id") &&
    isIdentifierNamed(body.right, idName)
  );
};

const hasPersistenceAfterGuard = (arrow: ts.ArrowFunction): boolean =>
  ts.isBlock(arrow.body) &&
  arrow.body.statements.slice(1).some(
    (statement) =>
      ts.isExpressionStatement(statement) &&
      [statement.expression, ...descendants(statement.expression)].some(
        (node) => ts.isCallExpression(node) && isIdentifierNamed(node.expression, "persistLocalItems")
      )
  );

const hasIndexedLocalGuard = (source: ts.SourceFile, name: string): boolean => {
  const handler = arrowBinding(source, name);
  const indexName = handler ? requiredIdentifierParameter(handler, 0) : undefined;
  return (
    handler !== undefined &&
    indexName !== undefined &&
    ts.isBlock(handler.body) &&
    handler.body.statements.length > 0 &&
    isExactIndexedLocalGuard(handler.body.statements[0], indexName) &&
    hasPersistenceAfterGuard(handler)
  );
};

const hasRemoveLocalGuard = (source: ts.SourceFile): boolean => {
  const handler = arrowBinding(source, "removeItem");
  const idName = handler ? requiredIdentifierParameter(handler, 0) : undefined;
  if (
    !handler ||
    !idName ||
    !ts.isBlock(handler.body) ||
    handler.body.statements.length === 0
  ) {
    return false;
  }
  const guard = handler.body.statements[0];
  if (!ts.isIfStatement(guard)) {
    return false;
  }
  return (
    isLocalComparison(
      guard.expression,
      ts.SyntaxKind.ExclamationEqualsEqualsToken,
      (candidate) => isExactFindSourceId(candidate, idName)
    ) &&
    isReturnOnly(guard.thenStatement) &&
    hasPersistenceAfterGuard(handler)
  );
};

const jsxAttributeExpression = (
  node: ts.JsxElement | ts.JsxSelfClosingElement,
  name: string
): ts.Expression | undefined => {
  const attributes = ts.isJsxElement(node)
    ? node.openingElement.attributes.properties
    : node.attributes.properties;
  const attribute = attributes.find(
    (candidate): candidate is ts.JsxAttribute =>
      ts.isJsxAttribute(candidate) &&
      ts.isIdentifier(candidate.name) &&
      candidate.name.text === name
  );
  return attribute?.initializer && ts.isJsxExpression(attribute.initializer)
    ? attribute.initializer.expression
    : undefined;
};

const jsxStringAttributeValue = (
  node: ts.JsxElement | ts.JsxSelfClosingElement,
  name: string
): string | undefined => {
  const attributes = ts.isJsxElement(node)
    ? node.openingElement.attributes.properties
    : node.attributes.properties;
  const attribute = attributes.find(
    (candidate): candidate is ts.JsxAttribute =>
      ts.isJsxAttribute(candidate) &&
      ts.isIdentifier(candidate.name) &&
      candidate.name.text === name
  );
  return attribute?.initializer && ts.isStringLiteral(attribute.initializer)
    ? attribute.initializer.text
    : undefined;
};

const isJsxComponent = (
  node: ts.Node,
  name: string
): node is ts.JsxElement | ts.JsxSelfClosingElement =>
  (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) &&
  jsxTagName(ts.isJsxElement(node) ? node.openingElement.tagName : node.tagName) === name;

const isPendingRemovalNonNullCheck = (expression: ts.Expression): boolean =>
  ts.isBinaryExpression(expression) &&
  expression.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken &&
  isIdentifierNamed(expression.left, "pendingRemovalId") &&
  isNullLiteral(expression.right);

const isRemovalTriggerRefClear = (statement: ts.Statement): boolean =>
  ts.isExpressionStatement(statement) &&
  ts.isBinaryExpression(statement.expression) &&
  statement.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
  isPropertyAccess(statement.expression.left, "removalTriggerRef", "current") &&
  isNullLiteral(statement.expression.right);

const isSetPendingRemovalNull = (statement: ts.Statement): boolean =>
  ts.isExpressionStatement(statement) &&
  isDirectCall(statement.expression, "setPendingRemovalId", 1) &&
  isNullLiteral(statement.expression.arguments[0]);

const isRestoreRemovalFocus = (statement: ts.Statement): boolean =>
  isExpressionCall(statement, "restoreRemovalFocus", 0);

const isExactRemoveCall = (statement: ts.Statement): boolean =>
  ts.isExpressionStatement(statement) &&
  isDirectCall(statement.expression, "removeItem", 1) &&
  isIdentifierNamed(statement.expression.arguments[0], "pendingRemovalId");

const isExactConfirmGuard = (statement: ts.Statement): boolean =>
  ts.isIfStatement(statement) &&
  isPendingRemovalNonNullCheck(statement.expression) &&
  ts.isBlock(statement.thenStatement) &&
  statement.thenStatement.statements.length === 1 &&
  isExactRemoveCall(statement.thenStatement.statements[0]);

const isExactCancelHandler = (expression: ts.Expression): boolean =>
  ts.isArrowFunction(expression) &&
  ts.isBlock(expression.body) &&
  expression.body.statements.length === 2 &&
  isSetPendingRemovalNull(expression.body.statements[0]) &&
  isRestoreRemovalFocus(expression.body.statements[1]);

const isExactConfirmHandler = (expression: ts.Expression): boolean =>
  ts.isArrowFunction(expression) &&
  ts.isBlock(expression.body) &&
  expression.body.statements.length === 4 &&
  isExactConfirmGuard(expression.body.statements[0]) &&
  isRemovalTriggerRefClear(expression.body.statements[1]) &&
  isSetPendingRemovalNull(expression.body.statements[2]) &&
  isRestoreRemovalFocus(expression.body.statements[3]);

const isTriggerBinding = (statement: ts.Statement): boolean =>
  ts.isVariableStatement(statement) &&
  statement.declarationList.declarations.length === 1 &&
  isIdentifierNamed(statement.declarationList.declarations[0].name, "trigger") &&
  statement.declarationList.declarations[0].initializer !== undefined &&
  isPropertyAccess(
    statement.declarationList.declarations[0].initializer,
    "removalTriggerRef",
    "current"
  );

const isTriggerFocus = (statement: ts.Statement): boolean =>
  ts.isExpressionStatement(statement) &&
  ts.isCallExpression(statement.expression) &&
  statement.expression.arguments.length === 0 &&
  isPropertyAccess(statement.expression.expression, "trigger", "focus");

const isTriggerConnectionGuard = (statement: ts.Statement): boolean =>
  ts.isIfStatement(statement) &&
  isPropertyAccess(statement.expression, "trigger", "isConnected") &&
  ts.isBlock(statement.thenStatement) &&
  statement.thenStatement.statements.length === 2 &&
  isTriggerFocus(statement.thenStatement.statements[0]) &&
  isBareReturn(statement.thenStatement.statements[1]) &&
  statement.elseStatement === undefined;

const isAddItemFallbackFocus = (statement: ts.Statement): boolean => {
  if (!ts.isExpressionStatement(statement) || !ts.isCallExpression(statement.expression)) {
    return false;
  }
  const focus = statement.expression;
  if (focus.arguments.length !== 0 || !ts.isPropertyAccessExpression(focus.expression) || focus.expression.name.text !== "focus") {
    return false;
  }
  const query = focus.expression.expression;
  return (
    ts.isCallExpression(query) &&
    ts.isPropertyAccessExpression(query.expression) &&
    isIdentifierNamed(query.expression.expression, "document") &&
    query.expression.name.text === "querySelector" &&
    query.typeArguments?.length === 1 &&
    ts.isTypeReferenceNode(query.typeArguments[0]) &&
    isIdentifierNamed(query.typeArguments[0].typeName, "HTMLButtonElement") &&
    query.arguments.length === 1 &&
    stringLiteralValue(query.arguments[0]) === ".schedule-add-item"
  );
};

const hasExactRestoreFunction = (source: ts.SourceFile): boolean => {
  const restore = arrowBinding(source, "restoreRemovalFocus");
  if (
    !restore ||
    !ts.isBlock(restore.body) ||
    restore.body.statements.length !== 1 ||
    !ts.isExpressionStatement(restore.body.statements[0]) ||
    !isDirectCall(restore.body.statements[0].expression, "requestAnimationFrame", 1)
  ) {
    return false;
  }
  const callback = restore.body.statements[0].expression.arguments[0];
  return (
    ts.isArrowFunction(callback) &&
    callback.parameters.length === 0 &&
    ts.isBlock(callback.body) &&
    callback.body.statements.length === 3 &&
    isTriggerBinding(callback.body.statements[0]) &&
    isTriggerConnectionGuard(callback.body.statements[1]) &&
    isAddItemFallbackFocus(callback.body.statements[2])
  );
};

const scheduleMapCallbacks = (source: ts.SourceFile): ts.ArrowFunction[] =>
  descendants(source).flatMap((node) => {
    if (
      !ts.isCallExpression(node) ||
      !ts.isPropertyAccessExpression(node.expression) ||
      node.expression.name.text !== "map" ||
      !isIdentifierNamed(node.expression.expression, "schedule") ||
      node.arguments.length !== 1 ||
      !ts.isArrowFunction(node.arguments[0])
    ) {
      return [];
    }
    return [node.arguments[0]];
  });

const isExactDeleteTriggerCapture = (
  expression: ts.Expression,
  itemName: string
): boolean => {
  if (
    !ts.isArrowFunction(expression) ||
    expression.parameters.length !== 1 ||
    !ts.isBlock(expression.body) ||
    expression.body.statements.length !== 2
  ) {
    return false;
  }
  const eventName = requiredIdentifierParameter(expression, 0);
  const capture = expression.body.statements[0];
  const setPending = expression.body.statements[1];
  return (
    eventName !== undefined &&
    ts.isExpressionStatement(capture) &&
    ts.isBinaryExpression(capture.expression) &&
    capture.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
    isPropertyAccess(capture.expression.left, "removalTriggerRef", "current") &&
    isPropertyAccess(capture.expression.right, eventName, "currentTarget") &&
    ts.isExpressionStatement(setPending) &&
    isDirectCall(setPending.expression, "setPendingRemovalId", 1) &&
    isPropertyAccess(setPending.expression.arguments[0], itemName, "id")
  );
};

// 删除入口、对话框和焦点恢复必须属于同一条 schedule item 操作链。
const hasDeletionFocusRestore = (source: ts.SourceFile): boolean => {
  const deleteButtons = descendants(source).filter(
    (node): node is ts.JsxElement | ts.JsxSelfClosingElement =>
      isJsxComponent(node, "IconButton") &&
      jsxStringAttributeValue(node, "label") === "Delete schedule item"
  );
  const dialogs = descendants(source).filter(
    (node): node is ts.JsxElement | ts.JsxSelfClosingElement =>
      isJsxComponent(node, "ConfirmDialog")
  );
  if (deleteButtons.length !== 1 || dialogs.length !== 1) {
    return false;
  }
  const deleteButton = deleteButtons[0];
  const itemCallbacks = scheduleMapCallbacks(source).filter((callback) =>
    descendants(callback).includes(deleteButton)
  );
  const itemName = itemCallbacks.length === 1
    ? requiredIdentifierParameter(itemCallbacks[0], 0)
    : undefined;
  const onClick = jsxAttributeExpression(deleteButton, "onClick");
  const dialog = dialogs[0];
  const open = jsxAttributeExpression(dialog, "open");
  const onCancel = jsxAttributeExpression(dialog, "onCancel");
  const onConfirm = jsxAttributeExpression(dialog, "onConfirm");
  return (
    itemName !== undefined &&
    onClick !== undefined &&
    isExactDeleteTriggerCapture(onClick, itemName) &&
    open !== undefined &&
    isPendingRemovalNonNullCheck(open) &&
    onCancel !== undefined &&
    isExactCancelHandler(onCancel) &&
    onConfirm !== undefined &&
    isExactConfirmHandler(onConfirm) &&
    hasExactRestoreFunction(source)
  );
};

const scheduleBehaviorContractFailures = (source: ts.SourceFile): string[] => {
  const failures: string[] = [];
  if (!hasPersistLocalItemsContract(source)) {
    failures.push("persistLocalItems 未精确过滤 local 条目并生成五字段 payload");
  }
  if (!hasIndexedLocalGuard(source, "toggleActive")) {
    failures.push("toggleActive 缺少基于 index 参数的 local 守卫");
  }
  if (!hasIndexedLocalGuard(source, "updateItem")) {
    failures.push("updateItem 缺少基于 index 参数的 local 守卫");
  }
  if (!hasRemoveLocalGuard(source)) {
    failures.push("removeItem 缺少基于 id 参数的 local 守卫");
  }
  if (!hasDeletionFocusRestore(source)) {
    failures.push("删除焦点恢复未绑定到同一 schedule item 操作链");
  }
  return failures;
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

type ScheduleFixtureOverrides = {
  filterExpression?: string;
  mapPayload?: string;
  toggleGuardExpression?: string;
  updateGuardExpression?: string;
  removeGuardExpression?: string;
  confirmStatements?: string;
  restoreDefinition?: string;
  deleteOnClickStatements?: string;
  extraControls?: string;
};

const scheduleFixture = (overrides: ScheduleFixtureOverrides = {}): string => `
declare const nodecg: { sendMessage: (...args: unknown[]) => void };
type Item = { id: string; sourceId: string; time: string; title: string; description: string; active: boolean };
declare const schedule: Item[];
declare const fixed: Item;
declare const pendingRemovalId: string | null;
declare const setPendingRemovalId: (id: string | null) => void;
declare const requestAnimationFrame: (callback: () => void) => number;
declare const document: { querySelector: <T>(selector: string) => T | null };
declare const useRef: <T>(value: T) => { current: T };
declare const IconButton: unknown;
declare const ConfirmDialog: unknown;
const persistLocalItems = (items: Item[]) => {
  nodecg.sendMessage("replaceSchedule", items.filter((item) => ${overrides.filterExpression ?? 'item.sourceId === "local"'}).map(({ id, time, title, description, active }) => (${overrides.mapPayload ?? "{ id, time, title, description, active }"})));
};
const toggleActive = (index: number) => {
  if (${overrides.toggleGuardExpression ?? 'schedule[index]?.sourceId !== "local"'}) return;
  persistLocalItems(schedule);
};
const updateItem = (index: number) => {
  if (${overrides.updateGuardExpression ?? 'schedule[index]?.sourceId !== "local"'}) return;
  persistLocalItems(schedule);
};
const removeItem = (id: string) => {
  if (${overrides.removeGuardExpression ?? 'schedule.find((item) => item.id === id)?.sourceId !== "local"'}) return;
  persistLocalItems(schedule);
};
${overrides.restoreDefinition ?? `const restoreRemovalFocus = () => {
  requestAnimationFrame(() => {
    const trigger = removalTriggerRef.current;
    if (trigger?.isConnected) {
      trigger.focus();
      return;
    }
    document.querySelector<HTMLButtonElement>(".schedule-add-item")?.focus();
  });
};`}
const removalTriggerRef = useRef<HTMLButtonElement | null>(null);
const controls = <>{schedule.map((item) => <IconButton label="Delete schedule item" onClick={(event) => { ${overrides.deleteOnClickStatements ?? "removalTriggerRef.current = event.currentTarget; setPendingRemovalId(item.id);"} }} />)}<ConfirmDialog open={pendingRemovalId !== null} onCancel={() => { setPendingRemovalId(null); restoreRemovalFocus(); }} onConfirm={() => { ${overrides.confirmStatements ?? "if (pendingRemovalId !== null) { removeItem(pendingRemovalId); } removalTriggerRef.current = null; setPendingRemovalId(null); restoreRemovalFocus();"} }} />${overrides.extraControls ?? ""}</>;
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
  const scheduleSource = parseCommandSource(commandContracts[0].relative);
  failures.push(
    ...scheduleBehaviorContractFailures(scheduleSource).map(
      (failure) => `schedule-panel.tsx: ${failure}`
    )
  );
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

  const validSchedule = compileFixture(
    "operations-valid-schedule-fixture.tsx",
    scheduleFixture()
  );
  ok(scheduleBehaviorContractFailures(validSchedule).length === 0);

  const parenthesizedFilter = compileFixture(
    "operations-parenthesized-filter-fixture.tsx",
    scheduleFixture({ filterExpression: '(item.sourceId === "local")' })
  );
  ok(scheduleBehaviorContractFailures(parenthesizedFilter).length === 0);

  const reversedLocalComparisons = compileFixture(
    "operations-reversed-local-comparisons-fixture.tsx",
    scheduleFixture({
      filterExpression: '"local" === item.sourceId',
      toggleGuardExpression: '"local" !== schedule[index]?.sourceId',
      updateGuardExpression: '"local" !== schedule[index]?.sourceId',
      removeGuardExpression: '"local" !== schedule.find((item) => item.id === id)?.sourceId',
    })
  );
  ok(scheduleBehaviorContractFailures(reversedLocalComparisons).length === 0);

  const fixedSourceFilter = compileFixture(
    "operations-fixed-source-filter-fixture.tsx",
    scheduleFixture({ filterExpression: 'fixed.sourceId === "local"' })
  );
  ok(scheduleBehaviorContractFailures(fixedSourceFilter).some((failure) =>
    failure.includes("persistLocalItems")
  ));

  const constantActivePayload = compileFixture(
    "operations-constant-active-payload-fixture.tsx",
    scheduleFixture({ mapPayload: "{ id, time, title, description, active: true }" })
  );
  ok(scheduleBehaviorContractFailures(constantActivePayload).some((failure) =>
    failure.includes("persistLocalItems")
  ));

  const fixedIndexGuard = compileFixture(
    "operations-fixed-index-guard-fixture.tsx",
    scheduleFixture({ toggleGuardExpression: 'schedule[0]?.sourceId !== "local"' })
  );
  ok(scheduleBehaviorContractFailures(fixedIndexGuard).some((failure) =>
    failure.includes("toggleActive")
  ));

  const wrongRemoveId = compileFixture(
    "operations-wrong-remove-id-fixture.tsx",
    scheduleFixture({
      removeGuardExpression: 'schedule.find((item) => item.id === "fixed")?.sourceId !== "local"',
    })
  );
  ok(scheduleBehaviorContractFailures(wrongRemoveId).some((failure) =>
    failure.includes("removeItem")
  ));

  const missingPendingClear = compileFixture(
    "operations-missing-pending-clear-fixture.tsx",
    scheduleFixture({
      confirmStatements: "if (pendingRemovalId !== null) { removeItem(pendingRemovalId); } removalTriggerRef.current = null; restoreRemovalFocus();",
    })
  );
  ok(scheduleBehaviorContractFailures(missingPendingClear).some((failure) =>
    failure.includes("同一 schedule item")
  ));

  const textOnlyFocus = compileFixture(
    "operations-text-only-focus-fixture.tsx",
    scheduleFixture({
      restoreDefinition: 'const restoreRemovalFocus = () => { const note = "requestAnimationFrame trigger.isConnected trigger.focus .schedule-add-item"; };',
    })
  );
  ok(scheduleBehaviorContractFailures(textOnlyFocus).some((failure) =>
    failure.includes("焦点恢复")
  ));

  const decoyFocusControls = compileFixture(
    "operations-decoy-focus-controls-fixture.tsx",
    scheduleFixture({
      deleteOnClickStatements: 'removalTriggerRef.current = event.currentTarget; setPendingRemovalId("wrong");',
      extraControls: '<IconButton onClick={(event) => { removalTriggerRef.current = event.currentTarget; setPendingRemovalId("other"); }} /><ConfirmDialog open={pendingRemovalId !== null} onCancel={() => { setPendingRemovalId(null); restoreRemovalFocus(); }} onConfirm={() => { if (pendingRemovalId !== null) { removeItem(pendingRemovalId); } removalTriggerRef.current = null; setPendingRemovalId(null); restoreRemovalFocus(); }} />',
    })
  );
  ok(scheduleBehaviorContractFailures(decoyFocusControls).some((failure) =>
    failure.includes("同一 schedule item")
  ));
});
