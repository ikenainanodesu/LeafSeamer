import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { ok, test } from "./test-harness";

const projectRoot = path.resolve(__dirname, "..");
const entries = [
  "bundles/logger-system/src/dashboard/log-viewer.tsx",
  "bundles/vb-matrix-control/src/dashboard/panel.tsx",
  "bundles/vb-matrix-control/src/dashboard/network-config-panel.tsx",
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
  const visit = (current: ts.Node) => {
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

const isPanelErrorBoundary = (node: ts.Node): boolean => {
  if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
    const tagName = ts.isJsxElement(node) ? node.openingElement.tagName : node.tagName;
    return jsxTagName(tagName) === "PanelErrorBoundary";
  }
  return false;
};

const isApplicationComponent = (
  node: ts.JsxElement | ts.JsxSelfClosingElement
): boolean => {
  const tagName = ts.isJsxElement(node) ? node.openingElement.tagName : node.tagName;
  const name = jsxTagName(tagName);
  return Boolean(name && /^[A-Z]/.test(name.split(".").pop() ?? ""));
};

const boundaryWrapsApplication = (renderArgument: ts.Expression): boolean => {
  for (const node of [renderArgument, ...descendants(renderArgument)]) {
    if (!isPanelErrorBoundary(node)) {
      continue;
    }
    if (
      descendants(node).some(
        (child) =>
          (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) &&
          child !== node &&
          isApplicationComponent(child)
      )
    ) {
      return true;
    }
  }
  return false;
};

const renderArgumentFromFixture = (text: string): ts.Expression => {
  const source = ts.createSourceFile(
    "boundary-fixture.tsx",
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  const renderCall = descendants(source).find(
    (node): node is ts.CallExpression =>
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "render" &&
      node.arguments.length > 0
  );
  if (!renderCall) {
    throw new Error("夹具缺少 render 调用");
  }
  return renderCall.arguments[0];
};

const hasReferencePanelImports = (source: ts.SourceFile): boolean => {
  const imports = source.statements.filter(ts.isImportDeclaration);
  const cssImport = imports.some(
    (declaration) =>
      declaration.importClause === undefined &&
      stringLiteralValue(declaration.moduleSpecifier) === "./_leaf-ui/index.css"
  );
  const boundaryImport = imports.some((declaration) => {
    if (stringLiteralValue(declaration.moduleSpecifier) !== "./_leaf-ui/components") {
      return false;
    }
    const bindings = declaration.importClause?.namedBindings;
    return (
      bindings !== undefined &&
      ts.isNamedImports(bindings) &&
      bindings.elements.some((element) => element.name.text === "PanelErrorBoundary")
    );
  });
  const protectedRender = descendants(source).some((node) => {
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) {
      return false;
    }
    if (node.expression.name.text !== "render" || node.arguments.length === 0) {
      return false;
    }
    return boundaryWrapsApplication(node.arguments[0]);
  });
  return cssImport && boundaryImport && protectedRender;
};

const isPatchDeclaration = (node: ts.Node): node is ts.VariableDeclaration => {
  if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name)) {
    return false;
  }
  return (
    node.name.text === "patch" &&
    node.initializer !== undefined &&
    ts.isObjectLiteralExpression(node.initializer)
  );
};

const hasExpectedPatchExists = (patch: ts.ObjectLiteralExpression): boolean =>
  patch.properties.some(
    (property) =>
      ts.isPropertyAssignment(property) &&
      ts.isIdentifier(property.name) &&
      property.name.text === "exists" &&
      ts.isPrefixUnaryExpression(property.initializer) &&
      property.initializer.operator === ts.SyntaxKind.ExclamationToken &&
      ts.isIdentifier(property.initializer.operand) &&
      property.initializer.operand.text === "isPatched"
  );

const isAuthenticatedPatchCall = (node: ts.Node): boolean => {
  if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression)) {
    return false;
  }
  const args = node.arguments;
  return (
    node.expression.text === "sendAuthenticatedCommand" &&
    args.length >= 3 &&
    stringLiteralValue(args[0]) === "vb-matrix-control" &&
    stringLiteralValue(args[1]) === "vb.updatePatch" &&
    ts.isIdentifier(args[2]) &&
    args[2].text === "patch"
  );
};

const callsConfirm = (node: ts.Node): boolean =>
  descendants(node).some(
    (child) =>
      ts.isCallExpression(child) &&
      ((ts.isIdentifier(child.expression) && child.expression.text === "confirm") ||
        (ts.isPropertyAccessExpression(child.expression) &&
          ts.isIdentifier(child.expression.expression) &&
          child.expression.expression.text === "window" &&
          child.expression.name.text === "confirm"))
  );

const functionBody = (node: ts.Node): ts.Block | undefined => {
  if (ts.isFunctionDeclaration(node) && node.name?.text === "togglePoint") {
    return node.body;
  }
  if (
    ts.isVariableDeclaration(node) &&
    ts.isIdentifier(node.name) &&
    node.name.text === "togglePoint" &&
    node.initializer &&
    (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
  ) {
    return node.initializer.body && ts.isBlock(node.initializer.body)
      ? node.initializer.body
      : undefined;
  }
  return undefined;
};

const hasTogglePointContract = (source: ts.SourceFile): boolean => {
  const toggleBody = descendants(source)
    .map(functionBody)
    .find((body): body is ts.Block => body !== undefined);
  if (!toggleBody || callsConfirm(toggleBody)) {
    return false;
  }

  const patchDeclaration = descendants(toggleBody).find(isPatchDeclaration);
  const patch = patchDeclaration?.initializer;
  if (!patch || !ts.isObjectLiteralExpression(patch) || !hasExpectedPatchExists(patch)) {
    return false;
  }
  if (
    !descendants(toggleBody).some(
      (node) => isAuthenticatedPatchCall(node)
    )
  ) {
    return false;
  }

  return descendants(source).some((node) => {
    if (!ts.isJsxElement(node) && !ts.isJsxSelfClosingElement(node)) {
      return false;
    }
    const openingElement = ts.isJsxElement(node) ? node.openingElement : node;
    const attributes = openingElement.attributes.properties;
    const isMatrixCell = attributes.some(
      (attribute: ts.JsxAttributeLike) =>
        ts.isJsxAttribute(attribute) &&
        ts.isIdentifier(attribute.name) &&
        attribute.name.text === "className" &&
        attribute.initializer?.getText(source).includes("matrix-cell")
    );
    const onClick = attributes.find(
      (attribute: ts.JsxAttributeLike): attribute is ts.JsxAttribute =>
        ts.isJsxAttribute(attribute) &&
        ts.isIdentifier(attribute.name) &&
        attribute.name.text === "onClick"
    );
    if (!isMatrixCell || !onClick || !onClick.initializer || !ts.isJsxExpression(onClick.initializer)) {
      return false;
    }
    const handler = onClick.initializer.expression;
    if (!handler || !ts.isArrowFunction(handler) || callsConfirm(handler)) {
      return false;
    }
    const directCall = ts.isBlock(handler.body)
      ? handler.body.statements.length === 1 &&
        ts.isExpressionStatement(handler.body.statements[0])
        ? handler.body.statements[0].expression
        : undefined
      : handler.body;
    return (
      directCall !== undefined &&
      ts.isCallExpression(directCall) &&
      ts.isIdentifier(directCall.expression) &&
      directCall.expression.text === "togglePoint" &&
      directCall.arguments.length === 2 &&
      ts.isIdentifier(directCall.arguments[0]) &&
      directCall.arguments[0].text === "point" &&
      ts.isIdentifier(directCall.arguments[1]) &&
      directCall.arguments[1].text === "isPatched"
    );
  });
};

const hasNamedImports = (
  source: ts.SourceFile,
  moduleSpecifier: string,
  names: string[]
): boolean => {
  const imported = new Set<string>();
  for (const statement of source.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      stringLiteralValue(statement.moduleSpecifier) !== moduleSpecifier
    ) {
      continue;
    }
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) {
      continue;
    }
    bindings.elements.forEach((element) => imported.add(element.name.text));
  }
  return names.every((name) => imported.has(name));
};

const hasDisclosure = (source: ts.SourceFile, title: string, storageKey: string): boolean =>
  descendants(source).some((node) => {
    if (!ts.isJsxElement(node) || jsxTagName(node.openingElement.tagName) !== "Disclosure") {
      return false;
    }
    const attributes = node.openingElement.attributes.properties;
    return ["title", "storageKey"].every((name) =>
      attributes.some(
        (attribute) =>
          ts.isJsxAttribute(attribute) &&
          ts.isIdentifier(attribute.name) &&
          attribute.name.text === name &&
          stringLiteralValue(attribute.initializer?.kind === ts.SyntaxKind.StringLiteral ? attribute.initializer : undefined) ===
            (name === "title" ? title : storageKey)
      )
    );
  });

const hasJsxAttribute = (source: ts.SourceFile, className: string, attributeName: string): boolean =>
  descendants(source).some((node) => {
    if (!ts.isJsxElement(node) && !ts.isJsxSelfClosingElement(node)) {
      return false;
    }
    const openingElement = ts.isJsxElement(node) ? node.openingElement : node;
    const hasClass = openingElement.attributes.properties.some(
      (attribute) =>
        ts.isJsxAttribute(attribute) &&
        ts.isIdentifier(attribute.name) &&
        attribute.name.text === "className" &&
        attribute.initializer?.getText(source).includes(className)
    );
    return (
      hasClass &&
      openingElement.attributes.properties.some(
        (attribute) =>
          ts.isJsxAttribute(attribute) &&
          ts.isIdentifier(attribute.name) &&
          attribute.name.text === attributeName
      )
    );
  });

const getJsxAttribute = (
  openingElement: ts.JsxOpeningLikeElement,
  name: string
): ts.JsxAttribute | undefined =>
  openingElement.attributes.properties.find(
    (attribute): attribute is ts.JsxAttribute =>
      ts.isJsxAttribute(attribute) && ts.isIdentifier(attribute.name) && attribute.name.text === name
  );

const hasPanelHeaderContract = (source: ts.SourceFile): boolean =>
  descendants(source).some((node) => {
    if (!ts.isJsxSelfClosingElement(node) || jsxTagName(node.tagName) !== "PanelHeader") {
      return false;
    }
    const kicker = getJsxAttribute(node, "kicker");
    const title = getJsxAttribute(node, "title");
    const target = getJsxAttribute(node, "target");
    const status = getJsxAttribute(node, "status");
    const statusTone = getJsxAttribute(node, "statusTone");
    const references = (attribute: ts.JsxAttribute | undefined, identifier: string) =>
      Boolean(
        attribute?.initializer &&
          descendants(attribute.initializer).some(
            (child) => ts.isIdentifier(child) && child.text === identifier
          )
      );
    return (
      stringLiteralValue(kicker?.initializer?.kind === ts.SyntaxKind.StringLiteral ? kicker.initializer : undefined) ===
        "VBAN Matrix" &&
      stringLiteralValue(title?.initializer?.kind === ts.SyntaxKind.StringLiteral ? title.initializer : undefined) ===
        "VB Matrix Control" &&
      references(target, "activeConnection") &&
      references(status, "activeConnectionId") &&
      references(statusTone, "activeConnectionId")
    );
  });

const bindingNameIncludes = (name: ts.BindingName, expected: string): boolean => {
  if (ts.isIdentifier(name)) {
    return name.text === expected;
  }
  if (ts.isObjectBindingPattern(name)) {
    return name.elements.some((element) => bindingNameIncludes(element.name, expected));
  }
  return name.elements.some(
    (element) => ts.isBindingElement(element) && bindingNameIncludes(element.name, expected)
  );
};

const bindingOwners = (source: ts.SourceFile, name: string): ts.Node[] => {
  const owners = new Set<ts.Node>();
  const add = (node: ts.Node, bindingName: ts.BindingName | undefined) => {
    if (bindingName && bindingNameIncludes(bindingName, name)) {
      owners.add(node);
    }
  };
  for (const node of descendants(source)) {
    if (ts.isVariableDeclaration(node) || ts.isParameter(node)) {
      add(node, node.name);
    } else if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) {
      if (node.name?.text === name) {
        owners.add(node);
      }
    } else if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
      if (node.name?.text === name) {
        owners.add(node);
      }
    } else if (ts.isCatchClause(node)) {
      add(node.variableDeclaration ?? node, node.variableDeclaration?.name);
    } else if (ts.isImportSpecifier(node) && node.name.text === name) {
      owners.add(node);
    } else if (ts.isNamespaceImport(node) && node.name.text === name) {
      owners.add(node);
    }
  }
  return [...owners];
};

const isConstVariableDeclaration = (node: ts.Node): node is ts.VariableDeclaration =>
  ts.isVariableDeclaration(node) &&
  ts.isVariableDeclarationList(node.parent) &&
  (node.parent.flags & ts.NodeFlags.Const) !== 0;

const isUseToastPushToastBinding = (node: ts.Node): boolean =>
  isConstVariableDeclaration(node) &&
  ts.isObjectBindingPattern(node.name) &&
  bindingNameIncludes(node.name, "pushToast") &&
  node.initializer !== undefined &&
  ts.isCallExpression(node.initializer) &&
  ts.isIdentifier(node.initializer.expression) &&
  node.initializer.expression.text === "useToast";

const isUseStatePendingSetterBinding = (node: ts.Node): boolean => {
  if (
    !isConstVariableDeclaration(node) ||
    !ts.isArrayBindingPattern(node.name) ||
    node.name.elements.length < 2 ||
    !ts.isBindingElement(node.name.elements[1]) ||
    !ts.isIdentifier(node.name.elements[1].name) ||
    node.name.elements[1].name.text !== "setPendingKeys" ||
    !node.initializer ||
    !ts.isCallExpression(node.initializer) ||
    !ts.isIdentifier(node.initializer.expression) ||
    node.initializer.expression.text !== "useState"
  ) {
    return false;
  }
  return true;
};

const hasUniqueBinding = (
  source: ts.SourceFile,
  name: string,
  predicate: (node: ts.Node) => boolean
): boolean => {
  const owners = bindingOwners(source, name);
  return owners.length === 1 && predicate(owners[0]);
};

const hasUniqueUseToastPushToastBinding = (source: ts.SourceFile): boolean =>
  hasUniqueBinding(source, "pushToast", isUseToastPushToastBinding);

const hasUniqueUseStatePendingSetterBinding = (source: ts.SourceFile): boolean =>
  hasUniqueBinding(source, "setPendingKeys", isUseStatePendingSetterBinding);

const hasToastBinding = (source: ts.SourceFile): boolean => {
  const usesToast = hasUniqueUseToastPushToastBinding(source);
  const rendersToastRegion = descendants(source).some((node) => {
    if (!ts.isJsxSelfClosingElement(node) || jsxTagName(node.tagName) !== "ToastRegion") {
      return false;
    }
    const items = getJsxAttribute(node, "items");
    const expression =
      items?.initializer && ts.isJsxExpression(items.initializer)
        ? items.initializer.expression
        : undefined;
    return (
      expression !== undefined && ts.isIdentifier(expression) && expression.text === "toasts"
    );
  });
  return usesToast && rendersToastRegion;
};

const isPromiseMethodCall = (
  node: ts.Node,
  method: "catch" | "finally"
): node is ts.CallExpression & { expression: ts.PropertyAccessExpression } =>
  ts.isCallExpression(node) &&
  ts.isPropertyAccessExpression(node.expression) &&
  node.expression.name.text === method;

const receiverOriginatesFromAuthenticatedPatch = (receiver: ts.Expression): boolean => {
  if (isAuthenticatedPatchCall(receiver)) {
    return true;
  }
  if (
    !ts.isCallExpression(receiver) ||
    !ts.isPropertyAccessExpression(receiver.expression) ||
    (receiver.expression.name.text !== "catch" && receiver.expression.name.text !== "finally")
  ) {
    return false;
  }
  return receiverOriginatesFromAuthenticatedPatch(receiver.expression.expression);
};

const isNestedExecutableBody = (node: ts.Node): boolean =>
  ts.isArrowFunction(node) ||
  ts.isFunctionExpression(node) ||
  ts.isFunctionDeclaration(node) ||
  ts.isMethodDeclaration(node) ||
  ts.isClassDeclaration(node) ||
  ts.isClassExpression(node);

const hasDirectlyReachableNode = (
  root: ts.Node,
  predicate: (node: ts.Node) => boolean
): boolean => {
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found || (node !== root && isNestedExecutableBody(node))) {
      return;
    }
    if (predicate(node)) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(root);
  return found;
};

const isDangerToastCall = (node: ts.Node): boolean =>
  ts.isCallExpression(node) &&
  ts.isIdentifier(node.expression) &&
  node.expression.text === "pushToast" &&
  node.arguments.length >= 2 &&
  stringLiteralValue(node.arguments[1]) === "danger";

const handlerCallsDangerToast = (handler: ts.Expression): boolean => {
  if (!ts.isArrowFunction(handler) && !ts.isFunctionExpression(handler)) {
    return false;
  }
  return hasDirectlyReachableNode(handler.body, isDangerToastCall);
};

const isNextFromCurrentStatement = (statement: ts.Statement): boolean => {
  if (!ts.isVariableStatement(statement)) {
    return false;
  }
  return statement.declarationList.declarations.some((declaration) => {
    const initializer = declaration.initializer;
    return (
      ts.isIdentifier(declaration.name) &&
      declaration.name.text === "next" &&
      initializer !== undefined &&
      ts.isNewExpression(initializer) &&
      ts.isIdentifier(initializer.expression) &&
      initializer.expression.text === "Set" &&
      initializer.arguments?.length === 1 &&
      ts.isIdentifier(initializer.arguments[0]) &&
      initializer.arguments[0].text === "current"
    );
  });
};

const isNextDeleteKeyStatement = (statement: ts.Statement): boolean => {
  if (!ts.isExpressionStatement(statement) || !ts.isCallExpression(statement.expression)) {
    return false;
  }
  const call = statement.expression;
  return (
    ts.isPropertyAccessExpression(call.expression) &&
    ts.isIdentifier(call.expression.expression) &&
    call.expression.expression.text === "next" &&
    call.expression.name.text === "delete" &&
    call.arguments.length === 1 &&
    ts.isIdentifier(call.arguments[0]) &&
    call.arguments[0].text === "key"
  );
};

const isReturnNextStatement = (statement: ts.Statement): boolean =>
  ts.isReturnStatement(statement) &&
  statement.expression !== undefined &&
  ts.isIdentifier(statement.expression) &&
  statement.expression.text === "next";

const hasPendingKeysUpdaterContract = (handler: ts.Expression): boolean =>
  hasDirectlyReachableNode(handler, (node) => {
    if (
      !ts.isCallExpression(node) ||
      !ts.isIdentifier(node.expression) ||
      node.expression.text !== "setPendingKeys" ||
      node.arguments.length !== 1
    ) {
      return false;
    }
    const updater = node.arguments[0];
    if (
      (!ts.isArrowFunction(updater) && !ts.isFunctionExpression(updater)) ||
      updater.parameters.length !== 1 ||
      !ts.isIdentifier(updater.parameters[0].name) ||
      updater.parameters[0].name.text !== "current" ||
      !ts.isBlock(updater.body)
    ) {
      return false;
    }
    const statements = updater.body.statements;
    const nextIndex = statements.findIndex(isNextFromCurrentStatement);
    const deleteIndex = statements.findIndex(isNextDeleteKeyStatement);
    const returnIndex = statements.findIndex(isReturnNextStatement);
    return nextIndex >= 0 && deleteIndex > nextIndex && returnIndex > deleteIndex;
  });

const hasAuthenticatedCatchToastContract = (source: ts.SourceFile): boolean =>
  hasUniqueUseToastPushToastBinding(source) &&
  descendants(source).some(
    (node) =>
      isPromiseMethodCall(node, "catch") &&
      node.arguments.length === 1 &&
      receiverOriginatesFromAuthenticatedPatch(node.expression.expression) &&
      handlerCallsDangerToast(node.arguments[0])
  );

const receiverChainHasAuthenticatedCatchToast = (receiver: ts.Expression): boolean => {
  if (!ts.isCallExpression(receiver) || !ts.isPropertyAccessExpression(receiver.expression)) {
    return false;
  }
  if (receiver.expression.name.text === "catch") {
    return (
      receiver.arguments.length === 1 &&
      receiverOriginatesFromAuthenticatedPatch(receiver.expression.expression) &&
      handlerCallsDangerToast(receiver.arguments[0])
    );
  }
  if (receiver.expression.name.text !== "finally") {
    return false;
  }
  return receiverChainHasAuthenticatedCatchToast(receiver.expression.expression);
};

const hasPromiseScopedPendingContract = (source: ts.SourceFile): boolean => {
  const toggleBody = descendants(source)
    .map(functionBody)
    .find((body): body is ts.Block => body !== undefined);
  if (
    !toggleBody ||
    !hasUniqueUseToastPushToastBinding(source) ||
    !hasUniqueUseStatePendingSetterBinding(source)
  ) {
    return false;
  }
  const hasTimer = descendants(toggleBody).some(
    (node) =>
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === "window" &&
      node.expression.name.text === "setTimeout"
  );
  const finallyCall = descendants(toggleBody).find(
    (node): node is ts.CallExpression & { expression: ts.PropertyAccessExpression } =>
      isPromiseMethodCall(node, "finally") &&
      node.arguments.length === 1 &&
      (ts.isArrowFunction(node.arguments[0]) || ts.isFunctionExpression(node.arguments[0]))
  );
  if (
    !finallyCall ||
    hasTimer ||
    !receiverChainHasAuthenticatedCatchToast(finallyCall.expression.expression)
  ) {
    return false;
  }
  const finallyHandler = finallyCall.arguments[0];
  if (!ts.isArrowFunction(finallyHandler) && !ts.isFunctionExpression(finallyHandler)) {
    return false;
  }
  return hasPendingKeysUpdaterContract(finallyHandler);
};

const hasWindowAlert = (source: ts.SourceFile): boolean =>
  descendants(source).some(
    (node) =>
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === "window" &&
      node.expression.name.text === "alert"
  );

const cssDeclarations = (css: string, selector: string): Map<string, string> => {
  const uncommented = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const rule of uncommented.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = rule[1].split(",").map((current) => current.trim());
    if (!selectors.includes(selector)) {
      continue;
    }
    return new Map(
      [...rule[2].matchAll(/([a-z-]+)\s*:\s*([^;]+);/g)].map((declaration) => [
        declaration[1],
        declaration[2].trim(),
      ])
    );
  }
  return new Map();
};

const hasNetworkRemovalConfirmationContract = (source: ts.SourceFile): boolean =>
  descendants(source).some((node) => {
    if (!ts.isJsxElement(node) && !ts.isJsxSelfClosingElement(node)) {
      return false;
    }
    const openingElement = ts.isJsxElement(node) ? node.openingElement : node;
    if (jsxTagName(openingElement.tagName) !== "ConfirmDialog") {
      return false;
    }
    const onConfirm = openingElement.attributes.properties.find(
      (attribute): attribute is ts.JsxAttribute =>
        ts.isJsxAttribute(attribute) &&
        ts.isIdentifier(attribute.name) &&
        attribute.name.text === "onConfirm"
    );
    if (!onConfirm?.initializer || !ts.isJsxExpression(onConfirm.initializer)) {
      return false;
    }
    const handler = onConfirm.initializer.expression;
    if (!handler || !ts.isArrowFunction(handler) || !ts.isBlock(handler.body)) {
      return false;
    }
    return descendants(handler.body).some(
      (child) => {
        if (
          !ts.isIfStatement(child) ||
          !ts.isBinaryExpression(child.expression) ||
          child.expression.operatorToken.kind !== ts.SyntaxKind.ExclamationEqualsEqualsToken ||
          !ts.isIdentifier(child.expression.left) ||
          child.expression.left.text !== "pendingRemovalId" ||
          child.expression.right.kind !== ts.SyntaxKind.NullKeyword
        ) {
          return false;
        }
        return descendants(child.thenStatement).some(
          (statement) =>
            ts.isCallExpression(statement) &&
            ts.isIdentifier(statement.expression) &&
            statement.expression.text === "handleRemove" &&
            statement.arguments.length === 1 &&
            ts.isIdentifier(statement.arguments[0]) &&
            statement.arguments[0].text === "pendingRemovalId"
        );
      }
    );
  });

const networkRemovalFixture = (statement: string): ts.SourceFile =>
  ts.createSourceFile(
    "network-removal-fixture.tsx",
    `const pendingRemovalId = null; const handleRemove = (_id: string) => {}; const view = <ConfirmDialog onConfirm={() => { ${statement} }} />;`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

const matrixPromiseFixture = (body: string): ts.SourceFile =>
  ts.createSourceFile(
    "matrix-promise-fixture.tsx",
    `const { items: toasts, pushToast } = useToast(); const [pendingKeys, setPendingKeys] = useState(new Set()); const togglePoint = () => { const key = "point"; const patch = {}; ${body} };`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

const toastFixture = (command: string): ts.SourceFile =>
  ts.createSourceFile(
    "toast-fixture.tsx",
    `const { items: toasts, pushToast } = useToast(); const [pendingKeys, setPendingKeys] = useState(new Set()); const view = <ToastRegion items={toasts} />; ${command}`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

// 固定参考面板必须满足真实的本地 UI 导入、错误边界包裹和渲染结构。
test("reference dashboards use the local UI snapshot and error boundary", () => {
  for (const relative of entries) {
    ok(hasReferencePanelImports(parseSource(relative)));
  }
});

// MatrixView 必须在真实函数和矩阵单元格处理器中保留认证切换合同。
test("VB matrix keeps authenticated point toggling", () => {
  ok(
    hasTogglePointContract(
      parseSource("bundles/vb-matrix-control/src/dashboard/components/MatrixView.tsx")
    )
  );
});

// VB 主面板的高频矩阵常驻，次级控制使用本地折叠组件和 Lucide 图标。
test("VB panel uses tiered local UI controls", () => {
  const source = parseSource("bundles/vb-matrix-control/src/dashboard/components/Panel.tsx");
  ok(hasNamedImports(source, "../_leaf-ui/components", ["Button", "Disclosure", "IconButton", "PanelHeader"]));
  ok(hasNamedImports(source, "lucide-react", ["Plus", "Trash2"]));
  ok(hasPanelHeaderContract(source));
  ok(hasDisclosure(source, "Patch Control", "vb.patch-control.open"));
  ok(hasDisclosure(source, "Preset Manager", "vb.preset-manager.open"));
  ok(hasDisclosure(source, "Preset Bank", "vb.preset-bank.open"));
});

// Matrix 命令的等待状态必须绑定真实 Promise，错误使用 Toast 且单元格不可重复触发。
test("VB matrix uses toast feedback and promise-scoped pending state", () => {
  const source = parseSource("bundles/vb-matrix-control/src/dashboard/components/MatrixView.tsx");
  ok(hasNamedImports(source, "../_leaf-ui/components", ["ToastRegion", "useToast", "IconButton"]));
  ok(hasNamedImports(source, "lucide-react", ["RefreshCw"]));
  ok(hasToastBinding(source));
  ok(hasAuthenticatedCatchToastContract(source));
  ok(hasPromiseScopedPendingContract(source));
  ok(!hasWindowAlert(source));
  ok(hasJsxAttribute(source, "matrix-cell", "aria-busy"));
  ok(hasJsxAttribute(source, "matrix-cell", "disabled"));
});

// Patch 与预设操作保留原命令，同时用本地 Toast 和 Lucide 删除图标提供反馈。
test("VB patch and preset controls use local toast and Lucide affordances", () => {
  const patchStatus = parseSource("bundles/vb-matrix-control/src/dashboard/components/PatchStatus.tsx");
  const bankSlot = parseSource("bundles/vb-matrix-control/src/dashboard/components/BankSlot.tsx");
  ok(hasNamedImports(patchStatus, "../_leaf-ui/components", ["ToastRegion", "useToast"]));
  ok(hasToastBinding(patchStatus));
  ok(hasAuthenticatedCatchToastContract(patchStatus));
  ok(!hasWindowAlert(patchStatus));
  ok(hasNamedImports(bankSlot, "../_leaf-ui/components", ["IconButton"]));
  ok(hasNamedImports(bankSlot, "lucide-react", ["Trash2"]));
});

// 认证调用必须位于同一 Promise receiver 链中，Toast 也必须位于其 catch 回调中。
test("VB matrix promise and toast fixtures reject unrelated callbacks", () => {
  ok(
    !hasPromiseScopedPendingContract(
      matrixPromiseFixture(
        'Promise.resolve().finally(() => { sendAuthenticatedCommand("vb-matrix-control", "vb.updatePatch", patch); setPendingKeys((current) => { const next = current; next.delete(key); return next; }); });'
      )
    )
  );
  ok(
    !hasAuthenticatedCatchToastContract(
      toastFixture(
        'sendAuthenticatedCommand("vb-matrix-control", "vb.updatePatch", patch).catch((error) => console.error(error)); Promise.resolve().catch((error) => pushToast(String(error), "danger"));'
      )
    )
  );
  ok(
    !hasPromiseScopedPendingContract(
      matrixPromiseFixture(
        'sendAuthenticatedCommand("vb-matrix-control", "vb.updatePatch", patch).catch((error) => pushToast(String(error), "danger")); sendAuthenticatedCommand("vb-matrix-control", "vb.updatePatch", patch).finally(() => { setPendingKeys((current) => { const next = current; next.delete(key); return next; }); });'
      )
    )
  );
  ok(
    !hasAuthenticatedCatchToastContract(
      toastFixture(
        'sendAuthenticatedCommand("vb-matrix-control", "vb.updatePatch", patch).catch(() => { const unused = () => pushToast("x", "danger"); });'
      )
    )
  );
  ok(
    !hasPromiseScopedPendingContract(
      matrixPromiseFixture(
        'sendAuthenticatedCommand("vb-matrix-control", "vb.updatePatch", patch).catch((error) => pushToast(String(error), "danger")).finally(() => { setPendingKeys((current) => {}); new Set().delete(key); });'
      )
    )
  );
  ok(
    !hasPromiseScopedPendingContract(
      matrixPromiseFixture(
        'sendAuthenticatedCommand("vb-matrix-control", "vb.updatePatch", patch).catch((error) => pushToast(String(error), "danger")).finally(() => { setPendingKeys((current) => { const unused = () => { const next = new Set(current); next.delete(key); return next; }; }); });'
      )
    )
  );
  ok(
    !hasAuthenticatedCatchToastContract(
      toastFixture(
        'sendAuthenticatedCommand("vb-matrix-control", "vb.updatePatch", patch).catch(() => { const pushToast = () => {}; pushToast("x", "danger"); });'
      )
    )
  );
  ok(
    !hasPromiseScopedPendingContract(
      matrixPromiseFixture(
        'sendAuthenticatedCommand("vb-matrix-control", "vb.updatePatch", patch).catch((error) => pushToast(String(error), "danger")).finally(() => { const setPendingKeys = () => {}; setPendingKeys((current) => { const next = new Set(current); next.delete(key); return next; }); });'
      )
    )
  );
});

// Matrix 在窄面板中以固定点击尺寸和自身滚动区呈现，避免压缩整个页面。
test("VB matrix CSS keeps fixed cells inside an internal scroll viewport", () => {
  const css = fs.readFileSync(
    path.join(projectRoot, "bundles/vb-matrix-control/src/dashboard/vb-control.css"),
    "utf8"
  );
  const panel = cssDeclarations(css, ".matrix-panel");
  const scroll = cssDeclarations(css, ".matrix-scroll");
  const grid = cssDeclarations(css, ".matrix-grid");
  const cell = cssDeclarations(css, ".matrix-cell");
  const outputHeader = cssDeclarations(css, ".matrix-output-header");
  const inputHeader = cssDeclarations(css, ".matrix-input-header");
  ok(panel.get("min-width") === "0");
  ok(scroll.get("max-width") === "100%" && scroll.get("overflow") === "auto");
  ok(scroll.get("overscroll-behavior") === "contain");
  ok(grid.get("width") === "max-content" && grid.get("grid-auto-columns") === "30px");
  ok(cell.get("width") === "28px" && cell.get("height") === "28px" && cell.get("min-width") === "28px");
  ok(outputHeader.get("position") === "sticky" && outputHeader.get("top") === "0");
  ok(inputHeader.get("position") === "sticky" && inputHeader.get("left") === "0");
});

// CSS 解析必须忽略注释并精确匹配选择器，不能把前缀选择器当成目标规则。
test("VB matrix CSS fixture rejects comments and selector prefixes", () => {
  const misleadingCss = `
    /* .matrix-cell { width: 28px; height: 28px; } */
    .matrix-cellular { width: 28px; height: 28px; }
  `;
  const selectorListCss = ".matrix-cellular, .matrix-cell { width: 28px; }";
  ok(cssDeclarations(misleadingCss, ".matrix-cell").size === 0);
  ok(cssDeclarations(selectorListCss, ".matrix-cell").get("width") === "28px");
});

// 删除状态以 null 表示无待删除项，空字符串 ID 也必须在确认后传给原删除逻辑。
test("VB network removal confirmation preserves empty-string ids", () => {
  ok(
    hasNetworkRemovalConfirmationContract(
      parseSource("bundles/vb-matrix-control/src/dashboard/components/NetworkConfigList.tsx")
    )
  );
});

// 守卫必须直接保护带有原始待删除 ID 的删除调用，空分支或错误实参不能通过合同。
test("VB network removal confirmation AST fixture rejects incomplete deletion", () => {
  ok(
    !hasNetworkRemovalConfirmationContract(
      networkRemovalFixture("if (pendingRemovalId !== null) {}")
    )
  );
  ok(
    !hasNetworkRemovalConfirmationContract(
      networkRemovalFixture('if (pendingRemovalId !== null) handleRemove("other-id");')
    )
  );
});

// 聚焦验证自闭合应用组件可被边界识别，注释和空边界不能伪造通过。
test("panel error boundary AST fixture distinguishes real children", () => {
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
      renderArgumentFromFixture("root.render(<PanelErrorBoundary />);")
    )
  );
});
