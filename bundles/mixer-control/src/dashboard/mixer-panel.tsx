import React from "react";
import { createRoot } from "react-dom/client";
import MixerControlPanel from "./mixer-control-panel";
import OutputControlPanel from "./output-control-panel";
import {
  Disclosure,
  PanelErrorBoundary,
} from "./_leaf-ui/components";
import "./_leaf-ui/index.css";
import "./mixer-dashboard.css";

const MixerPanel = () => {
  return (
    <div className="mixer-shell">
      <Disclosure title="Input Channels" defaultOpen storageKey="mixer.inputs.open">
        <MixerControlPanel />
      </Disclosure>
      <Disclosure title="Output Channels" defaultOpen storageKey="mixer.outputs.open">
        <OutputControlPanel />
      </Disclosure>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(
  <PanelErrorBoundary>
    <MixerPanel />
  </PanelErrorBoundary>
);
