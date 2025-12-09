import React from "react";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { NetworkConfig } from "./NetworkConfig";
import { PatchSelector } from "./PatchSelector";
import { PatchStatus } from "./PatchStatus";
import { PresetManager } from "./PresetManager";
import { Bank } from "./Bank";

export const Panel: React.FC = () => {
  const [presetName, setPresetName] = React.useState("New Preset");
  const [localIPs, setLocalIPs] = React.useState<string[]>([]);
  const [hasSelection, setHasSelection] = React.useState(false);

  React.useEffect(() => {
    const hostRep = nodecg.Replicant<{ ips: string[] }>("hostInfo");
    hostRep.on("change", (val: { ips: string[] } | undefined) => {
      if (val && val.ips) setLocalIPs(val.ips);
    });
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { over } = event;
    // If dropped over a bank slot
    if (over && over.id) {
      // Use the name from state
      nodecg.sendMessage("savePresetToBank", {
        slotId: over.id,
        name: presetName || "Untitled",
      });
    }
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div
        style={{
          padding: "10px",
          display: "flex",
          flexDirection: "column",
          gap: "15px",
        }}
      >
        <h2>VB Matrix Control</h2>

        <div
          style={{
            border: "1px solid #ccc",
            padding: "10px",
            borderRadius: "4px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3>Network Configuration</h3>
            <div
              style={{
                fontSize: "0.9em",
                color: "#d1d1d1ff",
                textAlign: "right",
              }}
            >
              {localIPs.length > 0
                ? localIPs.map((ip) => <div key={ip}>{ip}</div>)
                : "Loading..."}
            </div>
          </div>
          <NetworkConfig />
        </div>

        <div
          style={{
            border: "1px solid #ccc",
            padding: "10px",
            borderRadius: "4px",
          }}
        >
          <h3>Patch Control</h3>
          <PatchSelector onSelectionChange={setHasSelection} />
          <PatchStatus isSelectionComplete={hasSelection} />
        </div>

        <div style={{ display: "flex", gap: "20px" }}>
          <div
            style={{
              border: "1px solid #ccc",
              padding: "10px",
              borderRadius: "4px",
              flex: 1,
            }}
          >
            <h3>Preset Manager</h3>
            <PresetManager name={presetName} setName={setPresetName} />
          </div>

          <div
            style={{
              border: "1px solid #ccc",
              padding: "10px",
              borderRadius: "4px",
              flex: 2,
            }}
          >
            <h3>Preset Bank</h3>
            <Bank />
          </div>
        </div>
      </div>
    </DndContext>
  );
};
