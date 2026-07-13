import React from "react";
import { createRoot } from "react-dom/client";
import { PanelErrorBoundary } from "./_leaf-ui/components";
import { Panel } from "./components/Panel";
import "./_leaf-ui/index.css";
import "./vb-control.css";

const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <PanelErrorBoundary>
      <Panel />
    </PanelErrorBoundary>
  </React.StrictMode>
);
