import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { Button, ConfirmDialog, IconButton } from "../_leaf-ui/components";
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
  const [pendingTriggerId, setPendingTriggerId] = useState<string | null>(null);
  const triggerDeleteTriggerRef = useRef<HTMLButtonElement | null>(null);
  const addTriggerRef = useRef<HTMLSpanElement | null>(null);

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
    const replicant = nodecg.Replicant<AnySeamerTrigger[]>("seamerTriggers");
    replicant.value = (replicant.value || []).filter(
      (item: AnySeamerTrigger) => item.id !== id
    );
  };

  const addTrigger = () => {
    // 有动态 Manifest 时优先使用新合同，否则保留 legacy 编辑路径。
    setCurrentTrigger(createDynamicDraft(integrations) ?? createLegacyDraft());
  };

  const restoreTriggerDeleteFocus = useCallback(() => {
    requestAnimationFrame(() => {
      const trigger = triggerDeleteTriggerRef.current;
      if (trigger?.isConnected) {
        trigger.focus();
        return;
      }
      addTriggerRef.current
        ?.querySelector<HTMLButtonElement>("button")
        ?.focus();
    });
  }, []);

  return (
    <div className="seamer-trigger-page">
      <div className="seamer-trigger-toolbar">
        <span ref={addTriggerRef}>
          <Button tone="primary" onClick={addTrigger}>
            <Plus size={16} aria-hidden="true" />
            Add Trigger
          </Button>
        </span>
      </div>

      <main className="seamer-trigger-grid">
        {triggers.map((trigger) => (
          <article className="seamer-trigger" key={trigger.id}>
            <header className="seamer-trigger-header">
              <div className="seamer-trigger-title-row">
                <h2 title={trigger.name || "Trigger"}>
                  {trigger.name || "Trigger"}
                </h2>
                <label className="seamer-toggle">
                  <input
                    type="checkbox"
                    checked={trigger.enabled}
                    onChange={() =>
                      saveTrigger({ ...trigger, enabled: !trigger.enabled })
                    }
                  />
                  Enabled
                </label>
              </div>
              <div className="seamer-trigger-actions">
                <IconButton
                  label="Edit trigger"
                  icon={<Pencil size={16} aria-hidden="true" />}
                  onClick={() => setCurrentTrigger(trigger)}
                />
                <IconButton
                  label="Delete trigger"
                  tone="danger"
                  icon={<Trash2 size={16} aria-hidden="true" />}
                  onClick={(event) => {
                    triggerDeleteTriggerRef.current = event.currentTarget;
                    setPendingTriggerId(trigger.id);
                  }}
                />
              </div>
            </header>
            <div className="seamer-trigger-body">
              <div className="seamer-trigger-detail">
                <strong>If:</strong> {formatCondition(trigger)}
              </div>
              <div className="seamer-trigger-detail">
                <strong>Then:</strong> {formatAction(trigger)}
              </div>
              <div className="seamer-trigger-detail">Delay: {trigger.delay}ms</div>
            </div>
          </article>
        ))}
      </main>

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

      <ConfirmDialog
        open={pendingTriggerId !== null}
        title="Delete trigger"
        message="This trigger will be removed."
        confirmLabel="Delete"
        onCancel={() => {
          setPendingTriggerId(null);
          restoreTriggerDeleteFocus();
        }}
        onConfirm={() => {
          const triggerId = pendingTriggerId;
          triggerDeleteTriggerRef.current = null;
          setPendingTriggerId(null);
          if (triggerId !== null) {
            deleteTrigger(triggerId);
          }
          requestAnimationFrame(() =>
            addTriggerRef.current
              ?.querySelector<HTMLButtonElement>("button")
              ?.focus()
          );
        }}
      />
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
