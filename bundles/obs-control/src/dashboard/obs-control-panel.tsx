/// <reference path="../../../shared/types/global.d.ts" />
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  OBSState,
  OBSScene,
  OBSConnectionSettings,
} from "../../../shared/types/obs.types";

const SingleObsControl = ({
  id,
  name,
  obsState,
  streamSettings,
  onStreamSettingChange,
}: {
  id: string;
  name: string;
  obsState: OBSState;
  streamSettings: any;
  onStreamSettingChange: (id: string, newSettings: any) => void;
}) => {
  const {
    connected,
    currentScene,
    scenes,
    transitions,
    currentTransition,
    isStreaming,
    streamStats,
  } = obsState;
  const [showKey, setShowKey] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Initial local stream settings from prop
  const [localSettings, setLocalSettings] = useState(
    streamSettings || {
      server: "",
      key: "",
      useAuth: false,
      username: "",
      password: "",
    }
  );

  useEffect(() => {
    if (streamSettings) setLocalSettings(streamSettings);
  }, [streamSettings]);

  const handleSceneClick = (sceneName: string) => {
    nodecg.sendMessageToBundle("setOBSScene", "obs-control", {
      id,
      scene: sceneName,
    });
  };

  const handleTransitionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    nodecg.sendMessageToBundle("setOBSTransition", "obs-control", {
      id,
      transition: e.target.value,
    });
  };

  const handleLocalSettingChange = (field: string, value: any) => {
    const newSettings = { ...localSettings, [field]: value };
    setLocalSettings(newSettings);
    onStreamSettingChange(id, newSettings);
  };

  const toggleStreaming = () => {
    if (isStreaming) {
      nodecg.sendMessageToBundle("stopStreaming", "obs-control", { id });
    } else {
      nodecg
        .sendMessageToBundle("setStreamSettings", "obs-control", {
          id,
          settings: localSettings,
        })
        .then(() =>
          nodecg.sendMessageToBundle("startStreaming", "obs-control", { id })
        )
        .catch((err) => console.error(`[${name}] Failed to start stream`, err));
    }
  };

  if (!connected) {
    return (
      <div
        style={{
          padding: "10px",
          margin: "10px 0",
          border: "1px dashed #555",
          borderRadius: "5px",
          color: "#aaa",
        }}
      >
        <strong>{name}</strong>: Disconnected
      </div>
    );
  }

  return (
    <div
      style={{
        marginBottom: "20px",
        border: "1px solid #444",
        borderRadius: "5px",
        padding: "10px",
        backgroundColor: "#2b2b2b",
      }}
    >
      <h3
        style={{
          marginTop: 0,
          borderBottom: "1px solid #444",
          paddingBottom: "5px",
        }}
      >
        {name}
      </h3>

      <div style={{ marginBottom: "15px" }}>
        <p>
          Current Scene: <strong>{currentScene}</strong>
        </p>
      </div>

      {/* Transitions */}
      <div style={{ marginBottom: "15px" }}>
        <label style={{ display: "block", marginBottom: "5px" }}>
          Transition:
        </label>
        <select
          value={currentTransition || ""}
          onChange={handleTransitionChange}
          style={{
            width: "100%",
            padding: "5px",
            backgroundColor: "#424242",
            color: "white",
            border: "1px solid #555",
          }}
        >
          {(transitions || []).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Stream Control */}
      <div
        style={{
          marginBottom: "15px",
          padding: "10px",
          backgroundColor: "#333",
          borderRadius: "5px",
        }}
      >
        <h4 style={{ marginTop: 0 }}>Destination</h4>
        <div style={{ marginBottom: "5px" }}>
          <label style={{ display: "block" }}>Server</label>
          <input
            type="text"
            value={localSettings.server}
            onChange={(e) => handleLocalSettingChange("server", e.target.value)}
            disabled={isStreaming}
            style={{
              width: "100%",
              padding: "5px",
              backgroundColor: "#222",
              color: "#fff",
              border: "1px solid #444",
              opacity: isStreaming ? 0.5 : 1,
            }}
          />
        </div>
        <div style={{ marginBottom: "5px", position: "relative" }}>
          <label style={{ display: "block" }}>Stream Key</label>
          <div style={{ display: "flex" }}>
            <input
              type={showKey ? "text" : "password"}
              value={localSettings.key}
              onChange={(e) => handleLocalSettingChange("key", e.target.value)}
              disabled={isStreaming}
              style={{
                flex: 1,
                padding: "5px",
                backgroundColor: "#222",
                color: "#fff",
                border: "1px solid #444",
                opacity: isStreaming ? 0.5 : 1,
              }}
            />
            <button
              onClick={() => setShowKey(!showKey)}
              style={{ marginLeft: "5px" }}
            >
              {showKey ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        <div style={{ marginBottom: "5px" }}>
          <label>
            <input
              type="checkbox"
              checked={localSettings.useAuth}
              onChange={(e) =>
                handleLocalSettingChange("useAuth", e.target.checked)
              }
              disabled={isStreaming}
            />{" "}
            Use authentication
          </label>
        </div>
        {localSettings.useAuth && (
          <>
            <div style={{ marginBottom: "5px" }}>
              <label style={{ display: "block" }}>Username</label>
              <input
                type="text"
                value={localSettings.username}
                onChange={(e) =>
                  handleLocalSettingChange("username", e.target.value)
                }
                disabled={isStreaming}
                style={{
                  width: "100%",
                  padding: "5px",
                  backgroundColor: "#222",
                  color: "#fff",
                  border: "1px solid #444",
                  opacity: isStreaming ? 0.5 : 1,
                }}
              />
            </div>
            <div style={{ marginBottom: "5px" }}>
              <label style={{ display: "block" }}>Password</label>
              <div style={{ display: "flex" }}>
                <input
                  type={showPass ? "text" : "password"}
                  value={localSettings.password}
                  onChange={(e) =>
                    handleLocalSettingChange("password", e.target.value)
                  }
                  disabled={isStreaming}
                  style={{
                    flex: 1,
                    padding: "5px",
                    backgroundColor: "#222",
                    color: "#fff",
                    border: "1px solid #444",
                    opacity: isStreaming ? 0.5 : 1,
                  }}
                />
                <button
                  onClick={() => setShowPass(!showPass)}
                  style={{ marginLeft: "5px" }}
                >
                  {showPass ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          </>
        )}
        <div
          style={{
            marginTop: "15px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <button
            onClick={toggleStreaming}
            style={{
              padding: "10px 20px",
              backgroundColor: isStreaming ? "#d32f2f" : "#388e3c",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {isStreaming ? "Stop Streaming" : "Start Streaming"}
          </button>
          {isStreaming && streamStats && (
            <div style={{ textAlign: "right", fontSize: "0.9em" }}>
              <div>Time: {streamStats.outputTimecode || "00:00:00"}</div>
              {streamStats.kbitsPerSec > 0 && (
                <div>Bitrate: {streamStats.kbitsPerSec} kbps</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Scenes */}
      <h4>Scenes</h4>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {(scenes || []).map((scene) => (
          <li
            key={scene.name}
            onClick={() => handleSceneClick(scene.name)}
            style={{
              padding: "8px",
              backgroundColor:
                currentScene === scene.name ? "#4caf50" : "#424242",
              marginBottom: "4px",
              borderRadius: "4px",
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>{scene.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const ObsControlPanel = () => {
  const [connections, setConnections] = useState<OBSConnectionSettings[]>([]);
  const [obsStates, setObsStates] = useState<Record<string, OBSState>>({});
  const [allStreamSettings, setAllStreamSettings] = useState<
    Record<string, any>
  >({});

  useEffect(() => {
    const obsConnectionsRep = nodecg.Replicant<OBSConnectionSettings[]>(
      "obsConnections",
      { defaultValue: [] }
    );
    const obsStatesRep = nodecg.Replicant<Record<string, OBSState>>(
      "obsStates",
      { defaultValue: {} }
    );
    const streamSettingsRep = nodecg.Replicant<Record<string, any>>(
      "obsStreamSettings",
      { defaultValue: {} }
    );

    obsConnectionsRep.on("change", (newVal) => {
      if (newVal) setConnections(JSON.parse(JSON.stringify(newVal)));
    });
    obsStatesRep.on("change", (newVal) => {
      if (newVal) setObsStates(JSON.parse(JSON.stringify(newVal)));
    });
    streamSettingsRep.on("change", (newVal) => {
      if (newVal) setAllStreamSettings(JSON.parse(JSON.stringify(newVal)));
    });
  }, []);

  const handleStreamSettingChange = (id: string, newSettings: any) => {
    const newAllSettings = { ...allStreamSettings, [id]: newSettings };
    setAllStreamSettings(newAllSettings);
    nodecg.Replicant<Record<string, any>>("obsStreamSettings", {
      defaultValue: {},
    }).value = newAllSettings;
  };

  return (
    <div style={{ padding: "10px" }}>
      <h2>OBS Controls</h2>
      {connections.length === 0 && <p>No OBS connections configured.</p>}

      {connections.map((conn) => (
        <SingleObsControl
          key={conn.id}
          id={conn.id}
          name={conn.name || "Unknown OBS"}
          obsState={obsStates[conn.id] || { connected: false }}
          streamSettings={allStreamSettings[conn.id]}
          onStreamSettingChange={handleStreamSettingChange}
        />
      ))}
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<ObsControlPanel />);
