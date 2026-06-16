import React from "react";
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
    <div className="preset-manager">
      <label className="field">
        <span>Preset Name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Preset Name"
          className="vb-input"
        />
      </label>
      <PresetDraggable />
      <p className="preset-help">
        Name and drag to Bank to save current state.
      </p>
    </div>
  );
};
