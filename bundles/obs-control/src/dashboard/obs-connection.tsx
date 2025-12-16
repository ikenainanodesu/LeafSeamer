/// <reference path="../../../../shared/types/global.d.ts" />
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  OBSState,
  OBSConnectionSettings,
  OBSConnectionStatus,
} from "../../../../shared/types/obs.types";
import { v4 as uuidv4 } from "uuid";

const ObsConnection = () => {
  const [connections, setConnections] = useState<OBSConnectionSettings[]>([]);
  const [statuses, setStatuses] = useState<Record<string, OBSConnectionStatus>>(
    {}
  );

  useEffect(() => {
    const obsConnectionsRep = nodecg.Replicant<OBSConnectionSettings[]>(
      "obsConnections",
      {
        defaultValue: [],
      }
    );

    // We changed the structure of obsStates to be a map keyed by ID
    const obsStatesRep = nodecg.Replicant<Record<string, OBSState>>(
      "obsStates",
      { defaultValue: {} }
    );

    obsStatesRep.on(
      "change",
      (newVal: Record<string, OBSState> | undefined) => {
        if (newVal) {
          const newStatuses: Record<string, OBSConnectionStatus> = {};
          Object.keys(newVal).forEach((key) => {
            newStatuses[key] = newVal[key].status;
          });
          setStatuses(newStatuses);
        }
      }
    );

    obsConnectionsRep.on(
      "change",
      (newVal: OBSConnectionSettings[] | undefined) => {
        if (newVal) {
          setConnections(JSON.parse(JSON.stringify(newVal)));
        }
      }
    );
  }, []);

  const updateSetting = (
    index: number,
    key: keyof OBSConnectionSettings,
    value: string
  ) => {
    const newConnections = [...connections];
    newConnections[index] = { ...newConnections[index], [key]: value };
    setConnections(newConnections);
    nodecg.Replicant("obsConnections").value = newConnections;
  };

  const handleConnect = (conn: OBSConnectionSettings) => {
    nodecg.sendMessageToBundle("connectOBS", "obs-control", conn);
  };

  const handleDisconnect = (id: string) => {
    nodecg.sendMessageToBundle("disconnectOBS", "obs-control", { id });
  };

  const addConnection = () => {
    const newConn: OBSConnectionSettings = {
      id: uuidv4(),
      name: `OBS ${connections.length + 1}`,
      host: "localhost",
      port: "4455",
      password: "",
    };
    const newConnections = [...connections, newConn];
    setConnections(newConnections);
    nodecg.Replicant("obsConnections").value = newConnections;
  };

  const removeConnection = (index: number) => {
    const connToRemove = connections[index];
    // Disconnect first if connected
    handleDisconnect(connToRemove.id);

    const newConnections = connections.filter((_, i) => i !== index);
    setConnections(newConnections);
    nodecg.Replicant("obsConnections").value = newConnections;
  };

  return (
    <div style={{ padding: "10px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "15px",
        }}
      >
        <h2 style={{ margin: 0 }}>OBS Connections</h2>
        <button
          onClick={addConnection}
          style={{
            padding: "5px 10px",
            backgroundColor: "#4caf50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          + Add Connection
        </button>
      </div>

      {connections.map((conn, index) => {
        const status = statuses[conn.id] || "disconnected";
        const isConnected = status === "connected";
        const isConnecting = status === "connecting";

        return (
          <div
            key={conn.id}
            style={{
              marginBottom: "15px",
              padding: "10px",
              border: "1px solid #555",
              borderRadius: "5px",
              backgroundColor: "#333",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    backgroundColor: isConnected
                      ? "#4caf50"
                      : status === "error"
                        ? "#f44336"
                        : "#757575",
                    marginRight: "8px",
                  }}
                />
                <strong>{conn.name || `Connection ${index + 1}`}</strong>
              </div>
              {index > 0 && (
                <button
                  onClick={() => removeConnection(index)}
                  style={{
                    backgroundColor: "transparent",
                    color: "#f44336",
                    border: "1px solid #f44336",
                    borderRadius: "3px",
                    cursor: "pointer",
                    fontSize: "0.8em",
                  }}
                >
                  Remove
                </button>
              )}
            </div>

            <div style={{ display: "flex", gap: "5px", marginBottom: "5px" }}>
              <input
                type="text"
                placeholder="Name"
                value={conn.name || ""}
                onChange={(e) => updateSetting(index, "name", e.target.value)}
                style={{
                  padding: "5px",
                  flex: 1,
                  backgroundColor: "#222",
                  border: "1px solid #444",
                  color: "white",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "5px", marginBottom: "5px" }}>
              <input
                type="text"
                placeholder="IP Address"
                value={conn.host}
                onChange={(e) => updateSetting(index, "host", e.target.value)}
                disabled={isConnected || isConnecting}
                style={{
                  padding: "5px",
                  flex: 2,
                  backgroundColor: "#222",
                  border: "1px solid #444",
                  color: "white",
                }}
              />
              <input
                type="number"
                placeholder="Port"
                value={conn.port}
                onChange={(e) => updateSetting(index, "port", e.target.value)}
                disabled={isConnected || isConnecting}
                style={{
                  padding: "5px",
                  flex: 1,
                  backgroundColor: "#222",
                  border: "1px solid #444",
                  color: "white",
                }}
              />
            </div>
            <input
              type="password"
              placeholder="Password"
              value={conn.password || ""}
              onChange={(e) => updateSetting(index, "password", e.target.value)}
              disabled={isConnected || isConnecting}
              style={{
                padding: "5px",
                width: "100%",
                marginBottom: "10px",
                backgroundColor: "#222",
                border: "1px solid #444",
                color: "white",
              }}
            />

            <div style={{ display: "flex" }}>
              {!isConnected ? (
                <button
                  onClick={() => handleConnect(conn)}
                  disabled={isConnecting}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: isConnecting ? "#aaa" : "#2196f3",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: isConnecting ? "default" : "pointer",
                    width: "100%",
                  }}
                >
                  {isConnecting ? "Connecting..." : "Connect"}
                </button>
              ) : (
                <button
                  onClick={() => handleDisconnect(conn.id)}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#f44336",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  Disconnect
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<ObsConnection />);
