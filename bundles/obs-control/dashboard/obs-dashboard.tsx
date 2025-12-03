/// <reference path="../../../shared/types/global.d.ts" />
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  OBSState,
  OBSScene,
  OBSConnectionSettings,
} from "../../../shared/types/obs.types";

const ObsDashboard = () => {
  const [connected, setConnected] = useState(false);
  const [currentScene, setCurrentScene] = useState("");
  const [scenes, setScenes] = useState<OBSScene[]>([]);
  const [settings, setSettings] = useState<OBSConnectionSettings>({
    host: "localhost",
    port: "4455",
    password: "",
  });

  useEffect(() => {
    const obsStateRep = nodecg.Replicant<OBSState>("obsState");
    const settingsRep = nodecg.Replicant<OBSConnectionSettings>(
      "obsConnectionSettings"
    );

    obsStateRep.on("change", (newVal: OBSState | undefined) => {
      if (newVal) {
        setConnected(newVal.connected);
        setCurrentScene(newVal.currentScene);
        setScenes(newVal.scenes);
      }
    });

    settingsRep.on("change", (newVal: OBSConnectionSettings | undefined) => {
      if (newVal) {
        setSettings(newVal);
      }
    });
  }, []);

  const updateSetting = (key: keyof OBSConnectionSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    const settingsRep = nodecg.Replicant<OBSConnectionSettings>(
      "obsConnectionSettings"
    );
    settingsRep.value = { ...settings, [key]: value };
  };

  const handleConnect = () => {
    nodecg.sendMessageToBundle("connectOBS", "obs-control", {
      host: settings.host,
      port: parseInt(settings.port),
      password: settings.password,
    });
  };

  const handleDisconnect = () => {
    nodecg.sendMessageToBundle("disconnectOBS", "obs-control");
  };

  const handleSceneClick = (sceneName: string) => {
    console.log(`[OBS Dashboard] Clicking scene: ${sceneName}`);
    nodecg
      .sendMessageToBundle("setOBSScene", "obs-control", sceneName)
      .then(() => console.log("[OBS Dashboard] Message sent successfully"))
      .catch((err: any) =>
        console.error("[OBS Dashboard] Failed to send message:", err)
      );
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>OBS Status</h2>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            backgroundColor: connected ? "#4caf50" : "#f44336",
            marginRight: "10px",
          }}
        />
        <span style={{ fontWeight: "bold" }}>
          {connected ? "Connected" : "Disconnected"}
        </span>
      </div>

      <div
        style={{
          marginBottom: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", gap: "10px" }}>
          <input
            type="text"
            placeholder="IP Address"
            value={settings.host}
            onChange={(e) => updateSetting("host", e.target.value)}
            disabled={connected}
            style={{ padding: "5px", flex: 2 }}
          />
          <input
            type="number"
            placeholder="Port"
            value={settings.port}
            onChange={(e) => updateSetting("port", e.target.value)}
            disabled={connected}
            style={{ padding: "5px", flex: 1 }}
          />
        </div>
        <input
          type="password"
          placeholder="Password"
          value={settings.password}
          onChange={(e) => updateSetting("password", e.target.value)}
          disabled={connected}
          style={{ padding: "5px" }}
        />
        <div style={{ display: "flex", gap: "10px" }}>
          {!connected ? (
            <button
              onClick={handleConnect}
              style={{
                padding: "8px 16px",
                backgroundColor: "#2196f3",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                flex: 1,
              }}
            >
              Connect
            </button>
          ) : (
            <button
              onClick={handleDisconnect}
              style={{
                padding: "8px 16px",
                backgroundColor: "#f44336",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                flex: 1,
              }}
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      {connected && (
        <div>
          <p>
            Current Scene: <strong>{currentScene}</strong>
          </p>
          <h3>Scenes</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {scenes.map((scene) => (
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
                  transition: "background-color 0.2s",
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
                {scene.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<ObsDashboard />);
