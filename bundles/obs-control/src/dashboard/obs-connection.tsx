import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Plus, Trash2 } from "lucide-react";
import {
  OBSState,
  OBSConnectionDraft,
  OBSConnectionSettings,
  OBSConnectionStatus,
} from "../types/obs.types";
import { v4 as uuidv4 } from "uuid";
import {
  Button,
  ConfirmDialog,
  Disclosure,
  IconButton,
  PanelErrorBoundary,
  PanelHeader,
  ToastRegion,
  useToast,
} from "./_leaf-ui/components";
import "./_leaf-ui/index.css";
import "./obs-connection.css";
import { sendAuthenticatedCommand } from "../_leaf-core/security/authenticated-command-client";

const ObsConnection = () => {
  const [connections, setConnections] = useState<OBSConnectionDraft[]>([]);
  const [statuses, setStatuses] = useState<Record<string, OBSConnectionStatus>>(
    {},
  );
  const [pendingRemovalId, setPendingRemovalId] = useState<string | null>(null);
  const { items: toasts, pushToast } = useToast();
  const showCommandError = (error: unknown) => {
    pushToast(error instanceof Error ? error.message : String(error), "danger");
  };

  useEffect(() => {
    const obsConnectionsRep = nodecg.Replicant<OBSConnectionSettings[]>(
      "obsConnections",
      {
        defaultValue: [],
      },
    );

    // obsStates 以连接 ID 为键保存状态。
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
            }),
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
      conn,
    );
    setConnections((current) =>
      current.map((item) =>
        item.id === conn.id
          ? { ...item, password: "", clearPassword: false }
          : item,
      ),
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
    setConnections([...connections, newConn]);
  };

  const removeConnection = (id: string) => {
    const connToRemove = connections.find((connection) => connection.id === id);
    if (!connToRemove) return;
    void sendAuthenticatedCommand("obs-control", "obs.removeConnection", {
      id: connToRemove.id,
    })
      .then(() => {
        setConnections((current) =>
          current.filter((item) => item.id !== connToRemove.id),
        );
      })
      .catch(showCommandError);
  };

  const connectedCount = connections.filter(
    (connection) => statuses[connection.id] === "connected",
  ).length;

  return (
    <div className="obs-conn-shell">
      <PanelHeader
        kicker="OBS Control"
        title="OBS Connection"
        target={`${connections.length} configured`}
        status={connectedCount > 0 ? `${connectedCount} Online` : "Offline"}
        statusTone={connectedCount > 0 ? "success" : "warning"}
        actions={
          <Button tone="primary" onClick={addConnection}>
            <Plus size={15} aria-hidden="true" />
            Add Connection
          </Button>
        }
      />

      <main className="obs-conn-content">
        <div className="obs-conn-list">
          {connections.map((conn, index) => {
            const status = statuses[conn.id] || "disconnected";
            const isConnected = status === "connected";
            const isConnecting = status === "connecting";

            return (
              <article key={conn.id} className="obs-conn-card">
                <div className="obs-conn-card-header">
                  <div>
                    <h2>{conn.name || `Connection ${index + 1}`}</h2>
                    <span
                      className="leaf-status"
                      data-tone={
                        isConnected ? "success" : status === "error" ? "danger" : "warning"
                      }
                    >
                      {isConnected ? "Online" : isConnecting ? "Connecting" : "Offline"}
                    </span>
                  </div>
                  {index > 0 ? (
                    <IconButton
                      tone="danger"
                      label={`Remove connection ${conn.name || index + 1}`}
                      icon={<Trash2 size={15} aria-hidden="true" />}
                      onClick={() => setPendingRemovalId(conn.id)}
                    />
                  ) : null}
                </div>

                <Disclosure
                  title="Connection"
                  summary={`${conn.host}:${conn.port}`}
                  defaultOpen
                  storageKey={`obs.${conn.id}.connection`}
                >
                  <div className="obs-conn-fields">
                    <label className="leaf-field">
                      <span>Name</span>
                      <input
                        className="leaf-input"
                        type="text"
                        placeholder="Name"
                        value={conn.name || ""}
                        onChange={(event) => updateSetting(index, "name", event.target.value)}
                      />
                    </label>
                    <label className="leaf-field">
                      <span>Host</span>
                      <input
                        className="leaf-input"
                        type="text"
                        placeholder="IP Address"
                        value={conn.host}
                        onChange={(event) => updateSetting(index, "host", event.target.value)}
                        disabled={isConnected || isConnecting}
                      />
                    </label>
                    <label className="leaf-field">
                      <span>Port</span>
                      <input
                        className="leaf-input"
                        type="number"
                        placeholder="Port"
                        value={conn.port}
                        onChange={(event) => updateSetting(index, "port", event.target.value)}
                        disabled={isConnected || isConnecting}
                      />
                    </label>
                    <label className="leaf-field obs-conn-password-field">
                      <span>WebSocket Password</span>
                      <input
                        className="leaf-input"
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
                      />
                    </label>
                    {conn.passwordConfigured ? (
                      <label className="obs-secret-clear">
                        <input
                          type="checkbox"
                          checked={conn.clearPassword === true}
                          onChange={(event) =>
                            updateSetting(index, "clearPassword", event.target.checked)
                          }
                        />
                        Clear saved password
                      </label>
                    ) : null}
                  </div>
                </Disclosure>

                <div className="obs-conn-actions">
                  <Button onClick={() => void handleSave(conn).catch(showCommandError)}>
                    Save
                  </Button>
                  {!isConnected ? (
                    <Button
                      tone="primary"
                      onClick={() => void handleConnect(conn).catch(showCommandError)}
                      disabled={isConnecting}
                    >
                      {isConnecting ? "Connecting..." : "Connect"}
                    </Button>
                  ) : (
                    <Button
                      tone="danger"
                      onClick={() => void handleDisconnect(conn.id).catch(showCommandError)}
                    >
                      Disconnect
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
          {connections.length === 0 ? (
            <div className="obs-conn-empty">No OBS connections configured.</div>
          ) : null}
        </div>
      </main>

      <ConfirmDialog
        open={pendingRemovalId !== null}
        title="Remove Connection"
        message="This permanently removes the selected OBS connection and its saved secrets."
        confirmLabel="Remove Connection"
        onCancel={() => setPendingRemovalId(null)}
        onConfirm={() => {
          if (pendingRemovalId === null) return;
          removeConnection(pendingRemovalId);
          setPendingRemovalId(null);
        }}
      />
      <ToastRegion items={toasts} />
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(
  <PanelErrorBoundary>
    <ObsConnection />
  </PanelErrorBoundary>,
);
