import React, { useState } from "react";
import {
  SeamerTrigger,
  TriggerCondition,
  TriggerResultAction,
  TriggerModule,
  AtemSwitcherInfo,
  DeviceInfo,
  MixerState,
  OBSConnectionSettings,
  OBSState,
  SeamerIntegrations,
} from "../../types/seamer.types";
import { EditorDialogFrame } from "../components/EditorDialogFrame";

interface EditTriggerModalProps {
  initialTrigger: SeamerTrigger;
  onSave: (trigger: SeamerTrigger) => void;
  onCancel: () => void;
  mixerState: MixerState | null;
  obsConnections: OBSConnectionSettings[];
  obsStates: Record<string, OBSState>;
  vbDevices: DeviceInfo[];
  atemSwitchers: AtemSwitcherInfo[];
  integrations: SeamerIntegrations;
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
  integrations,
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

  // 渲染模块选择器。
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
        <option value="mixer">
          Mixer Control{integrations.mixer ? "" : " (Unavailable)"}
        </option>
        <option value="atem">
          ATEM Control{integrations.atem ? "" : " (Unavailable)"}
        </option>
        <option value="obs">
          OBS Control{integrations.obs ? "" : " (Unavailable)"}
        </option>
        <option value="vb">
          VB Control{integrations.vb ? "" : " (Unavailable)"}
        </option>
      </select>
    </div>
  );

  // 条件表单。
  const handleConditionModuleChange = (module: TriggerModule) => {
    // 切换模块时使用固定默认值。
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
        // 可用时默认选择第一台切换台。
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
                {/* VB 矩阵以输入到输出的方向建模，输入设备作为信号源。 */}
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
              {/* VB 连接 ID 默认保留为现有值。 */}
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

  // 动作表单。
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
    <EditorDialogFrame
      title={initialTrigger.id ? "Edit Trigger" : "New Trigger"}
      onCancel={onCancel}
      onSave={() =>
        onSave({
          ...initialTrigger,
          name,
          delay,
          enabled,
          condition,
          action,
        })
      }
    >
        <div className="seamer-editor-section">
          <label>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: "100%", padding: 5 }}
          />
        </div>

        <div className="seamer-editor-section">
          <h3>When</h3>
          {renderModuleSelect(
            condition.module,
            handleConditionModuleChange,
            "Condition Source"
          )}
          {renderConditionForm()}
        </div>

        <div className="seamer-editor-section">
          <h3>Then</h3>
          {renderModuleSelect(
            action.module,
            handleActionModuleChange,
            "Action Target"
          )}
          {renderActionForm()}
        </div>

        <div className="seamer-inline-controls">
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

    </EditorDialogFrame>
  );
};

export default EditTriggerModal;
