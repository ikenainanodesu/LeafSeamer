import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { Preset } from "../../types";

interface BankSlotProps {
  id: string;
  preset?: Preset;
  index: number;
}

export const BankSlot: React.FC<BankSlotProps> = ({ id, preset, index }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: id,
  });

  const style = {
    width: "100px",
    height: "100px",
    border: "1px solid #ccc",
    backgroundColor: isOver ? "#e0e0e0" : "#fff",
    color: "#333",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "column" as const,
    padding: "5px",
  };

  return (
    <div ref={setNodeRef} style={style}>
      {preset ? (
        <>
          <strong>{preset.name}</strong>
          <span style={{ fontSize: "0.8em" }}>Bank {index + 1}</span>
          <div style={{ display: "flex", gap: "5px", marginTop: "5px" }}>
            <button
              onClick={() => nodecg.sendMessage("loadPreset", preset.id)}
              style={{ flex: 1 }}
            >
              Load
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation(); // Stop bubbling
                console.log("Delete button clicked for:", preset.id);
                // Temporarily removing confirm to verify click works
                // if (confirm("Delete this preset?")) {
                nodecg.sendMessage("deletePreset", preset.id);
                // }
              }}
              onPointerDown={(e) => e.stopPropagation()} // Prevent DnD interference
              style={{
                backgroundColor: "#ff4d4f",
                color: "white",
                border: "none",
                borderRadius: "3px",
                cursor: "pointer",
                padding: "5px 10px",
                zIndex: 10,
                position: "relative",
              }}
              title="Delete"
            >
              X
            </button>
          </div>
        </>
      ) : (
        <span style={{ color: "#ccc" }}>Empty Slot {index + 1}</span>
      )}
    </div>
  );
};
