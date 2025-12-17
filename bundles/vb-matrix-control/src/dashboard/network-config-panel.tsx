import React from "react";
import { createRoot } from "react-dom/client";
import NetworkConfigList from "./components/NetworkConfigList";

const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <NetworkConfigList />
  </React.StrictMode>
);
