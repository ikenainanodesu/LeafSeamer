import React, { useState } from "react";
import { SeamerCard, SeamerAction, Preset } from "../types/seamer.types";
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
  const [title, setTitle] = useState(initialCard.title);
  const [actions, setActions] = useState<SeamerAction[]>(initialCard.actions);
  const [newActionType, setNewActionType] = useState<string>("mixer-fader");

  const addAction = () => {
    let newAction: SeamerAction;
    const id = uuidv4();

    switch (newActionType) {
      case "mixer-fader":
        newAction = { id, type: "mixer-fader", channelId: 1, level: -1000 };
        break;
      case "vb-preset":
        newAction = { id, type: "vb-preset", presetId: presets[0]?.id || "" };
        break;
      case "obs-transition":
        // Find first connection and first transition
        const connId = obsConnections[0]?.id || "default";
        const trans = obsStates[connId]?.transitions?.[0] || "Cut";
        newAction = {
          id,
          type: "obs-transition",
          connectionId: connId,
          transitionName: trans,
        };
        break;
      case "obs-scene":
        const connIdScene = obsConnections[0]?.id || "default";
        const scene = obsStates[connIdScene]?.scenes?.[0]?.name || "";
        newAction = {
          id,
          type: "obs-scene",
          connectionId: connIdScene,
          sceneName: scene,
        };
        break;
      default:
        return;
    }
    setActions([...actions, newAction]);
  };

  const removeAction = (id: string) => {
    setActions(actions.filter((a) => a.id !== id));
  };

  const updateAction = (id: string, updates: Partial<SeamerAction>) => {
    setActions(
      actions.map((a) =>
        a.id === id ? ({ ...a, ...updates } as SeamerAction) : a
      )
    );
  };

  const renderActionEditor = (action: SeamerAction, index: number) => {
    return (
      <div
        key={action.id}
        style={{
          border: "1px solid #555",
          padding: 10,
          marginBottom: 10,
          borderRadius: 4,
          background: "#222",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 5,
          }}
        >
          <strong>
            #{index + 1} {action.type}
          </strong>
          <button
            onClick={() => removeAction(action.id)}
            style={{ color: "red", cursor: "pointer" }}
          >
            Remove
          </button>
        </div>

        {action.type === "mixer-fader" && (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <label>Channel:</label>
            <select
              value={action.channelId}
              onChange={(e) =>
                updateAction(action.id, { channelId: parseInt(e.target.value) })
              }
              style={{
                background: "#333",
                color: "white",
                border: "1px solid #555",
              }}
            >
              {mixerState?.channels?.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.name} (ID: {ch.id})
                </option>
              ))}
              {!mixerState?.channels?.length && (
                <option value={1}>Channel 1</option>
              )}
            </select>

            <label>Level (dB):</label>
            <input
              type="range"
              min="-10000"
              max="1000"
              value={action.level}
              onChange={(e) =>
                updateAction(action.id, { level: parseInt(e.target.value) })
              }
            />
            <span>{(action.level / 100).toFixed(1)} dB</span>
          </div>
        )}

        {action.type === "vb-preset" && (
          <div style={{ display: "flex", gap: 10 }}>
            <label>Preset:</label>
            <select
              value={action.presetId}
              onChange={(e) =>
                updateAction(action.id, { presetId: e.target.value })
              }
              style={{
                background: "#333",
                color: "white",
                border: "1px solid #555",
                flex: 1,
              }}
            >
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
              {presets.length === 0 && (
                <option value="">No presets available</option>
              )}
            </select>
          </div>
        )}

        {(action.type === "obs-transition" || action.type === "obs-scene") && (
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <label>Connection:</label>
              <select
                value={action.connectionId}
                onChange={(e) =>
                  updateAction(action.id, { connectionId: e.target.value })
                }
                style={{
                  background: "#333",
                  color: "white",
                  border: "1px solid #555",
                }}
              >
                {obsConnections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {action.type === "obs-transition" && (
              <div style={{ display: "flex", gap: 10 }}>
                <label>Transition:</label>
                <select
                  value={action.transitionName}
                  onChange={(e) =>
                    updateAction(action.id, { transitionName: e.target.value })
                  }
                  style={{
                    background: "#333",
                    color: "white",
                    border: "1px solid #555",
                  }}
                >
                  {(obsStates[action.connectionId]?.transitions || []).map(
                    (t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    )
                  )}
                </select>
              </div>
            )}

            {action.type === "obs-scene" && (
              <div style={{ display: "flex", gap: 10 }}>
                <label>Scene:</label>
                <select
                  value={action.sceneName}
                  onChange={(e) =>
                    updateAction(action.id, { sceneName: e.target.value })
                  }
                  style={{
                    background: "#333",
                    color: "white",
                    border: "1px solid #555",
                  }}
                >
                  {(obsStates[action.connectionId]?.scenes || []).map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>
    );
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
        zIndex: 1000,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          backgroundColor: "#2b2b2b",
          width: "80%",
          maxHeight: "90%",
          padding: 20,
          borderRadius: 8,
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 0 20px rgba(0,0,0,0.5)",
        }}
      >
        <h2>Edit Card</h2>

        <div style={{ marginBottom: 15 }}>
          <label style={{ display: "block", marginBottom: 5 }}>
            Card Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: "100%",
              padding: 8,
              fontSize: "1.2em",
              background: "#444",
              border: "1px solid #555",
              color: "white",
            }}
          />
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            marginBottom: 15,
            paddingRight: 10,
          }}
        >
          {actions.map((action, idx) => renderActionEditor(action, idx))}
          {actions.length === 0 && (
            <p style={{ color: "#888" }}>No actions added.</p>
          )}
        </div>

        <div
          style={{
            borderTop: "1px solid #444",
            paddingTop: 15,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", gap: 10 }}>
            <select
              value={newActionType}
              onChange={(e) => setNewActionType(e.target.value)}
              style={{
                padding: 8,
                background: "#444",
                color: "white",
                border: "1px solid #555",
              }}
            >
              <option value="mixer-fader">Mixer Control</option>
              <option value="vb-preset">VB Matrix Preset</option>
              <option value="obs-transition">OBS Transition</option>
              <option value="obs-scene">OBS Scene Switch</option>
            </select>
            <button
              onClick={addAction}
              style={{
                padding: "8px 15px",
                cursor: "pointer",
                background: "#2196F3",
                border: "none",
                color: "white",
                borderRadius: 4,
              }}
            >
              + Add Action
            </button>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onCancel}
              style={{
                padding: "10px 20px",
                cursor: "pointer",
                background: "#555",
                border: "none",
                color: "white",
                borderRadius: 4,
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => onSave({ ...initialCard, title, actions })}
              style={{
                padding: "10px 20px",
                cursor: "pointer",
                background: "#4CAF50",
                border: "none",
                color: "white",
                borderRadius: 4,
              }}
            >
              Save Card
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditCardModal;
