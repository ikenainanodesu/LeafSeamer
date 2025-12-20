import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import type { AtemSwitcherInfo } from "@shared/types/atem.types";
import AtemPanel from "./atem-panel";

declare const nodecg: any;

const AtemControl = () => {
  const [switchers, setSwitchers] = useState<AtemSwitcherInfo[]>([]);
  // We track an array of unique IDs for the panels.
  // Using Date.now() + index or just a counter for IDs.
  const [panelIds, setPanelIds] = useState<number[]>([Date.now()]);

  // Track list of switchers
  useEffect(() => {
    const switchersRep = nodecg.Replicant("atem:switchers");
    switchersRep.on("change", (newVal: AtemSwitcherInfo[]) => {
      if (newVal) {
        setSwitchers(newVal);
      }
    });
  }, []);

  const addPage = () => {
    setPanelIds((prev) => [...prev, Date.now()]);
  };

  const removePage = (idToRemove: number) => {
    setPanelIds((prev) => prev.filter((id) => id !== idToRemove));
  };

  if (switchers.length === 0) {
    return (
      <div style={{ color: "white", padding: 20 }}>
        No Active Connections. Please add a switcher in Connection panel.
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", color: "white", fontFamily: "sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={addPage}
          style={{
            padding: "10px 20px",
            background: "#2e7d32",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "14px",
          }}
        >
          + Add Page
        </button>
      </div>

      {panelIds.map((id) => (
        <AtemPanel
          key={id}
          switchers={switchers}
          onRemove={panelIds.length > 1 ? () => removePage(id) : undefined}
        />
      ))}
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<AtemControl />);
