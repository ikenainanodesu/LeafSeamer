import React, { useEffect, useState } from "react";
import { MixerState, MixerChannel } from "../types/mixer.types";
import { Button } from "./_leaf-ui/components";

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
        setChannels(newVal.channels ? [...newVal.channels] : []);
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
          {channels.slice(0, 16).map((channel) => (
            <article
              className="mixer-channel"
              data-muted={channel.isMuted ? "true" : "false"}
              key={channel.id}
            >
              <header className="mixer-channel-heading">
                <h2>{channel.name}</h2>
                <span className="mixer-channel-id">ID: {channel.id}</span>
              </header>
              <div className="mixer-channel-controls">
                <label className="leaf-field mixer-patch-field">
                  <span>Patch Source</span>
                  <select
                    className="leaf-input"
                    value={channel.patch || "Unknown"}
                    onChange={(event) => {
                      const val = event.target.value;
                      nodecg.sendMessageToBundle(
                        "setMixerInputPatch",
                        "mixer-control",
                        {
                          channelId: channel.id,
                          patch: val,
                        }
                      );
                    }}
                  >
                    <option value="Unknown" disabled>
                      Select Source
                    </option>
                    <optgroup label="Local Analog">
                      {Array.from({ length: 16 }, (_, index) => (
                        <option
                          key={`Analog${index + 1}`}
                          value={`Analog${index + 1}`}
                        >{`Analog ${index + 1}`}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Dante">
                      {Array.from({ length: 16 }, (_, index) => (
                        <option
                          key={`Dante${index + 1}`}
                          value={`Dante${index + 1}`}
                        >{`Dante ${index + 1}`}</option>
                      ))}
                    </optgroup>
                    <optgroup label="USB">
                      {Array.from({ length: 18 }, (_, index) => (
                        <option
                          key={`USB${index + 1}`}
                          value={`USB${index + 1}`}
                        >{`USB ${index + 1}`}</option>
                      ))}
                    </optgroup>
                    <option value="None">None</option>
                    {channel.patch &&
                      !["Analog", "Dante", "USB", "None"].some((prefix) =>
                        channel.patch?.startsWith(prefix)
                      ) && <option value={channel.patch}>{channel.patch}</option>}
                  </select>
                </label>
                <div className="mixer-meter">
                  <span>Fader</span>
                  <output>
                    {channel.faderLevel === -32768
                      ? "-∞ dB"
                      : `${(channel.faderLevel / 100).toFixed(2)} dB`}
                  </output>
                </div>
                <input
                  className="mixer-fader"
                  type="range"
                  min="-10000"
                  max="1000"
                  value={channel.faderLevel <= -32768 ? -10000 : channel.faderLevel}
                  onChange={(event) => {
                    const val = parseInt(event.target.value);
                    nodecg.sendMessageToBundle("setMixerFader", "mixer-control", {
                      channelId: channel.id,
                      level: val,
                    });
                  }}
                />
              </div>
              <div className="mixer-channel-actions">
                <span>Muted</span>
                <Button
                  className="mixer-mute"
                  aria-pressed={channel.isMuted}
                  onClick={() => {
                    nodecg.sendMessageToBundle("setMixerMute", "mixer-control", {
                      channelId: channel.id,
                      isMuted: !channel.isMuted,
                    });
                  }}
                >
                  {channel.isMuted ? "MUTED" : "ON"}
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
      {channels.length === 0 ? <p className="mixer-empty-state">No channel data available.</p> : null}
    </div>
  );
};

export default MixerControlPanel;
