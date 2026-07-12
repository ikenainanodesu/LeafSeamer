import React from "react";
import type { CapabilityParameter } from "../../../../../shared/integration/types";

export const createDefaultParameters = (
  schema: CapabilityParameter[]
): Record<string, unknown> =>
  Object.fromEntries(
    schema.map((parameter) => {
      if (parameter.defaultValue !== undefined) {
        return [parameter.id, parameter.defaultValue];
      }
      switch (parameter.type) {
        case "number":
          return [parameter.id, 0];
        case "boolean":
          return [parameter.id, false];
        case "enum":
          return [parameter.id, parameter.options?.[0] ?? ""];
        case "string":
          return [parameter.id, ""];
      }
    })
  );

export const coerceParameterValue = (
  schema: CapabilityParameter,
  value: string
): string | number | boolean => {
  switch (schema.type) {
    case "number":
      return Number(value);
    case "boolean":
      return value === "true";
    case "string":
    case "enum":
      return value;
  }
};

interface CapabilityFieldsProps {
  schema: CapabilityParameter[];
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
}

const CapabilityFields: React.FC<CapabilityFieldsProps> = ({
  schema,
  values,
  onChange,
}) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
    {schema.map((parameter) => {
      const update = (value: string) =>
        onChange({
          ...values,
          [parameter.id]: coerceParameterValue(parameter, value),
        });

      return (
        <label key={parameter.id} style={{ display: "grid", gap: 5 }}>
          <span>{parameter.displayName}</span>
          {parameter.type === "boolean" ? (
            <select
              value={String(Boolean(values[parameter.id]))}
              onChange={(event) => update(event.target.value)}
            >
              <option value="true">True</option>
              <option value="false">False</option>
            </select>
          ) : parameter.type === "enum" ? (
            <select
              value={String(values[parameter.id] ?? "")}
              onChange={(event) => update(event.target.value)}
            >
              {(parameter.options ?? []).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={parameter.type === "number" ? "number" : "text"}
              value={String(values[parameter.id] ?? "")}
              onChange={(event) => update(event.target.value)}
              required={parameter.required}
            />
          )}
        </label>
      );
    })}
  </div>
);

export default CapabilityFields;
