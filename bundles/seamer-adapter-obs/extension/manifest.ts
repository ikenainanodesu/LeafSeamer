import type { CapabilityManifest } from "../../../shared/integration/types";

const connectionId = {
  id: "connectionId",
  displayName: "Connection ID",
  type: "string" as const,
  required: true,
};

export const obsManifest: CapabilityManifest = {
  integrationId: "obs",
  displayName: "OBS Control",
  apiVersion: "1.0.0",
  triggers: [
    {
      id: "scene.changed",
      displayName: "Current scene changed",
      parameters: [connectionId, { id: "scene", displayName: "Scene", type: "string", required: true }],
    },
    {
      id: "streaming.changed",
      displayName: "Streaming state changed",
      parameters: [connectionId, { id: "isStreaming", displayName: "Streaming", type: "boolean", required: true }],
    },
  ],
  actions: [
    {
      id: "scene.set",
      displayName: "Set scene",
      parameters: [connectionId, { id: "scene", displayName: "Scene", type: "string", required: true }],
    },
    {
      id: "streaming.set",
      displayName: "Set streaming",
      parameters: [connectionId, { id: "isStreaming", displayName: "Streaming", type: "boolean", required: true }],
    },
  ],
};
