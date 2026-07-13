import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { Trash2 } from "lucide-react";
import { IconButton } from "../_leaf-ui/components";
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
            <IconButton
              tone="danger"
              label={`Delete preset ${preset.name}`}
              icon={<Trash2 size={14} aria-hidden="true" />}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                nodecg.sendMessage("deletePreset", preset.id);
              }}
              onPointerDown={(e) => e.stopPropagation()}
            />
          </div>
        </>
      ) : (
        <span className="slot-empty">Empty Slot {index + 1}</span>
      )}
    </div>
  );
};
