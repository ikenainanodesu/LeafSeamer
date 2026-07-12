import type { CapabilityManifest } from "../../../shared/integration/types";

const patchParameters = [
  { id: "connectionId", displayName: "Connection ID", type: "string" as const, required: true },
  { id: "inputDevice", displayName: "Input device", type: "string" as const, required: true },
  { id: "inputChannel", displayName: "Input channel", type: "number" as const, required: true, defaultValue: 1 },
  { id: "outputDevice", displayName: "Output device", type: "string" as const, required: true },
  { id: "outputChannel", displayName: "Output channel", type: "number" as const, required: true, defaultValue: 1 },
];

export const vbManifest: CapabilityManifest = {
  integrationId: "vb",
  displayName: "VB Matrix Control",
  apiVersion: "1.0.0",
  triggers: [
    {
      id: "patch.changed",
      displayName: "Patch state changed",
      parameters: [
        ...patchParameters,
        { id: "status", displayName: "Status", type: "enum", options: ["patched", "unpatched"], required: true },
      ],
    },
  ],
  actions: [
    {
      id: "patch.set",
      displayName: "Set patch state",
      parameters: [
        ...patchParameters,
        { id: "actionType", displayName: "Action", type: "enum", options: ["patch", "unpatch", "toggle"], required: true },
      ],
    },
    {
      id: "preset.load",
      displayName: "Load preset",
      parameters: [{ id: "presetId", displayName: "Preset ID", type: "string", required: true }],
    },
  ],
};
