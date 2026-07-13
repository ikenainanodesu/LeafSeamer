import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { PanelErrorBoundary } from "./_leaf-ui/components";
import "./_leaf-ui/index.css";
import "./seamer-dashboard.css";

const root = createRoot(document.getElementById("root") as HTMLElement);

root.render(
  <React.StrictMode>
    <PanelErrorBoundary>
      <App />
    </PanelErrorBoundary>
  </React.StrictMode>
);
