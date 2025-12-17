import React, { useEffect, useState } from "react";
import { NetworkConfig } from "../../types";

export const NetworkConfigList: React.FC = () => {
  const [configs, setConfigs] = useState<NetworkConfig[]>([]);
  const [localIPs, setLocalIPs] = useState<string[]>([]);

  useEffect(() => {
    const rep = nodecg.Replicant<NetworkConfig[]>("networkConfigs", {
      defaultValue: [],
    });

    // First value load
    rep.on("change", (newVal) => {
      if (newVal) {
        setConfigs(newVal);
      }
    });

    const hostRep = nodecg.Replicant<{ ips: string[] }>("hostInfo");
    hostRep.on("change", (val) => {
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
    <div
      style={{
        padding: "10px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3>Network Configuration</h3>
        <div style={{ fontSize: "0.8em", color: "#888" }}>
          Local IPs: {localIPs.join(", ")}
        </div>
      </div>

      {configs.map((config) => (
        <NetworkConfigCard
          key={config.id}
          config={config}
          onUpdate={(updates) => handleUpdate(config.id, updates)}
          onRemove={() => handleRemove(config.id)}
        />
      ))}

      <button
        onClick={handleAdd}
        style={{
          padding: "10px",
          border: "2px dashed #ccc",
          backgroundColor: "transparent",
          cursor: "pointer",
          borderRadius: "4px",
          color: "#888",
        }}
      >
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
    <div
      style={{
        border: "1px solid #ccc",
        padding: "10px",
        borderRadius: "4px",
        position: "relative",
      }}
    >
      <button
        onClick={onRemove}
        style={{
          position: "absolute",
          top: "5px",
          right: "5px",
          background: "none",
          border: "none",
          color: "red",
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        X
      </button>

      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        <div style={{ marginBottom: "5px" }}>
          <input
            value={config.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            style={{
              fontWeight: "bold",
              border: "none",
              borderBottom: "1px solid #ccc",
              width: "100%",
            }}
            placeholder="Connection Name"
          />
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <label>
            IP:
            <input
              type="text"
              value={config.ip}
              onChange={(e) => onUpdate({ ip: e.target.value })}
              style={{ marginLeft: "5px", width: "110px" }}
            />
          </label>
          <label>
            Port:
            <input
              type="number"
              value={config.port}
              onChange={(e) =>
                onUpdate({ port: parseInt(e.target.value) || 0 })
              }
              style={{ marginLeft: "5px", width: "60px" }}
            />
          </label>
          <label>
            Stream:
            <input
              type="text"
              value={config.streamName}
              onChange={(e) => onUpdate({ streamName: e.target.value })}
              style={{ marginLeft: "5px", width: "80px" }}
            />
          </label>

          <PingTestButton configId={config.id} />
        </div>
      </div>
    </div>
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

  let bgColor = "#eee";
  if (flashState === "success") bgColor = "#52c41a";
  if (flashState === "error") bgColor = "#ff4d4f";

  return (
    <button
      onClick={runPingTest}
      disabled={testing}
      style={{
        backgroundColor: bgColor,
        color: flashState === "idle" ? "black" : "white",
        border: "1px solid #ccc",
        borderRadius: "4px",
        padding: "2px 8px",
        cursor: testing ? "default" : "pointer",
        minWidth: "60px",
      }}
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
