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

  useEffect(() => {
    const obsStateRep = nodecg.Replicant<OBSState>("obsState");

    obsStateRep.on("change", (newVal: OBSState | undefined) => {
      if (newVal) {
        setConnected(newVal.connected);
        setCurrentScene(newVal.currentScene);
        setScenes(newVal.scenes);
        setTransitions(newVal.transitions || []);
        setCurrentTransition(newVal.currentTransition || "");
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
