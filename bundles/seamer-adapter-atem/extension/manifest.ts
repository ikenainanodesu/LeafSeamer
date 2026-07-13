import type { CapabilityManifest } from "../src/_leaf-core/integration/types";

const switcherIp = {
  id: "switcherIp",
  displayName: "Switcher IP",
  type: "string" as const,
  required: true,
};

export const atemManifest: CapabilityManifest = {
  integrationId: "atem",
  displayName: "ATEM Control",
  apiVersion: "1.0.0",
  triggers: [
    {
      id: "program.changed",
      displayName: "Program input changed",
      parameters: [switcherIp, { id: "source", displayName: "Source", type: "number", required: true }],
    },
  ],
  actions: [
    {
      id: "source.set",
      displayName: "Set source",
      parameters: [
        switcherIp,
        { id: "target", displayName: "Target", type: "enum", options: ["program", "preview", "aux"], required: true },
        { id: "source", displayName: "Source", type: "number", required: true },
        { id: "auxId", displayName: "Aux ID", type: "number", defaultValue: 0 },
      ],
    },
    {
      id: "macro.run",
      displayName: "Run macro",
      parameters: [switcherIp, { id: "macroIndex", displayName: "Macro index", type: "number", required: true }],
    },
  ],
};
