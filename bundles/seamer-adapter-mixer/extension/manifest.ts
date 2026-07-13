import type { CapabilityManifest } from "../src/_leaf-core/integration/types";

const channelId = {
  id: "channelId",
  displayName: "Channel",
  type: "number" as const,
  required: true,
  defaultValue: 1,
};

export const mixerManifest: CapabilityManifest = {
  integrationId: "mixer",
  displayName: "Mixer Control",
  apiVersion: "1.0.0",
  triggers: [
    {
      id: "channel.fader_changed",
      displayName: "Channel fader crossed value",
      parameters: [
        channelId,
        { id: "operator", displayName: "Operator", type: "enum", options: ["eq", "gt", "lt"], required: true },
        { id: "value", displayName: "Value", type: "number", required: true },
      ],
    },
    {
      id: "channel.mute_changed",
      displayName: "Channel mute changed",
      parameters: [
        channelId,
        { id: "value", displayName: "Muted", type: "boolean", required: true },
      ],
    },
  ],
  actions: [
    {
      id: "channel.set_fader",
      displayName: "Set channel fader",
      parameters: [channelId, { id: "level", displayName: "Level", type: "number", required: true }],
    },
    {
      id: "channel.set_mute",
      displayName: "Set channel mute",
      parameters: [channelId, { id: "isMuted", displayName: "Muted", type: "boolean", required: true }],
    },
  ],
};
