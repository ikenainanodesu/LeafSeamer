/// <reference path="../../../shared/types/global.d.ts" />
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  MixerState,
  MixerConnectionSettings,
  MixerChannel,
} from "../../../shared/types/mixer.types";

const MixerDashboard = () => {
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(0);
  const [channels, setChannels] = useState<MixerChannel[]>([]);
  const [settings, setSettings] = useState<MixerConnectionSettings>({
    ip: "127.0.0.1",
    port: "8000",
    protocol: "udp",
  });

  useEffect(() => {
    const mixerStateRep = nodecg.Replicant<MixerState>("mixerState");
    const settingsRep = nodecg.Replicant<MixerConnectionSettings>(
      "mixerConnectionSettings"
    );

    mixerStateRep.on("change", (newVal: MixerState | undefined) => {
      if (newVal) {
        setConnected(newVal.connected);
        setLastUpdate(newVal.lastUpdate);
        // Force new reference to trigger re-render
        setChannels(newVal.channels ? [...newVal.channels] : []);
      }
    });

    settingsRep.on("change", (newVal: MixerConnectionSettings | undefined) => {
      if (newVal) {
        setSettings(newVal);
      }
    });
  }, []);

  const updateSetting = (key: keyof MixerConnectionSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    const settingsRep = nodecg.Replicant<MixerConnectionSettings>(
      "mixerConnectionSettings"
    );
    settingsRep.value = { ...settings, [key]: value };
  };

  const handleConnect = () => {
    nodecg.sendMessageToBundle("connectMixer", "mixer-control", {
      ip: settings.ip,
      port: parseInt(settings.port),
      protocol: settings.protocol,
    });
  };

  const handleDisconnect = () => {
    nodecg.sendMessageToBundle("disconnectMixer", "mixer-control");
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Mixer Status</h2>
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
            value={settings.ip}
            onChange={(e) => updateSetting("ip", e.target.value)}
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

        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
          <label>
            <input
              type="radio"
              value="udp"
              checked={settings.protocol === "udp"}
              onChange={(e) => updateSetting("protocol", "udp")}
              disabled={connected}
            />
            UDP
          </label>
          <label>
            <input
              type="radio"
              value="tcp"
              checked={settings.protocol === "tcp"}
              onChange={(e) => updateSetting("protocol", "tcp")}
              disabled={connected}
            />
            TCP
          </label>
        </div>

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
      )}
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<MixerDashboard />);
