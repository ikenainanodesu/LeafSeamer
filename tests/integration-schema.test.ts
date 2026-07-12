import {
  validateCapabilityManifest,
  validateParameterValues,
} from "../shared/integration/schema";
import type { CapabilityManifest } from "../shared/integration/types";
import { deepEqual, equal, test } from "./test-harness";

const manifest: CapabilityManifest = {
  integrationId: "test-device",
  displayName: "Test Device",
  apiVersion: "1.0.0",
  triggers: [
    {
      id: "state.changed",
      displayName: "State changed",
      parameters: [
        { id: "enabled", displayName: "Enabled", type: "boolean", required: true },
        { id: "mode", displayName: "Mode", type: "enum", options: ["a", "b"], required: true },
      ],
    },
  ],
  actions: [
    {
      id: "set.level",
      displayName: "Set level",
      parameters: [
        { id: "level", displayName: "Level", type: "number", required: true },
        { id: "label", displayName: "Label", type: "string" },
      ],
    },
  ],
};

test("accepts a valid capability manifest", () => {
  deepEqual(validateCapabilityManifest(manifest), []);
});

test("rejects invalid versions and duplicate capability ids", () => {
  const invalid: CapabilityManifest = {
    ...manifest,
    apiVersion: "v1",
    actions: [manifest.actions[0], manifest.actions[0]],
  };

  const errors = validateCapabilityManifest(invalid);
  equal(errors.some((error) => error.includes("apiVersion")), true);
  equal(errors.some((error) => error.includes("duplicate")), true);
});

test("validates required and typed parameter values", () => {
  const schema = manifest.triggers[0].parameters;
  deepEqual(validateParameterValues(schema, { enabled: true, mode: "a" }), []);

  const errors = validateParameterValues(schema, { enabled: "yes", mode: "c" });
  equal(errors.some((error) => error.includes("enabled")), true);
  equal(errors.some((error) => error.includes("mode")), true);
});

test("accepts optional string parameters when omitted", () => {
  const schema = manifest.actions[0].parameters;
  deepEqual(validateParameterValues(schema, { level: 3 }), []);
});
