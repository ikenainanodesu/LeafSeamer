/// <reference path="../../../shared/types/global.d.ts" />
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { OBSState, OBSScene } from "../../../shared/types/obs.types";

const ObsControlPanel = () => {
  const [connected, setConnected] = useState(false);
  const [currentScene, setCurrentScene] = useState("");
  const [scenes, setScenes] = useState<OBSScene[]>([]);

  useEffect(() => {
    const obsStateRep = nodecg.Replicant<OBSState>("obsState");

    obsStateRep.on("change", (newVal: OBSState | undefined) => {
      if (newVal) {
        setConnected(newVal.connected);
        setCurrentScene(newVal.currentScene);
        setScenes(newVal.scenes);
      }
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
