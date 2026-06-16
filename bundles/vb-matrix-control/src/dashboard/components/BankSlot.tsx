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

  const className = `bank-slot ${isOver ? "is-over" : ""} ${
    preset ? "is-filled" : ""
  }`;

  return (
    <div ref={setNodeRef} className={className}>
      {preset ? (
        <>
          <strong className="slot-name">{preset.name}</strong>
          <span className="slot-label">Bank {index + 1}</span>
          <div className="slot-actions">
            <button
              onClick={() => nodecg.sendMessage("loadPreset", preset.id)}
              className="control-button"
            >
              Load
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                nodecg.sendMessage("deletePreset", preset.id);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="icon-button icon-button--danger"
              title="Delete preset"
              aria-label={`Delete preset ${preset.name}`}
            >
              X
            </button>
          </div>
        </>
      ) : (
        <span className="slot-empty">Empty Slot {index + 1}</span>
      )}
    </div>
  );
};
