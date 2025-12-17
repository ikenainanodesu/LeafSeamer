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
            {/* Patch Selector */}
            <div style={{ marginBottom: "10px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.8em",
                  color: "#ccc",
                  marginBottom: "2px",
                }}
              >
                Patch Source:
              </label>
              <select
                value={channel.patch || "Unknown"}
                onChange={(e) => {
                  const val = e.target.value;
                  // If custom, maybe allow text input? For now, dropdown.
                  nodecg.sendMessageToBundle(
                    "setMixerInputPatch",
                    "mixer-control",
                    {
                      channelId: channel.id,
                      patch: val,
                    }
                  );
                }}
                style={{
                  width: "100%",
                  padding: "4px",
                  fontSize: "0.8em",
                  backgroundColor: "#222",
                  color: "white",
                  border: "1px solid #555",
                  borderRadius: "2px",
                }}
              >
                <option value="Unknown" disabled>
                  Select Source
                </option>
                {/* Common DM3/TF Sources - Example List */}
                <optgroup label="Local Analog">
                  {Array.from({ length: 16 }, (_, i) => (
                    <option
                      key={`Analog${i + 1}`}
                      value={`Analog${i + 1}`}
                    >{`Analog ${i + 1}`}</option>
                  ))}
                </optgroup>
                <optgroup label="Dante">
                  {Array.from(
                    { length: 16 },
                    (
                      _,
                      i // DM3 has 16 Dante usually? or 32? Let's assume 16 for now
                    ) => (
                      <option
                        key={`Dante${i + 1}`}
                        value={`Dante${i + 1}`}
                      >{`Dante ${i + 1}`}</option>
                    )
                  )}
                </optgroup>
                <optgroup label="USB">
                  {Array.from({ length: 18 }, (_, i) => (
                    <option
                      key={`USB${i + 1}`}
                      value={`USB${i + 1}`}
                    >{`USB ${i + 1}`}</option>
                  ))}
                </optgroup>
                <option value="None">None</option>
                {/* Allow displaying current value if not in list */}
                {channel.patch &&
                  !["Analog", "Dante", "USB", "None"].some((p) =>
                    channel.patch?.startsWith(p)
                  ) && <option value={channel.patch}>{channel.patch}</option>}
              </select>
            </div>
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
