import React from "react";
import { useDraggable } from "@dnd-kit/core";

export const PresetDraggable: React.FC = () => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: "new-preset",
    data: {
      type: "preset",
      source: "current",
    },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <div
        style={{
          padding: "10px",
          border: "1px dashed #666",
          backgroundColor: "#eee",
          color: "#333",
          cursor: "grab",
          textAlign: "center",
        }}
      >
        Drag Current State to Bank
      </div>
    </div>
  );
};
