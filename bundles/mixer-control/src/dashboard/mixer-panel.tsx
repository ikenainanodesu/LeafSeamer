/// <reference path="../../../../shared/types/global.d.ts" />
import React from "react";
import { createRoot } from "react-dom/client";
import MixerControlPanel from "./mixer-control-panel";
import OutputControlPanel from "./output-control-panel";

const MixerPanel = () => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ borderBottom: "1px solid #555", paddingBottom: "20px" }}>
        <h2 style={{ margin: "0 0 10px 0", color: "#eee" }}>Input Channels</h2>
        <MixerControlPanel />
      </div>
      <div>
        <h2 style={{ margin: "0 0 10px 0", color: "#eee" }}>Output Channels</h2>
        <OutputControlPanel />
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<MixerPanel />);
