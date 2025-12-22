import React, { useState, useEffect } from "react";
import {
  SeamerTrigger,
  TriggerCondition,
  TriggerResultAction,
  TriggerModule,
} from "../../types/seamer.types";
import { MixerState } from "../../../../../shared/types/mixer.types";
import {
  OBSConnectionSettings,
  OBSState,
} from "../../../../../shared/types/obs.types";
import {
  AtemSwitcherInfo,
  AtemState,
} from "../../../../../shared/types/atem.types";
import { DeviceInfo } from "../../../../vb-matrix-control/src/types";

interface EditTriggerModalProps {
  initialTrigger: SeamerTrigger;
  onSave: (trigger: SeamerTrigger) => void;
  onCancel: () => void;
  mixerState: MixerState | null;
  obsConnections: OBSConnectionSettings[];
  obsStates: Record<string, OBSState>;
  vbDevices: DeviceInfo[];
  atemSwitchers: AtemSwitcherInfo[];
}

const EditTriggerModal: React.FC<EditTriggerModalProps> = ({
  initialTrigger,
  onSave,
  onCancel,
  mixerState,
  obsConnections,
  obsStates,
  vbDevices,
  atemSwitchers,
}) => {
  const [name, setName] = useState(initialTrigger.name || "");
  const [delay, setDelay] = useState(initialTrigger.delay);
  const [enabled, setEnabled] = useState(initialTrigger.enabled);
  const [condition, setCondition] = useState<TriggerCondition>(
    initialTrigger.condition
  );
  const [action, setAction] = useState<TriggerResultAction>(
    initialTrigger.action
  );

  // Helper for rendering Module Select
  const renderModuleSelect = (
    value: TriggerModule,
    onChange: (m: TriggerModule) => void,
    label: string
  ) => (
    <div style={{ marginBottom: 10 }}>
      <label style={{ marginRight: 10, fontWeight: "bold" }}>{label}:</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as TriggerModule)}
        style={{ padding: 5 }}
      >
        <option value="mixer">Mixer Control</option>
        <option value="atem">ATEM Control</option>
        <option value="obs">OBS Control</option>
        <option value="vb">VB Control</option>
      </select>
    </div>
  );

  // --- Condition Form ---
  const handleConditionModuleChange = (module: TriggerModule) => {
    // strict defaults when switching
    switch (module) {
      case "mixer":
        setCondition({
          module: "mixer",
          channelId: 1,
          property: "faderLevel",
          operator: "gt",
          value: -10,
        });
        break;
      case "atem":
        // Default to first switcher if available
        setCondition({
          module: "atem",
          switcherIp: atemSwitchers[0]?.ip || "",
          property: "programInput",
          value: 1,
        });
        break;
      case "obs":
        setCondition({
          module: "obs",
          connectionId: obsConnections[0]?.id || "",
          property: "currentScene",
          value: "",
        });
        break;
      case "vb":
        setCondition({
          module: "vb",
          connectionId: "default",
          inputDevice: "",
          inputChannel: 1,
          outputDevice: "",
          outputChannel: 1,
          status: "patched",
        });
        break;
    }
  };

  const renderConditionForm = () => {
    switch (condition.module) {
      case "mixer":
        return (
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
          >
            <div>
              <label>Channel:</label>
              <select
                value={condition.channelId}
                onChange={(e) =>
                  setCondition({
                    ...condition,
                    channelId: Number(e.target.value),
                  })
                }
                style={{ width: "100%" }}
              >
                {mixerState?.channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Property:</label>
              <select
                value={condition.property}
                onChange={(e) =>
                  setCondition({
                    ...condition,
                    property: e.target.value as any,
                  })
                }
                style={{ width: "100%" }}
              >
                <option value="faderLevel">Fader Level</option>
                <option value="isMuted">On/Off Status</option>
              </select>
            </div>
            {condition.property === "faderLevel" && (
              <>
                <div>
                  <label>Operator:</label>
                  <select
                    value={condition.operator}
                    onChange={(e) =>
                      setCondition({
                        ...condition,
                        operator: e.target.value as any,
                      })
                    }
                    style={{ width: "100%" }}
                  >
                    <option value="gt">Greater Than</option>
                    <option value="lt">Less Than</option>
                    <option value="eq">Equal</option>
                  </select>
                </div>
                <div>
                  <label>Value (dB):</label>
                  <input
                    type="number"
                    value={Number(condition.value)}
                    onChange={(e) =>
                      setCondition({
                        ...condition,
                        value: Number(e.target.value),
                      })
                    }
                    style={{ width: "100%" }}
                  />
                </div>
              </>
            )}
            {condition.property === "isMuted" && (
              <div>
                <label>State:</label>
                <select
                  value={String(condition.value)}
                  onChange={(e) =>
                    setCondition({
                      ...condition,
                      value: e.target.value === "true",
                    })
                  }
                  style={{ width: "100%" }}
                >
                  <option value="false">ON (Unmuted)</option>
                  <option value="true">OFF (Muted)</option>
                </select>
              </div>
            )}
          </div>
        );
      case "atem":
        return (
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
          >
            <div>
              <label>Switcher IP:</label>
              <select
                value={condition.switcherIp}
                onChange={(e) =>
                  setCondition({ ...condition, switcherIp: e.target.value })
                }
                style={{ width: "100%" }}
              >
                {atemSwitchers.map((s) => (
                  <option key={s.ip} value={s.ip}>
                    {s.ip}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>On PGM Source:</label>
              <input
                type="number"
                value={condition.value}
                onChange={(e) =>
                  setCondition({ ...condition, value: Number(e.target.value) })
                }
                placeholder="Source ID"
                style={{ width: "100%" }}
              />
            </div>
          </div>
        );
      case "obs":
        return (
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
          >
            <div>
              <label>Connection:</label>
              <select
                value={condition.connectionId}
                onChange={(e) =>
                  setCondition({ ...condition, connectionId: e.target.value })
                }
                style={{ width: "100%" }}
              >
                {obsConnections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Trigger On:</label>
              <select
                value={condition.property}
                onChange={(e) =>
                  setCondition({
                    ...condition,
                    property: e.target.value as any,
                    value: e.target.value === "isStreaming" ? false : "",
                  })
                }
                style={{ width: "100%" }}
              >
                <option value="currentScene">Current Scene</option>
                <option value="isStreaming">Streaming State</option>
              </select>
            </div>
            {condition.property === "currentScene" && (
              <div style={{ gridColumn: "span 2" }}>
                <label>Scene Name:</label>
                <select
                  value={String(condition.value)}
                  onChange={(e) =>
                    setCondition({ ...condition, value: e.target.value })
                  }
                  style={{ width: "100%" }}
                >
                  <option value="">Select Scene...</option>
                  {obsStates[condition.connectionId]?.scenes?.map((s: any) => (
                    <option key={s.name} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {condition.property === "isStreaming" && (
              <div>
                <label>State:</label>
                <select
                  value={String(condition.value)}
                  onChange={(e) =>
                    setCondition({
                      ...condition,
                      value: e.target.value === "true",
                    })
                  }
                  style={{ width: "100%" }}
                >
                  <option value="true">Streaming</option>
                  <option value="false">Not Streaming</option>
                </select>
              </div>
            )}
          </div>
        );
      case "vb":
        return (
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
          >
            <div>
              <label>Input Device:</label>
              <select
                value={condition.inputDevice}
                onChange={(e) =>
                  setCondition({ ...condition, inputDevice: e.target.value })
                }
                style={{ width: "100%" }}
              >
                <option value="">Select...</option>
                {vbDevices
                  .filter((d) => d.outputs > 0)
                  .map((d) => (
                    <option key={d.suid} value={d.suid}>
                      {d.name}
                    </option>
                  ))}
                {/* Note: VB Inputs are outputs of device? Wait, Matrix Input is Device Output (e.g. Mic) or Device Input? 
                                 VB-Matrix: Point(Input, Output).
                                 Input is "strip" or "input device"? 
                                 Usually Source (Input) -> Destination (Output).
                                 DeviceInfo has .inputs and .outputs.
                                 Assume InputDevice is source.
                             */}
              </select>
            </div>
            <div>
              <label>Input CH:</label>
              <input
                type="number"
                min={1}
                value={condition.inputChannel}
                onChange={(e) =>
                  setCondition({
                    ...condition,
                    inputChannel: Number(e.target.value),
                  })
                }
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label>Output Device:</label>
              <select
                value={condition.outputDevice}
                onChange={(e) =>
                  setCondition({ ...condition, outputDevice: e.target.value })
                }
                style={{ width: "100%" }}
              >
                <option value="">Select...</option>
                {vbDevices
                  .filter((d) => d.inputs > 0)
                  .map((d) => (
                    <option key={d.suid} value={d.suid}>
                      {d.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label>Output CH:</label>
              <input
                type="number"
                min={1}
                value={condition.outputChannel}
                onChange={(e) =>
                  setCondition({
                    ...condition,
                    outputChannel: Number(e.target.value),
                  })
                }
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label>Status:</label>
              <select
                value={condition.status}
                onChange={(e) =>
                  setCondition({ ...condition, status: e.target.value as any })
                }
                style={{ width: "100%" }}
              >
                <option value="patched">Patched</option>
                <option value="unpatched">Unpatched</option>
              </select>
            </div>
            <div>
              {/* Connection ID selection? Usually VB has only one or few. Default 'default'? */}
              <label>Connection:</label>
              <input
                value={condition.connectionId}
                onChange={(e) =>
                  setCondition({ ...condition, connectionId: e.target.value })
                }
                style={{ width: "100%" }}
                placeholder="Connection ID"
              />
            </div>
          </div>
        );
    }
  };

  // --- Action Form --- (Similar structure)
  const handleActionModuleChange = (module: TriggerModule) => {
    switch (module) {
      case "mixer":
        setAction({
          module: "mixer",
          channelId: 1,
          property: "faderLevel",
          value: -10,
        });
        break;
      case "atem":
        setAction({
          module: "atem",
          switcherIp: atemSwitchers[0]?.ip || "",
          target: "preview",
          source: 1,
        });
        break;
      case "obs":
        setAction({
          module: "obs",
          connectionId: obsConnections[0]?.id || "",
          actionType: "setScene",
          value: "",
        });
        break;
      case "vb":
        setAction({
          module: "vb",
          connectionId: "default",
          inputDevice: "",
          inputChannel: 1,
          outputDevice: "",
          outputChannel: 1,
          actionType: "toggle",
        });
        break;
    }
  };

  const renderActionForm = () => {
    switch (action.module) {
      case "mixer":
        return (
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
          >
            <div>
              <label>Channel:</label>
              <select
                value={action.channelId}
                onChange={(e) =>
                  setAction({ ...action, channelId: Number(e.target.value) })
                }
                style={{ width: "100%" }}
              >
                {mixerState?.channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Set:</label>
              <select
                value={action.property}
                onChange={(e) =>
                  setAction({ ...action, property: e.target.value as any })
                }
                style={{ width: "100%" }}
              >
                <option value="faderLevel">Fader Level</option>
                <option value="isMuted">On/Off (Mute)</option>
              </select>
            </div>
            <div>
              <label>Value:</label>
              {action.property === "faderLevel" ? (
                <input
                  type="number"
                  value={Number(action.value)}
                  onChange={(e) =>
                    setAction({ ...action, value: Number(e.target.value) })
                  }
                  style={{ width: "100%" }}
                />
              ) : (
                <select
                  value={String(action.value)}
                  onChange={(e) =>
                    setAction({ ...action, value: e.target.value === "true" })
                  }
                  style={{ width: "100%" }}
                >
                  <option value="false">ON (Unmuted)</option>
                  <option value="true">OFF (Muted)</option>
                </select>
              )}
            </div>
          </div>
        );
      case "atem":
        return (
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
          >
            <div>
              <label>IP:</label>
              <select
                value={action.switcherIp}
                onChange={(e) =>
                  setAction({ ...action, switcherIp: e.target.value })
                }
                style={{ width: "100%" }}
              >
                {atemSwitchers.map((s) => (
                  <option key={s.ip} value={s.ip}>
                    {s.ip}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Target:</label>
              <select
                value={action.target}
                onChange={(e) =>
                  setAction({ ...action, target: e.target.value as any })
                }
                style={{ width: "100%" }}
              >
                <option value="preview">Preview</option>
                <option value="program">Program</option>
                <option value="aux">Aux / Output</option>
              </select>
            </div>
            {action.target === "aux" && (
              <div>
                <label>Aux ID:</label>
                <input
                  type="number"
                  value={action.auxId || 0}
                  onChange={(e) =>
                    setAction({ ...action, auxId: Number(e.target.value) })
                  }
                  style={{ width: "100%" }}
                />
              </div>
            )}
            <div>
              <label>Source ID:</label>
              <input
                type="number"
                value={action.source}
                onChange={(e) =>
                  setAction({ ...action, source: Number(e.target.value) })
                }
                style={{ width: "100%" }}
              />
            </div>
          </div>
        );
      case "obs":
        return (
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
          >
            <div>
              <label>Connection:</label>
              <select
                value={action.connectionId}
                onChange={(e) =>
                  setAction({ ...action, connectionId: e.target.value })
                }
                style={{ width: "100%" }}
              >
                {obsConnections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Action:</label>
              <select
                value={action.actionType}
                onChange={(e) =>
                  setAction({
                    ...action,
                    actionType: e.target.value as any,
                    value: e.target.value === "setStreaming" ? true : "",
                  })
                }
                style={{ width: "100%" }}
              >
                <option value="setScene">Set Scene</option>
                <option value="setStreaming">Set Streaming</option>
              </select>
            </div>
            {action.actionType === "setScene" && (
              <div style={{ gridColumn: "span 2" }}>
                <label>Scene:</label>
                <select
                  value={String(action.value)}
                  onChange={(e) =>
                    setAction({ ...action, value: e.target.value })
                  }
                  style={{ width: "100%" }}
                >
                  <option value="">Select...</option>
                  {obsStates[action.connectionId]?.scenes?.map((s: any) => (
                    <option key={s.name} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {action.actionType === "setStreaming" && (
              <div>
                <label>State:</label>
                <select
                  value={String(action.value)}
                  onChange={(e) =>
                    setAction({ ...action, value: e.target.value === "true" })
                  }
                  style={{ width: "100%" }}
                >
                  <option value="true">Start Streaming</option>
                  <option value="false">Stop Streaming</option>
                </select>
              </div>
            )}
          </div>
        );
      case "vb":
        return (
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
          >
            <div>
              <label>Connection:</label>
              <input
                value={action.connectionId}
                onChange={(e) =>
                  setAction({ ...action, connectionId: e.target.value })
                }
                style={{ width: "100%" }}
                placeholder="ID"
              />
            </div>
            <div>
              <label>In Device:</label>
              <select
                value={action.inputDevice}
                onChange={(e) =>
                  setAction({ ...action, inputDevice: e.target.value })
                }
                style={{ width: "100%" }}
              >
                <option value="">Select...</option>
                {vbDevices
                  .filter((d) => d.outputs > 0)
                  .map((d) => (
                    <option key={d.suid} value={d.suid}>
                      {d.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label>In CH:</label>
              <input
                type="number"
                min={1}
                value={action.inputChannel}
                onChange={(e) =>
                  setAction({ ...action, inputChannel: Number(e.target.value) })
                }
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label>Out Device:</label>
              <select
                value={action.outputDevice}
                onChange={(e) =>
                  setAction({ ...action, outputDevice: e.target.value })
                }
                style={{ width: "100%" }}
              >
                <option value="">Select...</option>
                {vbDevices
                  .filter((d) => d.inputs > 0)
                  .map((d) => (
                    <option key={d.suid} value={d.suid}>
                      {d.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label>Out CH:</label>
              <input
                type="number"
                min={1}
                value={action.outputChannel}
                onChange={(e) =>
                  setAction({
                    ...action,
                    outputChannel: Number(e.target.value),
                  })
                }
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label>Operation:</label>
              <select
                value={action.actionType}
                onChange={(e) =>
                  setAction({ ...action, actionType: e.target.value as any })
                }
                style={{ width: "100%" }}
              >
                <option value="patch">Patch</option>
                <option value="unpatch">Unpatch</option>
                <option value="toggle">Toggle</option>
              </select>
            </div>
          </div>
        );
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: "#333",
          padding: 20,
          borderRadius: 8,
          width: 600,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <h2>{initialTrigger.id ? "Edit Trigger" : "New Trigger"}</h2>

        <div style={{ marginBottom: 15 }}>
          <label>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: "100%", padding: 5 }}
          />
        </div>

        <div
          style={{
            marginBottom: 15,
            border: "1px solid #555",
            padding: 10,
            borderRadius: 4,
          }}
        >
          <h4 style={{ marginTop: 0 }}>Trigger Condition (When...)</h4>
          {renderModuleSelect(
            condition.module,
            handleConditionModuleChange,
            "Condition Source"
          )}
          {renderConditionForm()}
        </div>

        <div
          style={{
            marginBottom: 15,
            border: "1px solid #555",
            padding: 10,
            borderRadius: 4,
          }}
        >
          <h4 style={{ marginTop: 0 }}>Trigger Action (Then...)</h4>
          {renderModuleSelect(
            action.module,
            handleActionModuleChange,
            "Action Target"
          )}
          {renderActionForm()}
        </div>

        <div style={{ marginBottom: 15, display: "flex", gap: 20 }}>
          <div>
            <label>Delay (ms):</label>
            <input
              type="number"
              value={delay}
              onChange={(e) => setDelay(Number(e.target.value))}
              style={{ marginLeft: 10, padding: 5, width: 80 }}
            />
          </div>
          <div>
            <label>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              Enabled
            </label>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={onCancel}
            style={{ padding: "8px 16px", cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onSave({
                ...initialTrigger,
                name,
                delay,
                enabled,
                condition,
                action,
              })
            }
            style={{
              padding: "8px 16px",
              cursor: "pointer",
              background: "#4CAF50",
              color: "white",
              border: "none",
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditTriggerModal;
