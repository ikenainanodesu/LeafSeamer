import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Button,
  PanelErrorBoundary,
  PanelHeader,
} from "./_leaf-ui/components";
import "./_leaf-ui/index.css";
import "./mixer-dashboard.css";
import {
  MixerState,
  MixerConnectionSettings,
} from "../types/mixer.types";

const MixerConnection = () => {
  const [connected, setConnected] = useState(false);
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
    <div className="mixer-shell">
      <PanelHeader
        kicker="Mixer Control"
        title="Mixer Connection"
        target={`${settings.ip}:${settings.port}`}
        status={connected ? "Connected" : "Disconnected"}
        statusTone={connected ? "success" : "warning"}
      />

      <main className="mixer-connection-content">
        <div className="mixer-field-grid">
          <label className="leaf-field">
            <span>Host</span>
            <input
              className="leaf-input"
              type="text"
              value={settings.ip}
              onChange={(event) => updateSetting("ip", event.target.value)}
              disabled={connected}
              placeholder="127.0.0.1"
            />
          </label>
          <label className="leaf-field">
            <span>Port</span>
            <input
              className="leaf-input"
              type="number"
              value={settings.port}
              onChange={(event) => updateSetting("port", event.target.value)}
              disabled={connected}
              placeholder="8000"
            />
          </label>
          <fieldset className="mixer-protocol-field" disabled={connected}>
            <legend>Protocol</legend>
            <label>
              <input
                type="radio"
                value="udp"
                checked={settings.protocol === "udp"}
                onChange={() => updateSetting("protocol", "udp")}
              />
              UDP
            </label>
            <label>
              <input
                type="radio"
                value="tcp"
                checked={settings.protocol === "tcp"}
                onChange={() => updateSetting("protocol", "tcp")}
              />
              TCP
            </label>
          </fieldset>
        </div>

        {connected ? (
          <Button tone="danger" onClick={handleDisconnect}>
            Disconnect
          </Button>
        ) : (
          <Button tone="primary" onClick={handleConnect}>
            Connect
          </Button>
        )}
      </main>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(
  <PanelErrorBoundary>
    <MixerConnection />
  </PanelErrorBoundary>
);
