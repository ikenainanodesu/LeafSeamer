import { IntegrationRegistry } from "../bundles/seamer/extension/integration-registry";
import type { CapabilityManifest } from "../shared/integration/types";
import { deepEqual, equal, rejects, test } from "./test-harness";

class MockReplicant<T> {
  value: T;

  constructor(defaultValue: T) {
    this.value = defaultValue;
  }
}

const createNodecg = () => {
  const replicants = new Map<string, MockReplicant<unknown>>();
  return {
    replicants,
    api: {
      Replicant: <T>(name: string, options: { defaultValue: T }) => {
        const replicant = new MockReplicant(options.defaultValue);
        replicants.set(name, replicant as MockReplicant<unknown>);
        return replicant;
      },
      log: {
        info: () => undefined,
        warn: () => undefined,
      },
    },
  };
};

const scheduleManifest: CapabilityManifest = {
  integrationId: "schedule",
  displayName: "Schedule Manager",
  apiVersion: "1.0.0",
  triggers: [
    {
      id: "item.due",
      displayName: "Item due",
      parameters: [
        { id: "itemId", displayName: "Item", type: "string", required: true },
      ],
    },
  ],
  actions: [
    {
      id: "item.activate",
      displayName: "Activate item",
      parameters: [
        { id: "itemId", displayName: "Item", type: "string", required: true },
      ],
    },
  ],
};

test("registers arbitrary capability manifests and publishes snapshots", () => {
  const nodecg = createNodecg();
  const registry = new IntegrationRegistry(nodecg.api as never);
  const unregister = registry.register({
    manifest: scheduleManifest,
    initialState: { dueItemId: null },
    evaluateTrigger: (_capabilityId, parameters, nextState, previousState) =>
      (nextState as { dueItemId: string | null }).dueItemId === parameters.itemId &&
      (previousState as { dueItemId: string | null }).dueItemId !== parameters.itemId,
    executeAction: async () => undefined,
  });

  const published = nodecg.replicants.get("seamerIntegrations")?.value as Record<
    string,
    unknown
  >;
  equal(Boolean(published.schedule), true);
  deepEqual(
    (published.schedule as { manifest: CapabilityManifest }).manifest,
    scheduleManifest
  );

  unregister();
  equal(Boolean((nodecg.replicants.get("seamerIntegrations")?.value as Record<string, unknown>).schedule), false);
});

test("delegates condition evaluation and action execution to providers", async () => {
  const nodecg = createNodecg();
  const registry = new IntegrationRegistry(nodecg.api as never);
  let executed = "";
  registry.register({
    manifest: scheduleManifest,
    initialState: { dueItemId: null },
    evaluateTrigger: (_capabilityId, parameters, nextState, previousState) =>
      (nextState as { dueItemId: string | null }).dueItemId === parameters.itemId &&
      (previousState as { dueItemId: string | null }).dueItemId !== parameters.itemId,
    executeAction: async (_capabilityId, parameters) => {
      executed = String(parameters.itemId);
    },
  });

  equal(
    registry.evaluateTrigger(
      "schedule",
      "item.due",
      { itemId: "item-1" },
      { dueItemId: "item-1" },
      { dueItemId: null }
    ),
    true
  );
  await registry.executeCapability("schedule", "item.activate", {
    itemId: "item-1",
  });
  equal(executed, "item-1");
});

test("rejects invalid manifests and unavailable providers", async () => {
  const nodecg = createNodecg();
  const registry = new IntegrationRegistry(nodecg.api as never);

  await rejects(async () => {
    registry.register({
      manifest: { ...scheduleManifest, apiVersion: "v1" },
      initialState: {},
      evaluateTrigger: () => false,
      executeAction: async () => undefined,
    });
  });
  await rejects(() =>
    registry.executeCapability("missing", "action", {})
  );
});
