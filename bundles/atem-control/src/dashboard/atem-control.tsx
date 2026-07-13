import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Plus } from "lucide-react";
import type { AtemSwitcherInfo } from "../types/atem.types";
import AtemPanel from "./atem-panel";
import {
  IconButton,
  PanelErrorBoundary,
  PanelHeader,
} from "./_leaf-ui/components";
import "./_leaf-ui/index.css";
import "./atem-dashboard.css";

declare const nodecg: any;

const AtemControl = () => {
  const [switchers, setSwitchers] = useState<AtemSwitcherInfo[]>([]);
  const [panelIds, setPanelIds] = useState<number[]>([Date.now()]);

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

  const addPage = () => {
    setPanelIds((prev) => [...prev, Date.now()]);
  };

  const removePage = (idToRemove: number) => {
    setPanelIds((prev) => prev.filter((id) => id !== idToRemove));
  };

  const hasConnectedSwitcher = switchers.some((switcher) => switcher.connected);

  return (
    <div className="atem-shell">
      <PanelHeader
        kicker="ATEM Control"
        title="Switcher Console"
        target={`${switchers.length} configured`}
        status={hasConnectedSwitcher ? "Connected" : "Disconnected"}
        statusTone={hasConnectedSwitcher ? "success" : "warning"}
        actions={
          <IconButton
            tone="primary"
            label="Add control page"
            icon={<Plus size={15} aria-hidden="true" />}
            onClick={addPage}
          />
        }
      />

      <main className="atem-content">
        {switchers.length === 0 ? (
          <div className="atem-empty-state">
            No active switchers. Configure a connection first.
          </div>
        ) : (
          panelIds.map((id) => (
            <AtemPanel
              key={id}
              switchers={switchers}
              onRemove={panelIds.length > 1 ? () => removePage(id) : undefined}
            />
          ))
        )}
      </main>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(
  <PanelErrorBoundary>
    <AtemControl />
  </PanelErrorBoundary>
);
