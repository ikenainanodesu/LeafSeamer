/// <reference path="../../../shared/types/global.d.ts" />
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { OBSState, OBSScene } from "../../../shared/types/obs.types";

const ObsControlPanel = () => {
  const [connected, setConnected] = useState(false);
  const [currentScene, setCurrentScene] = useState("");
  const [scenes, setScenes] = useState<OBSScene[]>([]);
  const [transitions, setTransitions] = useState<string[]>([]);
  const [currentTransition, setCurrentTransition] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamStats, setStreamStats] = useState<any>({});
  const [streamSettings, setStreamSettings] = useState({
    server: "",
    key: "",
    useAuth: false,
    username: "",
    password: "",
  });
  const [showKey, setShowKey] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    const obsStateRep = nodecg.Replicant<OBSState>("obsState");

    obsStateRep.on("change", (newVal: OBSState | undefined) => {
      if (newVal) {
        setConnected(newVal.connected);
        setCurrentScene(newVal.currentScene);
        setScenes(newVal.scenes);
        setTransitions(newVal.transitions || []);
        setCurrentTransition(newVal.currentTransition || "");
        setIsStreaming(newVal.isStreaming);
        setStreamStats(newVal.streamStats || {});
      }
    });

    const settingsRep = nodecg.Replicant<any>("obsStreamSettings", {
      defaultValue: {
        server: "",
        key: "",
        useAuth: false,
        username: "",
        password: "",
      },
    });
    settingsRep.on("change", (newVal: any) => {
      if (newVal) setStreamSettings(newVal);
    });
  }, []);

  const handleSceneClick = (sceneName: string) => {
    console.log(`[OBS Control] Clicking scene: ${sceneName}`);
    nodecg
      .sendMessageToBundle("setOBSScene", "obs-control", sceneName)
      .then(() => console.log("[OBS Control] Message sent successfully"))
      .catch((err: any) =>
        console.error("[OBS Control] Failed to send message:", err)
      );
  };

  const handleTransitionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const transitionName = e.target.value;
    console.log(`[OBS Control] Switching transition to: ${transitionName}`);
    nodecg
      .sendMessageToBundle("setOBSTransition", "obs-control", transitionName)
      .then(() => console.log("[OBS Control] Transition message sent"))
      .catch((err: any) =>
        console.error("[OBS Control] Failed to send transition:", err)
      );
  };

  const handleStreamSettingChange = (field: string, value: any) => {
    const newSettings = { ...streamSettings, [field]: value };
    setStreamSettings(newSettings);
    nodecg.Replicant("obsStreamSettings").value = newSettings;
  };

  const toggleStreaming = () => {
    if (isStreaming) {
      nodecg.sendMessageToBundle("stopStreaming", "obs-control");
    } else {
      nodecg
        .sendMessageToBundle("setStreamSettings", "obs-control", streamSettings)
        .then(() => nodecg.sendMessageToBundle("startStreaming", "obs-control"))
        .catch((err) => console.error("Failed to start stream", err));
    }
  };

  if (!connected) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "#aaa" }}>
        <p>OBS is disconnected. Please connect via the Connection panel.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ marginBottom: "20px" }}>
        <p>
          Current Scene: <strong>{currentScene}</strong>
        </p>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <label
          htmlFor="transition-select"
          style={{ display: "block", marginBottom: "5px" }}
        >
          Transition:
        </label>
        <select
          id="transition-select"
          value={currentTransition}
          onChange={handleTransitionChange}
          style={{
            width: "100%",
            padding: "8px",
            backgroundColor: "#424242",
            color: "white",
            border: "1px solid #555",
            borderRadius: "4px",
          }}
        >
          {transitions.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          marginBottom: "20px",
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
            value={streamSettings.server}
            onChange={(e) =>
              handleStreamSettingChange("server", e.target.value)
            }
            style={{
              width: "100%",
              padding: "5px",
              backgroundColor: "#222",
              color: "#fff",
              border: "1px solid #444",
              opacity: isStreaming ? 0.5 : 1,
            }}
            disabled={isStreaming}
          />
        </div>
        <div style={{ marginBottom: "5px", position: "relative" }}>
          <label style={{ display: "block" }}>Stream Key</label>
          <div style={{ display: "flex" }}>
            <input
              type={showKey ? "text" : "password"}
              value={streamSettings.key}
              onChange={(e) => handleStreamSettingChange("key", e.target.value)}
              style={{
                flex: 1,
                padding: "5px",
                backgroundColor: "#222",
                color: "#fff",
                border: "1px solid #444",
                opacity: isStreaming ? 0.5 : 1,
              }}
              disabled={isStreaming}
            />
            <button
              onClick={() => setShowKey(!showKey)}
              style={{ marginLeft: "5px" }}
              // Keep show/hide button active even if streaming, to verify key
            >
              {showKey ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        <div style={{ marginBottom: "5px" }}>
          <label>
            <input
              type="checkbox"
              checked={streamSettings.useAuth}
              onChange={(e) =>
                handleStreamSettingChange("useAuth", e.target.checked)
              }
              disabled={isStreaming}
            />{" "}
            Use authentication
          </label>
        </div>
        {streamSettings.useAuth && (
          <>
            <div style={{ marginBottom: "5px" }}>
              <label style={{ display: "block" }}>Username</label>
              <input
                type="text"
                value={streamSettings.username}
                onChange={(e) =>
                  handleStreamSettingChange("username", e.target.value)
                }
                style={{
                  width: "100%",
                  padding: "5px",
                  backgroundColor: "#222",
                  color: "#fff",
                  border: "1px solid #444",
                  opacity: isStreaming ? 0.5 : 1,
                }}
                disabled={isStreaming}
              />
            </div>
            <div style={{ marginBottom: "5px" }}>
              <label style={{ display: "block" }}>Password</label>
              <div style={{ display: "flex" }}>
                <input
                  type={showPass ? "text" : "password"}
                  value={streamSettings.password}
                  onChange={(e) =>
                    handleStreamSettingChange("password", e.target.value)
                  }
                  style={{
                    flex: 1,
                    padding: "5px",
                    backgroundColor: "#222",
                    color: "#fff",
                    border: "1px solid #444",
                    opacity: isStreaming ? 0.5 : 1,
                  }}
                  disabled={isStreaming}
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
          {isStreaming && (
            <div style={{ textAlign: "right", fontSize: "0.9em" }}>
              <div>Time: {streamStats.outputTimecode || "00:00:00"}</div>
              {/* Bitrate might not be accurate always with basic polling but let's show what we have if any */}
              {streamStats.kbitsPerSec > 0 && (
                <div>Bitrate: {streamStats.kbitsPerSec} kbps</div>
              )}
            </div>
          )}
        </div>
      </div>

      <h3>Scenes</h3>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {scenes.map((scene) => (
          <li
            key={scene.name}
            onClick={() => handleSceneClick(scene.name)}
            style={{
              padding: "10px",
              backgroundColor:
                currentScene === scene.name ? "#4caf50" : "#424242",
              marginBottom: "8px",
              borderRadius: "4px",
              cursor: "pointer",
              transition: "background-color 0.2s",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
            onMouseEnter={(e) => {
              if (currentScene !== scene.name) {
                e.currentTarget.style.backgroundColor = "#555";
              }
            }}
            onMouseLeave={(e) => {
              if (currentScene !== scene.name) {
                e.currentTarget.style.backgroundColor = "#424242";
              }
            }}
          >
            <span>{scene.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<ObsControlPanel />);
