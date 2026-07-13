import React, { useState } from "react";
import {
  SeamerCard,
  SeamerAction,
  Preset,
  SeamerActionType,
  MixerControlAction,
  VBPresetAction,
  OBSAction,
  AtemControlAction,
  AtemFunctionType,
  AtemTargetType,
  AtemState,
  AtemSwitcherInfo,
  MixerState,
  OBSConnectionSettings,
  OBSState,
  SeamerIntegrations,
} from "../../types/seamer.types";
import { Plus, Trash2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { Button, IconButton } from "../_leaf-ui/components";
import { EditorDialogFrame } from "./EditorDialogFrame";

interface EditCardModalProps {
  initialCard: SeamerCard;
  onSave: (card: SeamerCard) => void;
  onCancel: () => void;
  mixerState: MixerState | null;
  presets: Preset[];
  obsConnections: OBSConnectionSettings[];
  obsStates: Record<string, OBSState>;
  atemSwitchers: AtemSwitcherInfo[];
  atemStates: Record<string, AtemState>;
  integrations: SeamerIntegrations;
}

const EditCardModal: React.FC<EditCardModalProps> = ({
  initialCard,
  onSave,
  onCancel,
  mixerState,
  presets,
  obsConnections,
  obsStates,
  atemSwitchers,
  atemStates,
  integrations,
}) => {
  const [localCard, setLocalCard] = useState<SeamerCard>(initialCard);

  const updateAction = (id: string, updates: Partial<SeamerAction>) => {
    setLocalCard((prev: SeamerCard) => ({
      ...prev,
      actions: prev.actions.map((a: SeamerAction) =>
        a.id === id ? ({ ...a, ...updates } as SeamerAction) : a
      ),
    }));
  };

  const removeAction = (id: string) => {
    setLocalCard((prev: SeamerCard) => ({
      ...prev,
      actions: prev.actions.filter((a: SeamerAction) => a.id !== id),
    }));
  };

  const handleTypeChange = (id: string, type: SeamerActionType) => {
    setLocalCard((prev: SeamerCard) => {
      const newActions = prev.actions.map((a: SeamerAction) => {
        if (a.id === id) {
          // 按类型创建新的动作。
          if (type === "mixer-fader") {
            return {
              id,
              type,
              subFunction: "fader",
              channelId: -1,
              level: -1000,
            } as MixerControlAction;
          } else if (type === "vb-preset") {
            return {
              id,
              type,
              presetId: "",
            } as VBPresetAction;
          } else if (type === "atem-action") {
            return {
              id,
              type,
              switcherIp: "",
              functionType: "macro",
            } as AtemControlAction;
          } else {
            // OBS 动作默认值。
            return {
              id,
              type: "obs-action",
              connectionId: "",
            } as OBSAction;
          }
        }
        return a;
      });
      return { ...prev, actions: newActions };
    });
  };

  const NumberInput = ({
    value,
    onChange,
    placeholder,
    style,
  }: {
    value: number;
    onChange: (val: number) => void;
    placeholder?: string;
    style?: React.CSSProperties;
  }) => {
    const [localVal, setLocalVal] = useState<string | null>(null);

    React.useEffect(() => {
      // 父级值变化时重置本地覆盖值。
      // 这允许外部更新，同时保留匹配时的本地输入。
      setLocalVal(null);
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setLocalVal(raw);

      // 仅向上游传递有效数字。
      // 允许本地暂存 "-" 或空字符串，避免将 NaN 写入父级。
      if (raw === "" || raw === "-") {
        return;
      }

      const num = Number(raw);
      if (!isNaN(num)) {
        onChange(num);
      }
    };

    const handleBlur = () => {
      // 失焦时恢复父级实际值。
      setLocalVal(null);
    };

    return (
      <input
        type="number"
        value={localVal !== null ? localVal : value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        style={style}
      />
    );
  };

  const renderActionDetails = (action: SeamerAction) => {
    if (action.type === "mixer-fader") {
      const mixerChs = mixerState?.channels || [];
      const mixerOuts = mixerState?.outputs || []; // 发送控制需要输出列表。

      // 缺失时默认使用 fader，以兼容旧数据。
      const subFunc = (action as MixerControlAction).subFunction || "fader";

      return (
        <div style={{ marginTop: "5px" }}>
          {/* 子功能选择器 */}
          <div style={{ marginBottom: "5px" }}>
            <label style={{ marginRight: "10px" }}>Function:</label>
            <select
              value={subFunc}
              onChange={(e) =>
                updateAction(action.id, {
                  subFunction: e.target.value as "fader" | "send",
                })
              }
            >
              <option value="fader">Fader Control</option>
              <option value="send">Sends Control</option>
            </select>
          </div>

          {subFunc === "fader" && (
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <select
                value={action.channelId}
                onChange={(e) =>
                  updateAction(action.id, { channelId: Number(e.target.value) })
                }
              >
                <option value={-1}>Select Input Channel</option>
                {mixerChs.map((ch: any) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.userLabel || `Ch ${ch.id}`}
                  </option>
                ))}
              </select>
              <NumberInput
                value={(action.level || 0) / 100}
                onChange={(val) =>
                  updateAction(action.id, { level: Math.round(val * 100) })
                }
                placeholder="dB"
                style={{ width: "60px" }}
              />
              <span>dB</span>
            </div>
          )}

          {subFunc === "send" && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "5px" }}
            >
              {/* 输入选择器 */}
              <div style={{ display: "flex", alignItems: "center" }}>
                <label style={{ width: "60px" }}>Input:</label>
                <select
                  style={{ flex: 1 }}
                  value={(action as MixerControlAction).sendInputId || -1}
                  onChange={(e) =>
                    updateAction(action.id, {
                      sendInputId: Number(e.target.value),
                    })
                  }
                >
                  <option value={-1}>Select Input</option>
                  {mixerChs.map((ch: any) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.userLabel || `Ch ${ch.id}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* 输出选择器 */}
              <div style={{ display: "flex", alignItems: "center" }}>
                <label style={{ width: "60px" }}>Output:</label>
                <select
                  style={{ flex: 1 }}
                  value={(action as MixerControlAction).sendOutputId || -1}
                  onChange={(e) =>
                    updateAction(action.id, {
                      sendOutputId: Number(e.target.value),
                    })
                  }
                >
                  <option value={-1}>Select Output</option>
                  {mixerOuts.map((out: any) => (
                    <option key={out.id} value={out.id}>
                      {out.name || `Mix ${out.id}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* 第一行控制：增益和开关 */}
              <div
                style={{ display: "flex", gap: "10px", alignItems: "center" }}
              >
                <label>Gain:</label>
                <NumberInput
                  value={((action as MixerControlAction).sendLevel || 0) / 100}
                  onChange={(val) =>
                    updateAction(action.id, {
                      sendLevel: Math.round(val * 100),
                    })
                  }
                  placeholder="dB"
                  style={{ width: "60px" }}
                />
                <span>dB</span>

                <label style={{ marginLeft: "10px" }}>On:</label>
                <input
                  type="checkbox"
                  checked={(action as MixerControlAction).sendOn || false}
                  onChange={(e) =>
                    updateAction(action.id, { sendOn: e.target.checked })
                  }
                />
              </div>

              {/* 第二行控制：前后置和声像 */}
              <div
                style={{ display: "flex", gap: "10px", alignItems: "center" }}
              >
                <label>Pre:</label>
                <input
                  type="checkbox"
                  checked={(action as MixerControlAction).sendPre || false}
                  onChange={(e) =>
                    updateAction(action.id, { sendPre: e.target.checked })
                  }
                />

                <label style={{ marginLeft: "10px" }}>Pan:</label>
                <NumberInput
                  value={(action as MixerControlAction).sendPan || 0}
                  onChange={(val) => updateAction(action.id, { sendPan: val })}
                  placeholder="Pan"
                  style={{ width: "50px" }}
                />
              </div>
            </div>
          )}
        </div>
      );
    } else if (action.type === "vb-preset") {
      return (
        <div style={{ marginTop: "5px" }}>
          <select
            value={action.presetId}
            onChange={(e) =>
              updateAction(action.id, { presetId: e.target.value })
            }
          >
            <option value="">Select Preset</option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      );
    } else if (action.type === "obs-action") {
      const connections = obsConnections || [];
      const obsState = obsStates[action.connectionId];
      const scenes = obsState?.scenes?.map((s: any) => s.name) || [];
      const transitions = obsState?.transitions || [];

      return (
        <div
          style={{
            marginTop: "5px",
            display: "flex",
            flexDirection: "column",
            gap: "5px",
          }}
        >
          <select
            value={action.connectionId}
            onChange={(e) =>
              updateAction(action.id, { connectionId: e.target.value })
            }
          >
            <option value="">Select Connection</option>
            {connections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* 场景选择器 */}
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <label style={{ minWidth: "70px" }}>Scene:</label>
            <select
              style={{ flex: 1 }}
              value={action.sceneName || ""}
              onChange={(e) =>
                updateAction(action.id, { sceneName: e.target.value })
              }
            >
              <option value="">(No Change)</option>
              {scenes.map((s: string) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* 转场选择器 */}
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <label style={{ minWidth: "70px" }}>Transition:</label>
            <select
              style={{ flex: 1 }}
              value={action.transitionName || ""}
              onChange={(e) =>
                updateAction(action.id, { transitionName: e.target.value })
              }
            >
              <option value="">(No Change)</option>
              {transitions.map((t: string) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      );
    } else if (action.type === "atem-action") {
      const atemAction = action as AtemControlAction;
      const switcherIp = atemAction.switcherIp;
      const state = atemStates[switcherIp];
      const macros = state?.macros || {};
      const sources = state?.sources || {};

      // 过滤下拉框的信号源。
      const sourceOptions = Object.entries(sources).filter(([id, name]) => {
        // 与 AtemPanel 保持一致，隐藏目录类信号源。
        return !name.toLowerCase().includes("dir");
      });

      return (
        <div
          style={{
            marginTop: 5,
            display: "flex",
            flexDirection: "column",
            gap: 5,
          }}
        >
          {/* 切换台选择器 */}
          <select
            value={atemAction.switcherIp}
            onChange={(e) =>
              updateAction(action.id, { switcherIp: e.target.value })
            }
          >
            <option value="">Select ATEM Switcher</option>
            {atemSwitchers.map((s) => (
              <option key={s.ip} value={s.ip}>
                {s.alias || s.ip} {s.connected ? "(Online)" : "(Offline)"}
              </option>
            ))}
          </select>

          {/* 功能类型 */}
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <label>Function:</label>
            <select
              value={atemAction.functionType}
              onChange={(e) =>
                updateAction(action.id, {
                  functionType: e.target.value as AtemFunctionType,
                })
              }
            >
              <option value="macro">Macro</option>
              <option value="source">Source Control</option>
            </select>
          </div>

          {atemAction.functionType === "macro" && (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <label>Macro:</label>
              <select
                value={
                  atemAction.macroIndex !== undefined
                    ? atemAction.macroIndex
                    : -1
                }
                onChange={(e) =>
                  updateAction(action.id, {
                    macroIndex: Number(e.target.value),
                  })
                }
              >
                <option value={-1}>Select Macro</option>
                {Object.entries(macros).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {atemAction.functionType === "source" && (
            <>
              {/* 目标 */}
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <label>Target:</label>
                <select
                  value={atemAction.target || "preview"}
                  onChange={(e) =>
                    updateAction(action.id, {
                      target: e.target.value as AtemTargetType,
                    })
                  }
                >
                  <option value="program">PGM (Program)</option>
                  <option value="preview">PVW (Preview)</option>
                  <option value="output">Output (Aux 1)</option>
                  <option value="webcam">Webcam Out (Aux 2)</option>
                </select>
              </div>

              {/* 信号源选择 */}
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <label>Source:</label>
                <select
                  value={
                    atemAction.sourceId !== undefined ? atemAction.sourceId : -1
                  }
                  onChange={(e) =>
                    updateAction(action.id, {
                      sourceId: Number(e.target.value),
                    })
                  }
                >
                  <option value={-1}>Select Source</option>
                  {sourceOptions.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 仅在节目输出时显示转场 */}
              {atemAction.target === "program" && (
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <label>Transition:</label>
                  <select
                    value={atemAction.transition || "cut"}
                    onChange={(e) =>
                      updateAction(action.id, {
                        transition: e.target.value as any,
                      })
                    }
                  >
                    <option value="cut">Cut</option>
                    <option value="auto">Auto</option>
                  </select>
                </div>
              )}
            </>
          )}
        </div>
      );
    }
    return null;
  };

  const addNewAction = () => {
    const newAction: OBSAction = {
      id: uuidv4(),
      type: "obs-action",
      connectionId: "",
    };
    setLocalCard((prev: SeamerCard) => ({
      ...prev,
      actions: [...prev.actions, newAction],
    }));
  };

  const handleSave = () => {
    onSave(localCard);
  };

  return (
    <EditorDialogFrame title="Edit Card" onCancel={onCancel} onSave={handleSave}>
        <div className="seamer-editor-section">
          <label>Title</label>
          <input
            type="text"
            value={localCard.title}
            onChange={(e) =>
              setLocalCard((prev: SeamerCard) => ({
                ...prev,
                title: e.target.value,
              }))
            }
            style={{ width: "100%", marginTop: "5px" }}
          />
        </div>

        <div className="seamer-editor-section">
          <h3>Actions</h3>
          {localCard.actions.map((action: SeamerAction, idx: number) => (
            <div
              key={action.id}
              className="seamer-action-row"
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "5px",
                }}
              >
                <span>Action #{idx + 1}</span>
                <IconButton
                  label="Remove action"
                  tone="danger"
                  icon={<Trash2 size={16} aria-hidden="true" />}
                  onClick={() => removeAction(action.id)}
                />
              </div>
              <select
                value={action.type}
                onChange={(e) =>
                  handleTypeChange(
                    action.id,
                    e.target.value as SeamerActionType
                  )
                }
              >
                <option value="mixer-fader">
                  Mixer Control{integrations.mixer ? "" : " (Unavailable)"}
                </option>
                <option value="vb-preset">
                  VB Matrix Preset{integrations.vb ? "" : " (Unavailable)"}
                </option>
                <option value="obs-action">
                  OBS Control{integrations.obs ? "" : " (Unavailable)"}
                </option>
                <option value="atem-action">
                  ATEM Control{integrations.atem ? "" : " (Unavailable)"}
                </option>
              </select>

              {renderActionDetails(action)}
            </div>
          ))}
          <Button onClick={addNewAction}>
            <Plus size={16} aria-hidden="true" />
            Add Action
          </Button>
        </div>
    </EditorDialogFrame>
  );
};

export default EditCardModal;
