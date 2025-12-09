import React, { useEffect, useState } from "react";
import { NetworkConfig as NetworkConfigType } from "../../types";

export const NetworkConfig: React.FC = () => {
  const [config, setConfig] = useState<NetworkConfigType>({
    ip: "127.0.0.1",
    port: 6980,
    streamName: "Command1",
  });

  useEffect(() => {
    // Connect to Replicant
    const rep = nodecg.Replicant<NetworkConfigType>("networkConfig");
    rep.on("change", (newVal: NetworkConfigType) => {
      if (newVal) setConfig(newVal);
    });
  }, []);

  const handleChange = (
    field: keyof NetworkConfigType,
    value: string | number
  ) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
    // Updating state immediately for UI responsiveness, ideally wait for Replicant

    nodecg.Replicant<NetworkConfigType>("networkConfig").value = newConfig;
  };

  return (
    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
      <label>
        IP:
        <input
          type="text"
          value={config.ip}
          onChange={(e) => handleChange("ip", e.target.value)}
          style={{ marginLeft: "5px", width: "120px" }}
        />
      </label>
      <label>
        Port:
        <input
          type="number"
          value={config.port}
          onChange={(e) => handleChange("port", parseInt(e.target.value) || 0)}
          style={{ marginLeft: "5px", width: "60px" }}
        />
      </label>
      <label>
        Stream Name:
        <input
          type="text"
          value={config.streamName}
          onChange={(e) => handleChange("streamName", e.target.value)}
          style={{ marginLeft: "5px" }}
        />
      </label>
      <PingTestButton />
    </div>
  );
};

const PingTestButton: React.FC = () => {
  const [flashState, setFlashState] = React.useState<
    "idle" | "success" | "error"
  >("idle");
  const [testing, setTesting] = React.useState(false);

  const runPingTest = async () => {
    if (testing) return;
    setTesting(true);

    for (let i = 0; i < 5; i++) {
      try {
        // Send Ping
        nodecg.sendMessage("ping");

        // Wait for response or timeout (500ms)
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Timeout"));
          }, 500);

          const listener = () => {
            clearTimeout(timeout);
            nodecg.unlisten("pingSuccess", listener);
            resolve();
          };

          // Note: In a real robust implementation, we might want a correlation ID,
          // but for this simple test, any success signal is "close enough".
          nodecg.listenFor("pingSuccess", listener);
        });

        // Success => Flash Green
        setFlashState("success");
      } catch (e) {
        // Error => Flash Red
        setFlashState("error");
      }

      // Keep color for a bit (200ms)
      await new Promise((r) => setTimeout(r, 200));
      setFlashState("idle");

      // Wait rest of interval (800ms to sum to ~1s total typically, or just wait 1s gap)
      if (i < 4) await new Promise((r) => setTimeout(r, 800));
    }

    setTesting(false);
  };

  let bgColor = "#eee";
  if (flashState === "success") bgColor = "#52c41a"; // Green
  if (flashState === "error") bgColor = "#ff4d4f"; // Red

  let label = "Ping Test";
  if (testing) {
    if (flashState === "success") label = "OK!!";
    else if (flashState === "error") label = "Fail";
    else label = "Testing...";
  }

  return (
    <button
      onClick={runPingTest}
      disabled={testing}
      style={{
        marginLeft: "5px",
        backgroundColor: bgColor,
        color: flashState === "idle" ? "black" : "white",
        transition: "background-color 0.1s",
        border: "1px solid #ccc",
        borderRadius: "4px",
        padding: "2px 8px",
        cursor: testing ? "default" : "pointer",
        width: "100px", // Fixed width to prevent size change
        textAlign: "center",
      }}
    >
      {label}
    </button>
  );
};
