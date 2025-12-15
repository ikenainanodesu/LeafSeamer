import React, { useState } from "react";
import {
  SeamerCard,
  SeamerAction,
  Preset,
  SeamerActionType,
  MixerFaderAction,
  VBPresetAction,
  OBSAction,
} from "../types/seamer.types";
import { v4 as uuidv4 } from "uuid";
import { MixerState } from "../../../../shared/types/mixer.types";
import {
  OBSConnectionSettings,
  OBSState,
} from "../../../../shared/types/obs.types";

interface EditCardModalProps {
  initialCard: SeamerCard;
  onSave: (card: SeamerCard) => void;
  onCancel: () => void;
  mixerState: MixerState | null;
  presets: Preset[];
  obsConnections: OBSConnectionSettings[];
  obsStates: Record<string, OBSState>;
}

const EditCardModal: React.FC<EditCardModalProps> = ({
  initialCard,
  onSave,
  onCancel,
  mixerState,
  presets,
  obsConnections,
  obsStates,
}) => {
  const [localCard, setLocalCard] = useState<SeamerCard>(initialCard);

  const updateAction = (id: string, updates: Partial<SeamerAction>) => {
    setLocalCard((prev) => ({
      ...prev,
      actions: prev.actions.map((a) =>
        a.id === id ? ({ ...a, ...updates } as SeamerAction) : a
      ),
    }));
  };

  const removeAction = (id: string) => {
    setLocalCard((prev) => ({
      ...prev,
      actions: prev.actions.filter((a) => a.id !== id),
    }));
  };

  const handleTypeChange = (id: string, type: SeamerActionType) => {
    setLocalCard((prev) => {
      const newActions = prev.actions.map((a) => {
        if (a.id === id) {
          // Create new action based on type
          if (type === "mixer-fader") {
            return {
              id,
              type,
              channelId: -1,
              level: -1000,
            } as MixerFaderAction;
          } else if (type === "vb-preset") {
            return {
              id,
              type,
              presetId: "",
            } as VBPresetAction;
          } else {
            // OBS Action default
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
      // Whenever parent value changes, reset local override UNLESS strictly equal
      // This allows external updates but keeps local typing if result matches
      setLocalVal(null);
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setLocalVal(raw);

      // Only propagate valid numbers
      // Allow "-" or empty string to exist locally without pushing NaN to parent
      if (raw === "" || raw === "-") {
        return;
      }

      const num = Number(raw);
      if (!isNaN(num)) {
        onChange(num);
      }
    };

    const handleBlur = () => {
      // On blur, revert to the actual parent value
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
      return (
        <div style={{ display: "flex", gap: "10px", marginTop: "5px" }}>
          <select
            value={action.channelId}
            onChange={(e) =>
              updateAction(action.id, { channelId: Number(e.target.value) })
            }
          >
            <option value={-1}>Select Channel</option>
            {mixerChs.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {ch.userLabel || `Ch ${ch.id}`}
              </option>
            ))}
          </select>
          <NumberInput
            value={action.level / 100}
            onChange={(val) =>
              updateAction(action.id, { level: Math.round(val * 100) })
            }
            placeholder="dB Level"
            style={{ width: "80px" }}
          />
          <span>dB</span>
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
      const scenes = obsState?.scenes?.map((s) => s.name) || [];
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

          {/* Scene Selector */}
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
              {scenes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Transition Selector */}
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
    }
    return null;
  };

  const addNewAction = () => {
    const newAction: OBSAction = {
      id: uuidv4(),
      type: "obs-action",
      connectionId: "",
    };
    setLocalCard((prev) => ({
      ...prev,
      actions: [...prev.actions, newAction],
    }));
  };

  const handleSave = () => {
    onSave(localCard);
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
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "#333",
          padding: "20px",
          borderRadius: "8px",
          width: "500px",
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        <h3>Edit Card</h3>
        <div style={{ marginBottom: "15px" }}>
          <label>Title</label>
          <input
            type="text"
            value={localCard.title}
            onChange={(e) =>
              setLocalCard((prev) => ({ ...prev, title: e.target.value }))
            }
            style={{ width: "100%", marginTop: "5px" }}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <h4>Actions</h4>
          {localCard.actions.map((action, idx) => (
            <div
              key={action.id}
              style={{
                border: "1px solid #555",
                padding: "10px",
                marginBottom: "10px",
                position: "relative",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "5px",
                }}
              >
                <span>Action #{idx + 1}</span>
                <button
                  onClick={() => removeAction(action.id)}
                  style={{ color: "red" }}
                >
                  Remove
                </button>
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
                <option value="mixer-fader">Mixer Fader</option>
                <option value="vb-preset">VB Matrix Preset</option>
                <option value="obs-action">OBS Control</option>
              </select>

              {renderActionDetails(action)}
            </div>
          ))}
          <button onClick={addNewAction}>+ Add Action</button>
        </div>

        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}
        >
          <button onClick={onCancel}>Cancel</button>
          <button onClick={handleSave} style={{ fontWeight: "bold" }}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditCardModal;
