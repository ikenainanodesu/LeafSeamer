import React from "react";
import { createRoot } from "react-dom/client";
import { Panel } from "./components/Panel";
import "./vb-control.css";

const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <Panel />
  </React.StrictMode>
);
