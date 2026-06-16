import React, { useEffect, useState } from "react";
import { NetworkConfig } from "../../types";

const NetworkConfigList: React.FC = () => {
  const [configs, setConfigs] = useState<NetworkConfig[]>([]);
  const [localIPs, setLocalIPs] = useState<string[]>([]);

  useEffect(() => {
    const rep = nodecg.Replicant<NetworkConfig[]>("networkConfigs", {
      defaultValue: [],
    });

    // First value load
    rep.on("change", (newVal: NetworkConfig[]) => {
      if (newVal) {
        setConfigs(newVal);
      }
    });

    const hostRep = nodecg.Replicant<{ ips: string[] }>("hostInfo");
    hostRep.on("change", (val: { ips: string[] }) => {
      if (val && val.ips) setLocalIPs(val.ips);
    });
  }, []);

  const handleAdd = () => {
    const newConfig: NetworkConfig = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Matrix ${configs.length + 1}`,
      ip: "127.0.0.1",
      port: 6980,
      streamName: "Command1",
    };
    const newConfigs = [...configs, newConfig];
    setConfigs(newConfigs); // Optimistic
    nodecg.Replicant<NetworkConfig[]>("networkConfigs").value = newConfigs;
  };

  const handleUpdate = (id: string, updates: Partial<NetworkConfig>) => {
    const newConfigs = configs.map((c) =>
      c.id === id ? { ...c, ...updates } : c
    );
    setConfigs(newConfigs);
    nodecg.Replicant<NetworkConfig[]>("networkConfigs").value = newConfigs;
  };

  const handleRemove = (id: string) => {
    if (!confirm("Are you sure you want to remove this connection?")) return;
    const newConfigs = configs.filter((c) => c.id !== id);
    setConfigs(newConfigs);
    nodecg.Replicant<NetworkConfig[]>("networkConfigs").value = newConfigs;
  };

  return (
    <div className="vb-shell vb-shell--compact">
      <header className="vb-header">
        <div className="config-title">
          <span className="vb-kicker">VBAN Matrix</span>
          <h2>Network Configuration</h2>
        </div>
        <div className="local-ip-list" aria-label="Local IP addresses">
          {localIPs.length > 0 ? (
            localIPs.map((ip) => (
              <span className="ip-pill" key={ip} title={ip}>
                {ip}
              </span>
            ))
          ) : (
            <span className="ip-pill">No local IPs</span>
          )}
        </div>
      </header>

      <div className="config-list">
        {configs.length === 0 && (
          <div className="empty-panel">No network configurations.</div>
        )}
        {configs.map((config) => (
          <NetworkConfigCard
            key={config.id}
            config={config}
            onUpdate={(updates) => handleUpdate(config.id, updates)}
            onRemove={() => handleRemove(config.id)}
          />
        ))}
      </div>

      <button onClick={handleAdd} className="add-config-button">
        + Add Network Configuration
      </button>
    </div>
  );
};

const NetworkConfigCard: React.FC<{
  config: NetworkConfig;
  onUpdate: (updates: Partial<NetworkConfig>) => void;
  onRemove: () => void;
}> = ({ config, onUpdate, onRemove }) => {
  return (
    <article className="network-card">
      <button
        onClick={onRemove}
        className="icon-button icon-button--danger network-remove"
        title="Remove connection"
        aria-label={`Remove connection ${config.name}`}
      >
        X
      </button>

      <div>
        <label className="field field--name">
          <span>Connection Name</span>
          <input
            value={config.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="vb-input"
            placeholder="Connection Name"
          />
        </label>

        <div className="network-fields">
          <label className="field">
            <span>IP</span>
            <input
              type="text"
              value={config.ip}
              onChange={(e) => onUpdate({ ip: e.target.value })}
              className="vb-input"
            />
          </label>
          <label className="field">
            <span>Port</span>
            <input
              type="number"
              value={config.port}
              onChange={(e) =>
                onUpdate({ port: parseInt(e.target.value) || 0 })
              }
              className="vb-input"
            />
          </label>
          <label className="field">
            <span>Stream</span>
            <input
              type="text"
              value={config.streamName}
              onChange={(e) => onUpdate({ streamName: e.target.value })}
              className="vb-input"
            />
          </label>

          <PingTestButton configId={config.id} />
        </div>
      </div>
    </article>
  );
};

const PingTestButton: React.FC<{ configId: string }> = ({ configId }) => {
  const [flashState, setFlashState] = React.useState<
    "idle" | "success" | "error"
  >("idle");
  const [testing, setTesting] = React.useState(false);

  const runPingTest = async () => {
    if (testing) return;
    setTesting(true);

    for (let i = 0; i < 5; i++) {
      let success = false;
      try {
        // Send Ping specific to this connection
        // We'll use a transaction ID or specific message.
        // For now, simpler: listen for specific success event if we implement targeted ping.
        // OR: just rely on global "pingSuccess" but we can't differentiate easily without update.
        // Let's assume manager will be updated to send { connectionId, version } in pingSuccess.

        const promise = new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            nodecg.unlisten("pingSuccess", listener);
            reject(new Error("Timeout"));
          }, 500);

          const listener = (data: any) => {
            // If data is string, it's old format. If object, check connectionId.
            // For backward compat during dev, accept any if we didn't send ID?
            // Plan: manager sends { connectionId, result }
            if (data && data.connectionId === configId) {
              clearTimeout(timeout);
              nodecg.unlisten("pingSuccess", listener);
              resolve();
            }
          };
          nodecg.listenFor("pingSuccess", listener);
        });

        nodecg.sendMessage("ping", configId);
        await promise;
        success = true;
        setFlashState("success");
      } catch (e) {
        setFlashState("error");
      }

      await new Promise((r) => setTimeout(r, 200));
      setFlashState("idle");
      if (i < 4) await new Promise((r) => setTimeout(r, 800));
    }

    setTesting(false);
  };

  const buttonClass = `ping-button ping-button--${flashState}`;

  return (
    <button
      onClick={runPingTest}
      disabled={testing}
      className={buttonClass}
    >
      {testing
        ? flashState === "success"
          ? "OK"
          : flashState === "error"
            ? "Fail"
            : "..."
        : "Ping"}
    </button>
  );
};

export default NetworkConfigList;
