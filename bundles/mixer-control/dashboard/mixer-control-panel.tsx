/// <reference path="../../../shared/types/global.d.ts" />
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { MixerState, MixerChannel } from "../../../shared/types/mixer.types";

const MixerControlPanel = () => {
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(0);
  const [channels, setChannels] = useState<MixerChannel[]>([]);

  useEffect(() => {
    const mixerStateRep = nodecg.Replicant<MixerState>("mixerState");

    mixerStateRep.on("change", (newVal: MixerState | undefined) => {
      if (newVal) {
        setConnected(newVal.connected);
        setLastUpdate(newVal.lastUpdate);
        // Force new reference to trigger re-render
        setChannels(newVal.channels ? [...newVal.channels] : []);
      }
    });
  }, []);

  if (!connected) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "#aaa" }}>
        <p>Mixer is disconnected. Please connect via the Connection panel.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <p>Last Update: {new Date(lastUpdate).toLocaleTimeString()}</p>

      <div
        style={{
          marginTop: "20px",
          padding: "15px",
          backgroundColor: "#424242",
          borderRadius: "4px",
        }}
      >
        <h3>Channel 1 Monitor</h3>
        {channels.length > 0 ? (
          <div>
            <p>
              <strong>Name:</strong> {channels[0].name}
            </p>
            <p>
              <strong>Input Source:</strong>{" "}
              {channels[0].inputSource || "Unknown"}
            </p>
            <p>
              <strong>Fader Level:</strong>{" "}
              {channels[0].faderLevel === -32768
                ? "-∞ dB"
                : `${(channels[0].faderLevel / 100).toFixed(2)} dB`}
            </p>
            <p>
              <strong>Muted:</strong> {channels[0].isMuted ? "Yes" : "No"}
            </p>
          </div>
        ) : (
          <p>No channel data available.</p>
        )}
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<MixerControlPanel />);
