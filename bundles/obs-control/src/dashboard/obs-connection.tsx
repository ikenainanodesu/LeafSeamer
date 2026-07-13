import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  OBSState,
  OBSConnectionDraft,
  OBSConnectionSettings,
  OBSConnectionStatus,
} from "../types/obs.types";
import { v4 as uuidv4 } from "uuid";
import "./obs-connection.css";
import { sendAuthenticatedCommand } from "../_leaf-core/security/authenticated-command-client";

const ObsConnection = () => {
  const [connections, setConnections] = useState<OBSConnectionDraft[]>([]);
  const [statuses, setStatuses] = useState<Record<string, OBSConnectionStatus>>(
    {},
  );
  const showCommandError = (error: unknown) => {
    window.alert(error instanceof Error ? error.message : String(error));
  };

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
          setConnections((current) =>
            newVal.map((connection) => {
              const draft = current.find((item) => item.id === connection.id);
              return {
                ...connection,
                password: draft?.password ?? "",
                clearPassword: draft?.clearPassword ?? false,
              };
            })
          );
        }
      },
    );
  }, []);

  const updateSetting = (
    index: number,
    key: keyof OBSConnectionDraft,
    value: string | boolean,
  ) => {
    setConnections((current) => {
      const next = [...current];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const handleSave = async (conn: OBSConnectionDraft) => {
    await sendAuthenticatedCommand<OBSConnectionSettings>(
      "obs-control",
      "obs.saveConnection",
      conn
    );
    setConnections((current) =>
      current.map((item) =>
        item.id === conn.id
          ? { ...item, password: "", clearPassword: false }
          : item
      )
    );
  };

  const handleConnect = async (conn: OBSConnectionDraft) => {
    await handleSave(conn);
    await sendAuthenticatedCommand("obs-control", "obs.connect", {
      id: conn.id,
    });
  };

  const handleDisconnect = (id: string) =>
    sendAuthenticatedCommand("obs-control", "obs.disconnect", { id });

  const addConnection = () => {
    const newConn: OBSConnectionDraft = {
      id: uuidv4(),
      name: `OBS ${connections.length + 1}`,
      host: "localhost",
      port: "4455",
      password: "",
      passwordConfigured: false,
    };
    const newConnections = [...connections, newConn];
    setConnections(newConnections);
  };

  const removeConnection = (index: number) => {
    const connToRemove = connections[index];
    void sendAuthenticatedCommand("obs-control", "obs.removeConnection", {
        id: connToRemove.id,
      })
      .then(() => {
        setConnections((current) =>
          current.filter((item) => item.id !== connToRemove.id)
        );
      })
      .catch(showCommandError);
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
              placeholder={
                conn.passwordConfigured
                  ? "Password configured; leave blank to keep"
                  : "Password"
              }
              value={conn.password || ""}
              onChange={(event) => {
                updateSetting(index, "password", event.target.value);
                if (event.target.value.length > 0) {
                  updateSetting(index, "clearPassword", false);
                }
              }}
              disabled={isConnected || isConnecting}
              className="obs-conn-input obs-conn-input--full"
            />
            {conn.passwordConfigured && (
              <label className="obs-conn-secret-clear">
                <input
                  type="checkbox"
                  checked={conn.clearPassword === true}
                  onChange={(event) =>
                    updateSetting(
                      index,
                      "clearPassword",
                      event.target.checked
                    )
                  }
                />
                Clear saved password
              </label>
            )}

            <div className="obs-conn-actions">
              <button
                onClick={() => void handleSave(conn).catch(showCommandError)}
                className="obs-conn-save-btn"
              >
                Save
              </button>
              {!isConnected ? (
                <button
                  onClick={() => void handleConnect(conn).catch(showCommandError)}
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
                  onClick={() =>
                    void handleDisconnect(conn.id).catch(showCommandError)
                  }
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
