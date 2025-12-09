import React, { useState } from "react";
import { PresetDraggable } from "./PresetDraggable";

interface PresetManagerProps {
  name: string;
  setName: (name: string) => void;
}

export const PresetManager: React.FC<PresetManagerProps> = ({
  name,
  setName,
}) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Preset Name"
        style={{ width: "100%" }}
      />
      <PresetDraggable />
      <div style={{ fontSize: "0.8em", color: "#666" }}>
        Name and drag to Bank to save current state.
      </div>
    </div>
  );
};
