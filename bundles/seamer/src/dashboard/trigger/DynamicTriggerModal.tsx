import React, { useMemo, useState } from "react";
import type { CapabilityDefinition } from "../../_leaf-core/integration/types";
import type {
  DynamicSeamerTrigger,
  SeamerIntegrations,
} from "../../types/seamer.types";
import { EditorDialogFrame } from "../components/EditorDialogFrame";
import CapabilityFields, {
  createDefaultParameters,
} from "./CapabilityFields";

interface DynamicTriggerModalProps {
  initialTrigger: DynamicSeamerTrigger;
  integrations: SeamerIntegrations;
  onSave: (trigger: DynamicSeamerTrigger) => void;
  onCancel: () => void;
}

const DynamicTriggerModal: React.FC<DynamicTriggerModalProps> = ({
  initialTrigger,
  integrations,
  onSave,
  onCancel,
}) => {
  const [trigger, setTrigger] = useState(initialTrigger);
  const integrationList = useMemo(() => Object.values(integrations), [integrations]);
  const conditionIntegration = integrations[trigger.condition.integrationId];
  const actionIntegration = integrations[trigger.action.integrationId];
  const conditionDefinition = conditionIntegration?.manifest.triggers.find(
    (definition) => definition.id === trigger.condition.capabilityId
  );
  const actionDefinition = actionIntegration?.manifest.actions.find(
    (definition) => definition.id === trigger.action.capabilityId
  );

  const selectCapability = (
    kind: "condition" | "action",
    integrationId: string,
    definition: CapabilityDefinition
  ) => {
    setTrigger((current) => ({
      ...current,
      [kind]: {
        integrationId,
        capabilityId: definition.id,
        parameters: createDefaultParameters(definition.parameters),
      },
    }));
  };

  const renderCapabilitySelector = (kind: "condition" | "action") => {
    const current = trigger[kind];
    const definitions =
      kind === "condition"
        ? integrations[current.integrationId]?.manifest.triggers ?? []
        : integrations[current.integrationId]?.manifest.actions ?? [];
    const definition =
      kind === "condition" ? conditionDefinition : actionDefinition;

    return (
      <div className="seamer-fields-grid">
        <label className="seamer-field">
          <span>{kind === "condition" ? "Condition source" : "Action target"}</span>
          <select
            value={current.integrationId}
            onChange={(event) => {
              const integration = integrations[event.target.value];
              const first =
                kind === "condition"
                  ? integration?.manifest.triggers[0]
                  : integration?.manifest.actions[0];
              if (first) selectCapability(kind, event.target.value, first);
            }}
          >
            {integrationList
              .filter((integration) =>
                kind === "condition"
                  ? integration.manifest.triggers.length > 0
                  : integration.manifest.actions.length > 0
              )
              .map((integration) => (
                <option key={integration.id} value={integration.id}>
                  {integration.label}
                  {integration.available ? "" : " (Unavailable)"}
                </option>
              ))}
          </select>
        </label>
        <label className="seamer-field">
          <span>{kind === "condition" ? "Trigger" : "Action"}</span>
          <select
            value={current.capabilityId}
            onChange={(event) => {
              const selected = definitions.find(
                (candidate) => candidate.id === event.target.value
              );
              if (selected) selectCapability(kind, current.integrationId, selected);
            }}
          >
            {definitions.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.displayName}
              </option>
            ))}
          </select>
        </label>
        {definition ? (
          <div className="seamer-fields-grid">
            <CapabilityFields
              schema={definition.parameters}
              values={current.parameters}
              onChange={(parameters) =>
                setTrigger((existing) => ({
                  ...existing,
                  [kind]: { ...existing[kind], parameters },
                }))
              }
            />
          </div>
        ) : (
          <p>This capability is unavailable. Install its adapter to edit it.</p>
        )}
      </div>
    );
  };

  return (
    <EditorDialogFrame
      title="Edit Trigger"
      onCancel={onCancel}
      onSave={() => onSave(trigger)}
      saveDisabled={!conditionDefinition || !actionDefinition}
    >
      <label className="seamer-field">
        <span>Name</span>
        <input
          value={trigger.name ?? ""}
          onChange={(event) =>
            setTrigger({ ...trigger, name: event.target.value })
          }
        />
      </label>
      <section className="seamer-editor-section">
        <h3>When</h3>
        {renderCapabilitySelector("condition")}
      </section>
      <section className="seamer-editor-section">
        <h3>Then</h3>
        {renderCapabilitySelector("action")}
      </section>
      <div className="seamer-inline-controls">
        <label className="seamer-field">
          <span>Delay (ms)</span>
          <input
            type="number"
            value={trigger.delay}
            onChange={(event) =>
              setTrigger({ ...trigger, delay: Number(event.target.value) })
            }
          />
        </label>
        <label className="seamer-toggle">
          <input
            type="checkbox"
            checked={trigger.enabled}
            onChange={(event) =>
              setTrigger({ ...trigger, enabled: event.target.checked })
            }
          />
          Enabled
        </label>
      </div>
    </EditorDialogFrame>
  );
};

export default DynamicTriggerModal;
