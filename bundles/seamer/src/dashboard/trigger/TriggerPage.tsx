import React, { useEffect, useState } from "react";
import { SeamerTrigger } from "../../types/seamer.types";
import { MixerState } from "../../../../../shared/types/mixer.types";
import {
  OBSConnectionSettings,
  OBSState,
} from "../../../../../shared/types/obs.types";
import {
  AtemSwitcherInfo,
  AtemState,
} from "../../../../../shared/types/atem.types";
import { DeviceInfo } from "../../../../vb-matrix-control/src/types"; // Adjust path if needed or use shared if moved
import EditTriggerModal from "./EditTriggerModal";
import { v4 as uuidv4 } from "uuid";

interface TriggerPageProps {
  mixerState: MixerState | null;
  obsConnections: OBSConnectionSettings[];
  obsStates: Record<string, OBSState>;
  vbDevices: DeviceInfo[];
  atemSwitchers: AtemSwitcherInfo[];
}

const TriggerPage: React.FC<TriggerPageProps> = ({
  mixerState,
  obsConnections,
  obsStates,
  vbDevices,
  atemSwitchers,
}) => {
  const [triggers, setTriggers] = useState<SeamerTrigger[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTrigger, setCurrentTrigger] = useState<SeamerTrigger | null>(
    null
  );

  useEffect(() => {
    const rep = nodecg.Replicant<SeamerTrigger[]>("seamerTriggers");
    rep.on("change", (newVal) => {
      setTriggers(newVal || []);
    });
  }, []);

  const saveTrigger = (trigger: SeamerTrigger) => {
    const rep = nodecg.Replicant("seamerTriggers");
    const current = rep.value || [];
    const exists = current.some((t: SeamerTrigger) => t.id === trigger.id);

    if (exists) {
      rep.value = current.map((t: SeamerTrigger) =>
        t.id === trigger.id ? trigger : t
      );
    } else {
      rep.value = [...current, trigger];
    }

    setIsEditing(false);
    setCurrentTrigger(null);
  };

  const deleteTrigger = (id: string) => {
    if (confirm("Delete this trigger?")) {
      const rep = nodecg.Replicant("seamerTriggers");
      rep.value = (rep.value || []).filter((t: SeamerTrigger) => t.id !== id);
    }
  };

  const toggleTrigger = (trigger: SeamerTrigger) => {
    saveTrigger({ ...trigger, enabled: !trigger.enabled });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => {
            // Default new trigger
            setCurrentTrigger({
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
            setIsEditing(true);
          }}
          style={{
            padding: "10px 20px",
            fontSize: "1.1em",
            cursor: "pointer",
            background: "#444",
            color: "#fff",
            border: "none",
            borderRadius: 4,
          }}
        >
          + Add Trigger
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 20,
        }}
      >
        {triggers.map((trigger) => (
          <div
            key={trigger.id}
            style={{
              background: "#222",
              padding: 15,
              borderRadius: 8,
              border: "1px solid #333",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <h3 style={{ margin: 0 }}>{trigger.name || "Trigger"}</h3>
              <div style={{ display: "flex", gap: 10 }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: "0.8em",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={trigger.enabled}
                    onChange={() => toggleTrigger(trigger)}
                  />
                  Active
                </label>
                <button
                  onClick={() => {
                    setCurrentTrigger(trigger);
                    setIsEditing(true);
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#aaa",
                    cursor: "pointer",
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteTrigger(trigger.id)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "red",
                    cursor: "pointer",
                  }}
                >
                  X
                </button>
              </div>
            </div>

            <div style={{ fontSize: "0.9em", color: "#ccc", marginBottom: 5 }}>
              <strong>If:</strong> {formatCondition(trigger.condition)}
            </div>
            <div style={{ fontSize: "0.9em", color: "#ccc", marginBottom: 5 }}>
              <strong>Then:</strong> {formatAction(trigger.action)}
            </div>
            <div style={{ fontSize: "0.8em", color: "#888" }}>
              Delay: {trigger.delay}ms
            </div>
          </div>
        ))}
      </div>

      {isEditing && currentTrigger && (
        <EditTriggerModal
          initialTrigger={currentTrigger}
          onSave={saveTrigger}
          onCancel={() => {
            setIsEditing(false);
            setCurrentTrigger(null);
          }}
          mixerState={mixerState}
          obsConnections={obsConnections}
          obsStates={obsStates}
          vbDevices={vbDevices}
          atemSwitchers={atemSwitchers}
        />
      )}
    </div>
  );
};

// Helpers to format display string
import {
  TriggerCondition,
  TriggerResultAction,
} from "../../types/seamer.types";

function formatCondition(c: TriggerCondition): string {
  switch (c.module) {
    case "mixer":
      return `Mixer CH${c.channelId} ${c.property === "faderLevel" ? "Fader" : "Mute"} ${c.operator} ${c.value}`;
    case "atem":
      return `ATEM (${c.switcherIp}) PGM == Source ${c.value}`;
    case "obs":
      return `OBS (${c.connectionId}) ${c.property} == ${c.value}`;
    case "vb":
      return `VB ${c.inputDevice}[${c.inputChannel}] -> ${c.outputDevice}[${c.outputChannel}] is ${c.status}`;
    default:
      return "Unknown";
  }
}

function formatAction(a: TriggerResultAction): string {
  switch (a.module) {
    case "mixer":
      return `Set Mixer CH${a.channelId} ${a.property === "faderLevel" ? "Fader" : "Mute"} to ${a.value}`;
    case "atem":
      return `Set ATEM (${a.switcherIp}) ${a.target} to ${a.source}`;
    case "obs":
      return `Set OBS (${a.connectionId}) ${a.actionType} to ${a.value}`;
    case "vb":
      return `VB ${a.actionType} ${a.inputDevice}[${a.inputChannel}] -> ${a.outputDevice}[${a.outputChannel}]`;
    default:
      return "Unknown";
  }
}

export default TriggerPage;
