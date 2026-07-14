import React, { useEffect, useRef, useState } from "react";
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
  PanelErrorBoundary,
  PanelHeader,
  ToastRegion,
  useToast,
} from "./_leaf-ui/components";
import "./_leaf-ui/index.css";
import "./obs-connection.css";
import { sendAuthenticatedCommand } from "../_leaf-core/security/authenticated-command-client";

type ConnectionAction = "save" | "connect" | "disconnect" | "remove";

const ObsConnection = () => {
  const [connections, setConnections] = useState<OBSConnectionDraft[]>([]);
  const [statuses, setStatuses] = useState<Record<string, OBSConnectionStatus>>(
    {},
  );
  const [pendingRemovalId, setPendingRemovalId] = useState<string | null>(null);
  const [pendingConnectionActions, setPendingConnectionActions] = useState<
    Partial<Record<string, ConnectionAction>>
  >({});
  const connectionCommandLockRef = useRef(new Set<string>());
  const isMountedRef = useRef(true);
  const addConnectionButtonRef = useRef<HTMLButtonElement>(null);
  const removeButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const focusAfterRemovalRef = useRef<{ neighborId: string | null } | null>(null);
  const focusFrameRef = useRef<number | null>(null);
  const pendingActions = Object.values(pendingConnectionActions);
  const isConnectionCommandPending = pendingActions.length > 0;
  const { items: toasts, pushToast } = useToast();
  const showCommandError = (error: unknown) => {
    if (!isMountedRef.current) return;
    pushToast(error instanceof Error ? error.message : String(error), "danger");
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (focusFrameRef.current !== null) {
        window.cancelAnimationFrame(focusFrameRef.current);
      }
    };
  }, []);

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

  const setRemoveButtonRef = (id: string, node: HTMLButtonElement | null) => {
    if (node) {
      removeButtonRefs.current.set(id, node);
    } else {
      removeButtonRefs.current.delete(id);
    }
  };

  useEffect(() => {
    const focusTarget = focusAfterRemovalRef.current;
    if (!focusTarget) return;
    // 等待删除后的 DOM 稳定，再聚焦相邻删除按钮或新增按钮。
    focusFrameRef.current = window.requestAnimationFrame(() => {
      const neighbor = focusTarget.neighborId
        ? removeButtonRefs.current.get(focusTarget.neighborId)
        : undefined;
      if (neighbor?.isConnected) {
        neighbor.focus();
      } else {
        addConnectionButtonRef.current?.focus();
      }
      focusAfterRemovalRef.current = null;
      focusFrameRef.current = null;
    });
    return () => {
      if (focusFrameRef.current !== null) {
        window.cancelAnimationFrame(focusFrameRef.current);
        focusFrameRef.current = null;
      }
    };
  }, [connections]);

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

  const runConnectionCommand = (
    connectionId: string,
    action: ConnectionAction,
    command: () => Promise<unknown>,
  ) => {
    if (connectionCommandLockRef.current.has(connectionId)) return;
    connectionCommandLockRef.current.add(connectionId);
    if (isMountedRef.current) {
      setPendingConnectionActions((current) => ({ ...current, [connectionId]: action }));
    }
    void command()
      .catch(showCommandError)
      .finally(() => {
        connectionCommandLockRef.current.delete(connectionId);
        if (isMountedRef.current) {
          setPendingConnectionActions((current) => {
            const next = { ...current };
            delete next[connectionId];
            return next;
          });
        }
      });
  };

  const saveConnection = async (conn: OBSConnectionDraft) => {
    await sendAuthenticatedCommand<OBSConnectionSettings>(
      "obs-control",
      "obs.saveConnection",
      conn,
    );
    if (isMountedRef.current) {
      setConnections((current) =>
        current.map((item) =>
          item.id === conn.id
            ? { ...item, password: "", clearPassword: false }
            : item,
        ),
      );
    }
  };

  const handleSave = (conn: OBSConnectionDraft) =>
    runConnectionCommand(conn.id, "save", () => saveConnection(conn));

  const handleConnect = (conn: OBSConnectionDraft) =>
    runConnectionCommand(conn.id, "connect", async () => {
      await saveConnection(conn);
      await sendAuthenticatedCommand("obs-control", "obs.connect", { id: conn.id });
    });

  const handleDisconnect = (id: string) =>
    runConnectionCommand(id, "disconnect", () =>
      sendAuthenticatedCommand("obs-control", "obs.disconnect", { id })
    );

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
    const removalIndex = connections.findIndex((connection) => connection.id === id);
    const connToRemove = connections[removalIndex];
    if (!connToRemove) return;
    const neighborId = connections[removalIndex + 1]?.id
      ?? (removalIndex > 1 ? connections[removalIndex - 1]?.id ?? null : null);
    runConnectionCommand(connToRemove.id, "remove", () =>
      sendAuthenticatedCommand("obs-control", "obs.removeConnection", {
        id: connToRemove.id,
      }).then(() => {
        if (isMountedRef.current) {
          focusAfterRemovalRef.current = { neighborId };
          setConnections((current) =>
            current.filter((item) => item.id !== connToRemove.id),
          );
        }
      })
    );
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
          <button
            ref={addConnectionButtonRef}
            type="button"
            className="leaf-button"
            data-tone="primary"
            onClick={addConnection}
          >
            <Plus size={15} aria-hidden="true" />
            Add Connection
          </button>
        }
      />

      <main className="obs-conn-content">
        <div className="obs-conn-list">
          {connections.map((conn, index) => {
            const status = statuses[conn.id] || "disconnected";
            const isConnected = status === "connected";
            const isConnecting = status === "connecting";
            const pendingAction = pendingConnectionActions[conn.id];
            const isThisConnectionPending = pendingAction !== undefined;

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
                    <button
                      ref={(node) => setRemoveButtonRef(conn.id, node)}
                      type="button"
                      className="leaf-button leaf-icon-button"
                      data-tone="danger"
                      aria-label={`Remove connection ${conn.name || index + 1}`}
                      title={`Remove connection ${conn.name || index + 1}`}
                      onClick={() => setPendingRemovalId(conn.id)}
                      disabled={isThisConnectionPending}
                      aria-busy={isThisConnectionPending}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
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
                  <Button
                    onClick={() => handleSave(conn)}
                    disabled={isThisConnectionPending}
                    aria-busy={isThisConnectionPending}
                    pending={pendingAction === "save"}
                    pendingLabel="Saving..."
                  >
                    Save
                  </Button>
                  {!isConnected ? (
                    <Button
                      tone="primary"
                      onClick={() => handleConnect(conn)}
                      disabled={isConnecting || isThisConnectionPending}
                      aria-busy={isThisConnectionPending}
                      pending={pendingAction === "connect"}
                      pendingLabel="Connecting..."
                    >
                      {isConnecting ? "Connecting..." : "Connect"}
                    </Button>
                  ) : (
                    <Button
                      tone="danger"
                      onClick={() => handleDisconnect(conn.id)}
                      disabled={isThisConnectionPending}
                      aria-busy={isThisConnectionPending}
                      pending={pendingAction === "disconnect"}
                      pendingLabel="Disconnecting..."
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
        {isConnectionCommandPending ? (
          <p className="obs-conn-pending" role="status" aria-live="polite">
            {pendingActions.includes("remove") ? "Removing connection..." : "Command in progress..."}
          </p>
        ) : null}
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
