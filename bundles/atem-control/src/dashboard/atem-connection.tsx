import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Trash2 } from "lucide-react";
import type { AtemSwitcherInfo } from "../types/atem.types";
import {
  Button,
  ConfirmDialog,
  IconButton,
  PanelErrorBoundary,
  PanelHeader,
} from "./_leaf-ui/components";
import "./_leaf-ui/index.css";
import "./atem-dashboard.css";

declare const nodecg: any;

const AtemConnection = () => {
  const [ip, setIp] = useState("");
  const [switchers, setSwitchers] = useState<AtemSwitcherInfo[]>([]);
  const [pendingRemovalIp, setPendingRemovalIp] = useState<string | null>(null);

  useEffect(() => {
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

  const hasConnectedSwitcher = switchers.some((item) => item.connected);

  return (
    <div className="atem-shell">
      <PanelHeader
        kicker="ATEM Control"
        title="Switcher Connection"
        target={`${switchers.length} configured`}
        status={hasConnectedSwitcher ? "Connected" : "Disconnected"}
        statusTone={hasConnectedSwitcher ? "success" : "warning"}
      />

      <main className="atem-content">
        <form
          className="atem-connection-form"
          onSubmit={(event) => {
            event.preventDefault();
            handleConnect();
          }}
        >
          <label className="leaf-field">
            <span>Switcher IP Address</span>
            <input
              className="leaf-input"
              type="text"
              value={ip}
              onChange={(event) => setIp(event.target.value)}
              placeholder="192.168.1.50"
            />
          </label>
          <Button tone="primary" type="submit">
            Add Switcher
          </Button>
        </form>

        <div className="atem-switcher-list">
          {switchers.map((switcher) => (
            <article
              className="atem-switcher-card"
              data-connected={switcher.connected ? "true" : "false"}
              key={switcher.ip}
            >
              <div className="atem-switcher-card-heading">
                <div>
                  <h2>{switcher.alias || switcher.ip}</h2>
                  <div className="atem-switcher-ip">{switcher.ip}</div>
                </div>
                <IconButton
                  tone="danger"
                  label={`Remove switcher ${switcher.alias || switcher.ip}`}
                  icon={<Trash2 size={15} aria-hidden="true" />}
                  onClick={() => setPendingRemovalIp(switcher.ip)}
                />
              </div>
              <div className="atem-switcher-actions">
                <span
                  className="leaf-status"
                  data-tone={switcher.connected ? "success" : "warning"}
                >
                  {switcher.connected ? "Connected" : "Disconnected"}
                </span>
                {switcher.connected ? (
                  <Button onClick={() => handleDisconnect(switcher.ip)}>
                    Disconnect
                  </Button>
                ) : (
                  <Button onClick={() => nodecg.sendMessage("atem:connect", switcher.ip)}>
                    Connect
                  </Button>
                )}
              </div>
            </article>
          ))}
          {switchers.length === 0 ? (
            <div className="atem-empty-state">No switchers configured.</div>
          ) : null}
        </div>
      </main>

      <ConfirmDialog
        open={pendingRemovalIp !== null}
        title="Remove Switcher"
        message="This removes the selected switcher from this NodeCG instance."
        confirmLabel="Remove Switcher"
        onCancel={() => setPendingRemovalIp(null)}
        onConfirm={() => {
          if (pendingRemovalIp === null) return;
          nodecg.sendMessage("atem:remove", pendingRemovalIp);
          setPendingRemovalIp(null);
        }}
      />
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(
  <PanelErrorBoundary>
    <AtemConnection />
  </PanelErrorBoundary>
);
