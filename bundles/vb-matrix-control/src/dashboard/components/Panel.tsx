import React from "react";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { NetworkConfig } from "./NetworkConfig";
import { PatchSelector } from "./PatchSelector";
import { PatchStatus } from "./PatchStatus";
import { PresetManager } from "./PresetManager";
import { Bank } from "./Bank";

export const Panel: React.FC = () => {
  const [presetName, setPresetName] = React.useState("New Preset");

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
          <h3>Network Configuration</h3>
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
          <PatchSelector />
          <PatchStatus />
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
