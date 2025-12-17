import React, { useEffect } from "react";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { PatchSelector } from "./PatchSelector";
import { PatchStatus } from "./PatchStatus";
import { PresetManager } from "./PresetManager";
import { Bank } from "./Bank";
import { NetworkConfig } from "../../types";

export const Panel: React.FC = () => {
  const [presetName, setPresetName] = React.useState("New Preset");
  const [activeConnectionId, setActiveConnectionId] =
    React.useState<string>("");
  const [networkConfigs, setNetworkConfigs] = React.useState<NetworkConfig[]>(
    []
  );
  // patches state
  const [patches, setPatches] = React.useState<any[]>([]);

  useEffect(() => {
    const netRep = nodecg.Replicant<NetworkConfig[]>("networkConfigs");
    netRep.on("change", (val) => {
      if (val) {
        setNetworkConfigs(val);
        // Default to first connection if none selected or current one removed
        if (
          val.length > 0 &&
          (!activeConnectionId || !val.find((c) => c.id === activeConnectionId))
        ) {
          setActiveConnectionId(val[0].id);
        }
      }
    });

    const activePatchesRep = nodecg.Replicant<any[]>("activePatches");
    activePatchesRep.on("change", (val: any[]) => {
      if (val) setPatches(val);
    });
  }, [activeConnectionId]); // Add dependency if we need to react to ID change, but logic is inside handle

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

  const handleAddPatch = () => {
    if (!activeConnectionId) return;
    nodecg.sendMessage("addPatch", activeConnectionId);
  };

  const handleRemovePatch = (id: string) => {
    nodecg.sendMessage("removePatch", id);
  };

  const filteredPatches = patches.filter(
    (p) => p.connectionId === activeConnectionId
  );

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

        <div style={{ marginBottom: "10px" }}>
          <label style={{ fontWeight: "bold", marginRight: "10px" }}>
            Select Matrix:
          </label>
          <select
            value={activeConnectionId}
            onChange={(e) => setActiveConnectionId(e.target.value)}
            style={{ padding: "5px", fontSize: "1em" }}
          >
            {networkConfigs.length === 0 && (
              <option value="">No Configurations</option>
            )}
            {networkConfigs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.ip})
              </option>
            ))}
          </select>
        </div>

        {activeConnectionId ? (
          <div
            style={{
              border: "1px solid #ccc",
              padding: "10px",
              borderRadius: "4px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ margin: 0 }}>Patch Control</h3>
              <button
                onClick={handleAddPatch}
                style={{ fontSize: "1.2em", padding: "0 10px" }}
              >
                +
              </button>
            </div>

            {filteredPatches.length === 0 && (
              <div style={{ color: "#888", fontStyle: "italic" }}>
                No patches for this matrix.
              </div>
            )}

            {filteredPatches.map((patch, index) => (
              <div
                key={patch.id}
                style={{
                  borderTop: index > 0 ? "1px dashed #ccc" : "none",
                  paddingTop: index > 0 ? "10px" : "0",
                  position: "relative",
                }}
              >
                {index > 0 && (
                  <button
                    onClick={() => handleRemovePatch(patch.id)}
                    style={{
                      position: "absolute",
                      right: 0,
                      top: index > 0 ? "10px" : 0,
                      background: "none",
                      border: "none",
                      color: "red",
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    X
                  </button>
                )}
                <PatchSelector
                  patchId={patch.id}
                  connectionId={activeConnectionId}
                  status={patch}
                  onSelectionChange={() => {}}
                />
                <PatchStatus status={patch} />
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: "20px",
              textAlign: "center",
              color: "#666",
              border: "1px dashed #ccc",
            }}
          >
            Please add a Network Configuration in the dedicated panel.
          </div>
        )}

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
