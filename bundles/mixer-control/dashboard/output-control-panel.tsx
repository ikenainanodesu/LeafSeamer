/// <reference path="../../../shared/types/global.d.ts" />
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { MixerState, MixerOutput } from "../../../shared/types/mixer.types";

const OutputControlPanel = () => {
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(0);
  const [outputs, setOutputs] = useState<MixerOutput[]>([]);

  useEffect(() => {
    const mixerStateRep = nodecg.Replicant<MixerState>("mixerState");

    mixerStateRep.on("change", (newVal: MixerState | undefined) => {
      if (newVal) {
        setConnected(newVal.connected);
        setLastUpdate(newVal.lastUpdate);
        // Force new reference to trigger re-render
        setOutputs(newVal.outputs ? [...newVal.outputs] : []);
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
    <div style={{ padding: "20px", overflowX: "auto" }}>
      <p>Last Update: {new Date(lastUpdate).toLocaleTimeString()}</p>

      <div
        style={{
          marginTop: "20px",
          display: "flex",
          flexDirection: "row",
          gap: "15px",
        }}
      >
        {outputs.map((output) => (
          <div
            key={output.id}
            style={{
              minWidth: "200px",
              padding: "15px",
              backgroundColor: "#424242",
              borderRadius: "4px",
              border: output.isMuted
                ? "1px solid #f44336"
                : "1px solid #4caf50",
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: "10px" }}>
              {output.name}
            </h3>
            <p style={{ margin: "5px 0", fontSize: "0.9em", color: "#aaa" }}>
              ID: {output.id}
            </p>
            <p style={{ margin: "5px 0" }}>
              <strong>Fader:</strong>{" "}
              {output.faderLevel === -32768
                ? "-∞ dB"
                : `${(output.faderLevel / 100).toFixed(2)} dB`}
            </p>
            <input
              type="range"
              min="-10000" // -100.00 dB
              max="1000" // +10.00 dB
              value={output.faderLevel <= -32768 ? -10000 : output.faderLevel}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                nodecg.sendMessageToBundle(
                  "setMixerOutputFader",
                  "mixer-control",
                  {
                    outputId: output.id,
                    level: val,
                  }
                );
              }}
              style={{ width: "100%", marginBottom: "10px" }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "10px",
              }}
            >
              <strong>Muted:</strong>
              <button
                onClick={() => {
                  nodecg.sendMessageToBundle(
                    "setMixerOutputMute",
                    "mixer-control",
                    {
                      outputId: output.id,
                      isMuted: !output.isMuted,
                    }
                  );
                }}
                style={{
                  padding: "5px 10px",
                  backgroundColor: output.isMuted ? "#f44336" : "#4caf50",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                {output.isMuted ? "MUTED" : "ON"}
              </button>
            </div>

            {/* Toggle Directory for Input Sends */}
            <details>
              <summary style={{ cursor: "pointer", outline: "none" }}>
                Input Sends
              </summary>
              <div
                style={{
                  marginTop: "10px",
                  maxHeight: "200px",
                  overflowY: "auto",
                }}
              >
                {output.inputSends && output.inputSends.length > 0 ? (
                  output.inputSends.map((send) => (
                    <div
                      key={send.inputId}
                      style={{ fontSize: "0.9em", marginBottom: "5px" }}
                    >
                      <span>{send.inputName}</span>
                      <span style={{ float: "right" }}>
                        {send.active ? "ON" : "OFF"} /{" "}
                        {send.level === -32768
                          ? "-∞"
                          : (send.level / 100).toFixed(1)}
                        dB
                      </span>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: "0.8em", color: "#aaa" }}>
                    No inputs routed (or data not polled)
                  </p>
                )}
              </div>
            </details>
          </div>
        ))}
        {outputs.length === 0 && <p>No output data available.</p>}
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<OutputControlPanel />);
