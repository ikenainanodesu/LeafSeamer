import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import type {
  AtemSwitcherInfo,
  DiscoveredSwitcher,
} from "@shared/types/atem.types";

// Declare NodeCG Types (global)
declare const nodecg: any;
declare const NodeCG: any;

const AtemConnection = () => {
  const [ip, setIp] = useState("");
  const [switchers, setSwitchers] = useState<AtemSwitcherInfo[]>([]);

  useEffect(() => {
    // Replicant subscription
    const switchersRep = nodecg.Replicant("atem:switchers");

    const updateSwitchers = (newVal: AtemSwitcherInfo[]) => {
      if (newVal) setSwitchers(newVal);
    };

    switchersRep.on("change", updateSwitchers);

    return () => {
      switchersRep.removeListener("change", updateSwitchers);
    };
  }, []);

  const handleConnect = () => {
    if (!ip) return;
    nodecg.sendMessage("atem:connect", ip);
    setIp("");
  };

  const handleDisconnect = (ipStr: string) => {
    nodecg.sendMessage("atem:disconnect", ipStr);
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h2>ATEM Switcher Connection</h2>

      <div
        style={{
          marginBottom: "20px",
          background: "#444",
          padding: "15px",
          borderRadius: "8px",
        }}
      >
        <h3>Add Switcher by IP</h3>
        <input
          type="text"
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          placeholder="192.168.1.50"
          style={{ padding: "8px", marginRight: "10px", width: "200px" }}
        />
        <button
          onClick={handleConnect}
          style={{
            padding: "8px 16px",
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Connect
        </button>
      </div>

      {/* TODO: Discovery Dropdown (Simulated for now as feature request mentioned "if possible") */}

      <div
        style={{
          display: "grid",
          gap: "15px",
          gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
        }}
      >
        {switchers.map((switcher) => (
          <div
            key={switcher.ip}
            style={{
              background: "#333",
              padding: "15px",
              borderRadius: "8px",
              borderLeft: switcher.connected
                ? "5px solid #28a745"
                : "5px solid #dc3545",
            }}
          >
            <h4 style={{ margin: "0 0 10px 0" }}>
              {switcher.alias || switcher.ip}
            </h4>
            <p style={{ margin: "0 0 10px 0", color: "#888" }}>
              Status:{" "}
              <span
                style={{
                  color: switcher.connected ? "#28a745" : "#dc3545",
                  fontWeight: "bold",
                }}
              >
                {switcher.connected ? "Connected" : "Disconnected"}
              </span>
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              {!switcher.connected && (
                <button
                  onClick={() =>
                    nodecg.sendMessage("atem:connect", switcher.ip)
                  }
                  style={{
                    padding: "5px 10px",
                    background: "#28a745",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Connect
                </button>
              )}
              {switcher.connected && (
                <button
                  onClick={() => handleDisconnect(switcher.ip)}
                  style={{
                    padding: "5px 10px",
                    background: "#d39e00", // Yellowish/Orange for disconnect to warn
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Disconnect
                </button>
              )}
              <button
                onClick={() => nodecg.sendMessage("atem:remove", switcher.ip)}
                style={{
                  padding: "5px 10px",
                  background: "#dc3545", // Red for delete
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<AtemConnection />);
