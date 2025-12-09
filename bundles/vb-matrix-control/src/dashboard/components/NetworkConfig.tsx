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
    </div>
  );
};
