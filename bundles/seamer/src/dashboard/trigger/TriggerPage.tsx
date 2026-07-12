import React, { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import type {
  AnySeamerTrigger,
  AtemSwitcherInfo,
  DeviceInfo,
  DynamicSeamerTrigger,
  MixerState,
  OBSConnectionSettings,
  OBSState,
  SeamerIntegrations,
  SeamerTrigger,
  TriggerCondition,
  TriggerResultAction,
} from "../../types/seamer.types";
import { isDynamicSeamerTrigger } from "../../types/seamer.types";
import { createDefaultParameters } from "./CapabilityFields";
import DynamicTriggerModal from "./DynamicTriggerModal";
import EditTriggerModal from "./EditTriggerModal";

interface TriggerPageProps {
  mixerState: MixerState | null;
  obsConnections: OBSConnectionSettings[];
  obsStates: Record<string, OBSState>;
  vbDevices: DeviceInfo[];
  atemSwitchers: AtemSwitcherInfo[];
  integrations: SeamerIntegrations;
}

const createLegacyDraft = (): SeamerTrigger => ({
  id: uuidv4(),
  name: "New Trigger",
  delay: 0,
  enabled: true,
  condition: {
    module: "mixer",
    channelId: 1,
    property: "faderLevel",
    operator: "gt",
    value: -10,
  },
  action: {
    module: "mixer",
    channelId: 1,
    property: "isMuted",
    value: true,
  },
});

const createDynamicDraft = (
  integrations: SeamerIntegrations
): DynamicSeamerTrigger | null => {
  const values = Object.values(integrations);
  const conditionIntegration = values.find(
    (integration) => integration.manifest.triggers.length > 0
  );
  const actionIntegration = values.find(
    (integration) => integration.manifest.actions.length > 0
  );
  const condition = conditionIntegration?.manifest.triggers[0];
  const action = actionIntegration?.manifest.actions[0];

  if (!conditionIntegration || !actionIntegration || !condition || !action) {
    return null;
  }

  return {
    id: uuidv4(),
    name: "New Trigger",
    delay: 0,
    enabled: true,
    condition: {
      integrationId: conditionIntegration.id,
      capabilityId: condition.id,
      parameters: createDefaultParameters(condition.parameters),
    },
    action: {
      integrationId: actionIntegration.id,
      capabilityId: action.id,
      parameters: createDefaultParameters(action.parameters),
    },
  };
};

const TriggerPage: React.FC<TriggerPageProps> = ({
  mixerState,
  obsConnections,
  obsStates,
  vbDevices,
  atemSwitchers,
  integrations,
}) => {
  const [triggers, setTriggers] = useState<AnySeamerTrigger[]>([]);
  const [currentTrigger, setCurrentTrigger] = useState<AnySeamerTrigger | null>(
    null
  );

  useEffect(() => {
    const replicant = nodecg.Replicant<AnySeamerTrigger[]>("seamerTriggers");
    replicant.on("change", (value: AnySeamerTrigger[] | undefined) => {
      setTriggers(value || []);
    });
  }, []);

  const saveTrigger = (trigger: AnySeamerTrigger) => {
    const replicant = nodecg.Replicant<AnySeamerTrigger[]>("seamerTriggers");
    const current: AnySeamerTrigger[] = replicant.value || [];
    replicant.value = current.some(
      (item: AnySeamerTrigger) => item.id === trigger.id
    )
      ? current.map((item: AnySeamerTrigger) =>
          item.id === trigger.id ? trigger : item
        )
      : [...current, trigger];
    setCurrentTrigger(null);
  };

  const deleteTrigger = (id: string) => {
    if (!confirm("Delete this trigger?")) return;
    const replicant = nodecg.Replicant<AnySeamerTrigger[]>("seamerTriggers");
    replicant.value = (replicant.value || []).filter(
      (item: AnySeamerTrigger) => item.id !== id
    );
  };

  const addTrigger = () => {
    // 有动态 Manifest 时优先使用新合同，否则保留 legacy 编辑路径。
    setCurrentTrigger(createDynamicDraft(integrations) ?? createLegacyDraft());
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={addTrigger}>Add Trigger</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
        {triggers.map((trigger) => (
          <div key={trigger.id} style={{ background: "#222", padding: 15, borderRadius: 6, border: "1px solid #333" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>{trigger.name || "Trigger"}</h3>
              <div style={{ display: "flex", gap: 10 }}>
                <label><input type="checkbox" checked={trigger.enabled} onChange={() => saveTrigger({ ...trigger, enabled: !trigger.enabled })} /> Active</label>
                <button onClick={() => setCurrentTrigger(trigger)}>Edit</button>
                <button onClick={() => deleteTrigger(trigger.id)}>Delete</button>
              </div>
            </div>
            <div><strong>If:</strong> {formatCondition(trigger)}</div>
            <div><strong>Then:</strong> {formatAction(trigger)}</div>
            <div style={{ color: "#888" }}>Delay: {trigger.delay}ms</div>
          </div>
        ))}
      </div>

      {currentTrigger && isDynamicSeamerTrigger(currentTrigger) ? (
        <DynamicTriggerModal
          initialTrigger={currentTrigger}
          integrations={integrations}
          onSave={saveTrigger}
          onCancel={() => setCurrentTrigger(null)}
        />
      ) : currentTrigger ? (
        <EditTriggerModal
          initialTrigger={currentTrigger}
          onSave={saveTrigger}
          onCancel={() => setCurrentTrigger(null)}
          mixerState={mixerState}
          obsConnections={obsConnections}
          obsStates={obsStates}
          vbDevices={vbDevices}
          atemSwitchers={atemSwitchers}
          integrations={integrations}
        />
      ) : null}
    </div>
  );
};

const formatParameters = (parameters: Record<string, unknown>): string =>
  Object.entries(parameters)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(", ");

const formatCondition = (trigger: AnySeamerTrigger): string => {
  if (isDynamicSeamerTrigger(trigger)) {
    return `${trigger.condition.integrationId}.${trigger.condition.capabilityId} (${formatParameters(trigger.condition.parameters)})`;
  }
  return formatLegacyCondition(trigger.condition);
};

const formatAction = (trigger: AnySeamerTrigger): string => {
  if (isDynamicSeamerTrigger(trigger)) {
    return `${trigger.action.integrationId}.${trigger.action.capabilityId} (${formatParameters(trigger.action.parameters)})`;
  }
  return formatLegacyAction(trigger.action);
};

function formatLegacyCondition(condition: TriggerCondition): string {
  switch (condition.module) {
    case "mixer":
      return `Mixer CH${condition.channelId} ${condition.property} ${condition.operator} ${condition.value}`;
    case "atem":
      return `ATEM (${condition.switcherIp}) program == ${condition.value}`;
    case "obs":
      return `OBS (${condition.connectionId}) ${condition.property} == ${condition.value}`;
    case "vb":
      return `VB ${condition.inputDevice}[${condition.inputChannel}] -> ${condition.outputDevice}[${condition.outputChannel}] is ${condition.status}`;
  }
}

function formatLegacyAction(action: TriggerResultAction): string {
  switch (action.module) {
    case "mixer":
      return `Set Mixer CH${action.channelId} ${action.property} to ${action.value}`;
    case "atem":
      return `Set ATEM (${action.switcherIp}) ${action.target} to ${action.source}`;
    case "obs":
      return `Set OBS (${action.connectionId}) ${action.actionType} to ${action.value}`;
    case "vb":
      return `VB ${action.actionType} ${action.inputDevice}[${action.inputChannel}] -> ${action.outputDevice}[${action.outputChannel}]`;
  }
}

export default TriggerPage;
