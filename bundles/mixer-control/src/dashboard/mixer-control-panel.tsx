/// <reference path="../../../../shared/types/global.d.ts" />
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { MixerState, MixerChannel } from "../../../../shared/types/mixer.types";

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
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "15px",
        }}
      >
        {channels.slice(0, 16).map((channel) => (
          <div
            key={channel.id}
            style={{
              padding: "15px",
              backgroundColor: "#424242",
              borderRadius: "4px",
              border: channel.isMuted
                ? "1px solid #f44336"
                : "1px solid #4caf50",
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: "10px" }}>
              {channel.name}
            </h3>
            <p style={{ margin: "5px 0", fontSize: "0.9em", color: "#aaa" }}>
              ID: {channel.id}
            </p>
            <p style={{ margin: "5px 0" }}>
              <strong>Fader:</strong>{" "}
              {channel.faderLevel === -32768
                ? "-∞ dB"
                : `${(channel.faderLevel / 100).toFixed(2)} dB`}
            </p>
            <input
              type="range"
              min="-10000" // -100.00 dB
              max="1000" // +10.00 dB
              value={channel.faderLevel <= -32768 ? -10000 : channel.faderLevel}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                nodecg.sendMessageToBundle("setMixerFader", "mixer-control", {
                  channelId: channel.id,
                  level: val,
                });
              }}
              style={{ width: "100%", marginBottom: "10px" }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <strong>Muted:</strong>
              <button
                onClick={() => {
                  nodecg.sendMessageToBundle("setMixerMute", "mixer-control", {
                    channelId: channel.id,
                    isMuted: !channel.isMuted,
                  });
                }}
                style={{
                  padding: "5px 10px",
                  backgroundColor: channel.isMuted ? "#f44336" : "#4caf50",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                {channel.isMuted ? "MUTED" : "ON"}
              </button>
            </div>
          </div>
        ))}
        {channels.length === 0 && <p>No channel data available.</p>}
      </div>
    </div>
  );
};

export default MixerControlPanel;
