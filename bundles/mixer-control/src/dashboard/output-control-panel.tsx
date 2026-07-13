import React, { useEffect, useState } from "react";
import { MixerState, MixerOutput } from "../types/mixer.types";
import { Button } from "./_leaf-ui/components";

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
        setOutputs(newVal.outputs ? [...newVal.outputs] : []);
      }
    });
  }, []);

  if (!connected) {
    return (
      <div className="mixer-empty-state">
        <p>Mixer is disconnected. Please connect via the Connection panel.</p>
      </div>
    );
  }

  return (
    <div className="mixer-control-panel">
      <p className="mixer-last-update">
        Last Update: {new Date(lastUpdate).toLocaleTimeString()}
      </p>

      <div className="mixer-channel-viewport">
        <div className="mixer-channel-grid">
          {outputs.map((output) => (
            <article
              className="mixer-channel mixer-output-channel"
              data-muted={output.isMuted ? "true" : "false"}
              key={output.id}
            >
              <header className="mixer-channel-heading">
                <h2>{output.name}</h2>
                <span className="mixer-channel-id">ID: {output.id}</span>
              </header>
              <div className="mixer-channel-controls">
                <div className="mixer-meter">
                  <span>Fader</span>
                  <output>
                    {output.faderLevel === -32768
                      ? "-∞ dB"
                      : `${(output.faderLevel / 100).toFixed(2)} dB`}
                  </output>
                </div>
                <input
                  className="mixer-fader"
                  type="range"
                  min="-10000"
                  max="1000"
                  value={output.faderLevel <= -32768 ? -10000 : output.faderLevel}
                  onChange={(event) => {
                    const val = parseInt(event.target.value);
                    nodecg.sendMessageToBundle(
                      "setMixerOutputFader",
                      "mixer-control",
                      {
                        outputId: output.id,
                        level: val,
                      }
                    );
                  }}
                />
              </div>
              <div className="mixer-channel-actions">
                <span>Muted</span>
                <Button
                  className="mixer-mute"
                  aria-pressed={output.isMuted}
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
                >
                  {output.isMuted ? "MUTED" : "ON"}
                </Button>
              </div>

              <details
                className="leaf-section mixer-sends"
                onToggle={(event) => {
                  if (event.currentTarget.open) {
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
                <summary className="leaf-section-header">Input Sends</summary>
                <div className="leaf-section-body mixer-send-viewport">
                  <div className="mixer-send-grid">
                    {output.inputSends && output.inputSends.length > 0 ? (
                      output.inputSends.map((send) => (
                        <section
                          className="mixer-send"
                          data-active={send.active ? "true" : "false"}
                          key={send.inputId}
                        >
                          <div className="mixer-send-heading">
                            <strong>{send.inputName}</strong>
                            <div className="mixer-send-toggles">
                              <Button
                                className="mixer-send-toggle"
                                aria-pressed={send.pre}
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
                              >
                                {send.pre ? "PRE" : "POST"}
                              </Button>
                              <Button
                                className="mixer-send-toggle"
                                aria-pressed={send.active}
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
                              >
                                {send.active ? "ON" : "OFF"}
                              </Button>
                            </div>
                          </div>

                          <div className="mixer-send-control">
                            <div className="mixer-meter">
                              <span>Lvl</span>
                              <button
                                className="mixer-level-value"
                                type="button"
                                onClick={() => {
                                  const newVal = prompt(
                                    "Enter Level (dB):",
                                    (send.level / 100).toFixed(2)
                                  );
                                  if (newVal !== null) {
                                    let db = parseFloat(newVal);
                                    if (isNaN(db)) return;
                                    if (db > 10) db = 10;
                                    if (db < -100) db = -100;
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
                              </button>
                            </div>
                            <input
                              className="mixer-fader"
                              type="range"
                              min="-10000"
                              max="1000"
                              step="10"
                              value={send.level <= -32768 ? -10000 : send.level}
                              onChange={(event) => {
                                const val = parseInt(event.target.value);
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
                            />
                          </div>

                          <div className="mixer-send-control">
                            <div className="mixer-meter">
                              <span>Pan</span>
                              <output>{send.pan}</output>
                            </div>
                            <input
                              className="mixer-fader"
                              type="range"
                              min="-63"
                              max="63"
                              value={send.pan || 0}
                              onChange={(event) => {
                                const val = parseInt(event.target.value);
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
                            />
                          </div>
                        </section>
                      ))
                    ) : (
                      <p className="mixer-empty-state">
                        No inputs routed (or click to load)
                      </p>
                    )}
                  </div>
                </div>
              </details>
            </article>
          ))}
        </div>
      </div>
      {outputs.length === 0 ? <p className="mixer-empty-state">No output data available.</p> : null}
    </div>
  );
};

export default OutputControlPanel;
