/// <reference path="../../../../shared/types/global.d.ts" />
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  OBSState,
  OBSConnectionSettings,
  OBSConnectionStatus,
} from "../../../../shared/types/obs.types";
import { v4 as uuidv4 } from "uuid";
import "./obs-connection.css";

const ObsConnection = () => {
  const [connections, setConnections] = useState<OBSConnectionSettings[]>([]);
  const [statuses, setStatuses] = useState<Record<string, OBSConnectionStatus>>(
    {},
  );

  useEffect(() => {
    const obsConnectionsRep = nodecg.Replicant<OBSConnectionSettings[]>(
      "obsConnections",
      {
        defaultValue: [],
      },
    );

    // We changed the structure of obsStates to be a map keyed by ID
    const obsStatesRep = nodecg.Replicant<Record<string, OBSState>>(
      "obsStates",
      { defaultValue: {} },
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
      },
    );

    obsConnectionsRep.on(
      "change",
      (newVal: OBSConnectionSettings[] | undefined) => {
        if (newVal) {
          setConnections(JSON.parse(JSON.stringify(newVal)));
        }
      },
    );
  }, []);

  const updateSetting = (
    index: number,
    key: keyof OBSConnectionSettings,
    value: string,
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
    <div className="obs-conn-root">
      <div className="obs-conn-header">
        <h2>OBS Connections</h2>
        <button onClick={addConnection} className="obs-conn-add-btn">
          + Add Connection
        </button>
      </div>

      {connections.map((conn, index) => {
        const status = statuses[conn.id] || "disconnected";
        const isConnected = status === "connected";
        const isConnecting = status === "connecting";

        return (
          <div key={conn.id} className="obs-conn-card">
            <div className="obs-conn-card-header">
              <div className="obs-conn-card-title">
                <div
                  className={`obs-conn-status-dot ${
                    isConnected
                      ? "obs-conn-status-dot--connected"
                      : status === "error"
                        ? "obs-conn-status-dot--error"
                        : "obs-conn-status-dot--disconnected"
                  }`}
                />
                <strong>{conn.name || `Connection ${index + 1}`}</strong>
              </div>
              {index > 0 && (
                <button
                  onClick={() => removeConnection(index)}
                  className="obs-conn-remove-btn"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="obs-conn-input-row">
              <input
                type="text"
                placeholder="Name"
                value={conn.name || ""}
                onChange={(e) => updateSetting(index, "name", e.target.value)}
                className="obs-conn-input obs-conn-input--flex1"
              />
            </div>

            <div className="obs-conn-input-row">
              <input
                type="text"
                placeholder="IP Address"
                value={conn.host}
                onChange={(e) => updateSetting(index, "host", e.target.value)}
                disabled={isConnected || isConnecting}
                className="obs-conn-input obs-conn-input--flex2"
              />
              <input
                type="number"
                placeholder="Port"
                value={conn.port}
                onChange={(e) => updateSetting(index, "port", e.target.value)}
                disabled={isConnected || isConnecting}
                className="obs-conn-input obs-conn-input--flex1"
              />
            </div>
            <input
              type="password"
              placeholder="Password"
              value={conn.password || ""}
              onChange={(e) => updateSetting(index, "password", e.target.value)}
              disabled={isConnected || isConnecting}
              className="obs-conn-input obs-conn-input--full"
            />

            <div className="obs-conn-actions">
              {!isConnected ? (
                <button
                  onClick={() => handleConnect(conn)}
                  disabled={isConnecting}
                  className={`obs-conn-connect-btn ${
                    isConnecting
                      ? "obs-conn-connect-btn--connecting"
                      : "obs-conn-connect-btn--ready"
                  }`}
                >
                  {isConnecting ? "Connecting..." : "Connect"}
                </button>
              ) : (
                <button
                  onClick={() => handleDisconnect(conn.id)}
                  className="obs-conn-disconnect-btn"
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
