import type { CapabilityManifest } from "../../../shared/integration/types";

const commonFilters = [
  { id: "sourceId", displayName: "Source ID", type: "string" as const },
  { id: "itemId", displayName: "Item ID", type: "string" as const },
];

export const scheduleManifest: CapabilityManifest = {
  integrationId: "schedule",
  displayName: "Schedule Manager",
  apiVersion: "1.0.0",
  triggers: [
    {
      id: "item.due",
      displayName: "Schedule item due",
      parameters: commonFilters,
    },
    {
      id: "field.changed",
      displayName: "Schedule field changed",
      parameters: [
        ...commonFilters,
        { id: "field", displayName: "Field", type: "string", required: true },
        { id: "from", displayName: "From", type: "string" },
        { id: "to", displayName: "To", type: "string" },
      ],
    },
  ],
  actions: [],
};
