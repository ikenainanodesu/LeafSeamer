import React from "react";
import { createRoot } from "react-dom/client";
import NetworkConfigList from "./components/NetworkConfigList";
import { PanelErrorBoundary } from "./_leaf-ui/components";
import "./_leaf-ui/index.css";
import "./vb-control.css";

const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <PanelErrorBoundary>
      <NetworkConfigList />
    </PanelErrorBoundary>
  </React.StrictMode>
);
