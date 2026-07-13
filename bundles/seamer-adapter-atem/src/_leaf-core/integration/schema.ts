// 此文件由 scripts/sync-bundle-core.ts 生成，请勿手工修改。
import type {
  CapabilityDefinition,
  CapabilityManifest,
  CapabilityParameter,
} from "./types";

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

const findDuplicates = (values: string[]): string[] =>
  values.filter((value, index) => values.indexOf(value) !== index);

const validateDefinition = (
  kind: "trigger" | "action",
  definition: CapabilityDefinition
): string[] => {
  const errors: string[] = [];

  if (!definition.id.trim()) {
    errors.push(`${kind} id is required`);
  }
  if (!definition.displayName.trim()) {
    errors.push(`${kind} ${definition.id} displayName is required`);
  }

  const duplicateParameters = findDuplicates(
    definition.parameters.map((parameter) => parameter.id)
  );
  for (const parameterId of new Set(duplicateParameters)) {
    errors.push(`${kind} ${definition.id} has duplicate parameter ${parameterId}`);
  }

  for (const parameter of definition.parameters) {
    if (!parameter.id.trim() || !parameter.displayName.trim()) {
      errors.push(`${kind} ${definition.id} has an invalid parameter`);
    }
    if (
      parameter.type === "enum" &&
      (!parameter.options || parameter.options.length === 0)
    ) {
      errors.push(
        `${kind} ${definition.id} enum ${parameter.id} requires options`
      );
    }
  }

  return errors;
};

export const validateCapabilityManifest = (
  manifest: CapabilityManifest
): string[] => {
  const errors: string[] = [];

  if (!manifest.integrationId.trim()) {
    errors.push("integrationId is required");
  }
  if (!manifest.displayName.trim()) {
    errors.push("displayName is required");
  }
  if (!VERSION_PATTERN.test(manifest.apiVersion)) {
    errors.push("apiVersion must use semantic version format");
  }

  for (const [kind, definitions] of [
    ["trigger", manifest.triggers],
    ["action", manifest.actions],
  ] as const) {
    const duplicateIds = findDuplicates(
      definitions.map((definition) => definition.id)
    );
    for (const duplicateId of new Set(duplicateIds)) {
      errors.push(`${kind} capability has duplicate id ${duplicateId}`);
    }
    for (const definition of definitions) {
      errors.push(...validateDefinition(kind, definition));
    }
  }

  return errors;
};

const matchesType = (
  schema: CapabilityParameter,
  value: unknown
): boolean => {
  switch (schema.type) {
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "boolean":
      return typeof value === "boolean";
    case "enum":
      return typeof value === "string" && Boolean(schema.options?.includes(value));
  }
};

export const validateParameterValues = (
  schema: CapabilityParameter[],
  values: Record<string, unknown>
): string[] => {
  const errors: string[] = [];
  const schemaIds = new Set(schema.map((parameter) => parameter.id));

  for (const parameter of schema) {
    const value = values[parameter.id];
    if (value === undefined || value === null || value === "") {
      if (parameter.required) {
        errors.push(`${parameter.id} is required`);
      }
      continue;
    }

    if (!matchesType(parameter, value)) {
      errors.push(`${parameter.id} has invalid ${parameter.type} value`);
    }
  }

  for (const key of Object.keys(values)) {
    if (!schemaIds.has(key)) {
      errors.push(`${key} is not allowed`);
    }
  }

  return errors;
};
