/// <reference path="../../../../shared/types/global.d.ts" />
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { MixerState, MixerOutput } from "../../../../shared/types/mixer.types";

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
            <details
              onToggle={(e) => {
                // When expanded, query routing
                if ((e.target as HTMLDetailsElement).open) {
                  nodecg.sendMessageToBundle(
                    "queryOutputRouting",
                    "mixer-control",
                    {
                      outputId: output.id,
                    }
                  );
                }
              }}
            >
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
                      style={{
                        marginBottom: "10px",
                        padding: "8px",
                        backgroundColor: "#333",
                        borderRadius: "4px",
                        borderLeft: send.active
                          ? "3px solid #4caf50"
                          : "3px solid #777",
                      }}
                    >
                      {/* Row 1: Name + On/Off + Pre */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "5px",
                        }}
                      >
                        <span style={{ fontWeight: "bold", fontSize: "0.9em" }}>
                          {send.inputName}
                        </span>
                        <div style={{ display: "flex", gap: "5px" }}>
                          {/* Pre Toggle */}
                          <button
                            onClick={() => {
                              nodecg.sendMessageToBundle(
                                "setMixerInputSendPre",
                                "mixer-control",
                                {
                                  outputId: output.id,
                                  inputId: send.inputId,
                                  pre: !send.pre,
                                }
                              );
                            }}
                            style={{
                              fontSize: "0.7em",
                              padding: "2px 5px",
                              backgroundColor: send.pre ? "#ff9800" : "#555",
                              color: "white",
                              border: "none",
                              borderRadius: "2px",
                              cursor: "pointer",
                            }}
                          >
                            {send.pre ? "PRE" : "POST"}
                          </button>
                          {/* On/Off Toggle */}
                          <button
                            onClick={() => {
                              nodecg.sendMessageToBundle(
                                "setMixerInputSendActive",
                                "mixer-control",
                                {
                                  outputId: output.id,
                                  inputId: send.inputId,
                                  active: !send.active,
                                }
                              );
                            }}
                            style={{
                              fontSize: "0.7em",
                              padding: "2px 5px",
                              backgroundColor: send.active ? "#4caf50" : "#555",
                              color: "white",
                              border: "none",
                              borderRadius: "2px",
                              cursor: "pointer",
                            }}
                          >
                            {send.active ? "ON" : "OFF"}
                          </button>
                        </div>
                      </div>

                      {/* Row 2: Level Slider + Value */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "2px",
                          marginBottom: "5px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "0.8em",
                            color: "#ccc",
                          }}
                        >
                          <span>Lvl</span>
                          <span
                            style={{
                              cursor: "pointer",
                              backgroundColor: "#ff9800",
                              color: "white",
                              padding: "2px 6px",
                              borderRadius: "3px",
                              fontWeight: "bold",
                              fontSize: "0.9em",
                              boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                            }}
                            onClick={() => {
                              const newVal = prompt(
                                "Enter Level (dB):",
                                (send.level / 100).toFixed(2)
                              );
                              if (newVal !== null) {
                                let db = parseFloat(newVal);
                                if (isNaN(db)) return;
                                // Clanp dB
                                if (db > 10) db = 10;
                                if (db < -100) db = -100; // arbitrary floor
                                const raw = Math.round(db * 100);
                                nodecg.sendMessageToBundle(
                                  "setMixerInputSendLevel",
                                  "mixer-control",
                                  {
                                    outputId: output.id,
                                    inputId: send.inputId,
                                    level: raw,
                                  }
                                );
                              }
                            }}
                          >
                            {send.level <= -32768
                              ? "-∞"
                              : (send.level / 100).toFixed(1)}{" "}
                            dB
                          </span>
                        </div>
                        <input
                          type="range"
                          min="-10000" // -100.00 dB
                          max="1000" // +10.00 dB
                          step="10" // 0.1 dB
                          value={send.level <= -32768 ? -10000 : send.level}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            // If dragging to min, maybe set to -inf (-32768)?
                            // For smooth sliding, just send val.
                            nodecg.sendMessageToBundle(
                              "setMixerInputSendLevel",
                              "mixer-control",
                              {
                                outputId: output.id,
                                inputId: send.inputId,
                                level: val <= -10000 ? -32768 : val,
                              }
                            );
                          }}
                          style={{ width: "100%" }}
                        />
                      </div>

                      {/* Row 3: Pan Slider */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "2px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "0.8em",
                            color: "#ccc",
                          }}
                        >
                          <span>Pan</span>
                          <span>{send.pan}</span>
                        </div>
                        <input
                          type="range"
                          min="-63"
                          max="63"
                          value={send.pan || 0}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            nodecg.sendMessageToBundle(
                              "setMixerInputSendPan",
                              "mixer-control",
                              {
                                outputId: output.id,
                                inputId: send.inputId,
                                pan: val,
                              }
                            );
                          }}
                          style={{ width: "100%" }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: "0.8em", color: "#aaa" }}>
                    No inputs routed (or click to load)
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

export default OutputControlPanel;
