import {
  coerceParameterValue,
  createDefaultParameters,
} from "../bundles/seamer/src/dashboard/trigger/CapabilityFields";
import type { CapabilityParameter } from "../shared/integration/types";
import { deepEqual, equal, test } from "./test-harness";

const parameters: CapabilityParameter[] = [
  { id: "name", displayName: "Name", type: "string", required: true },
  { id: "level", displayName: "Level", type: "number", defaultValue: 2 },
  { id: "enabled", displayName: "Enabled", type: "boolean" },
  {
    id: "mode",
    displayName: "Mode",
    type: "enum",
    options: ["manual", "auto"],
  },
];

test("creates stable defaults for capability parameters", () => {
  deepEqual(createDefaultParameters(parameters), {
    name: "",
    level: 2,
    enabled: false,
    mode: "manual",
  });
});

test("coerces browser values using parameter type", () => {
  equal(coerceParameterValue(parameters[0], "scene"), "scene");
  equal(coerceParameterValue(parameters[1], "3.5"), 3.5);
  equal(coerceParameterValue(parameters[2], "true"), true);
  equal(coerceParameterValue(parameters[3], "auto"), "auto");
});

test("keeps unknown persisted values outside default generation", () => {
  const persisted = { ...createDefaultParameters(parameters), legacy: "keep" };
  equal(persisted.legacy, "keep");
});
