import React, { useState, useEffect } from "react";
import { DeviceInfo } from "../../types";

export const PatchSelector: React.FC<{
  onSelectionChange: (valid: boolean) => void;
}> = ({ onSelectionChange }) => {
  // These would ideally come from a Replicant, mocked for now or empty
  const [devices, setDevices] = useState<DeviceInfo[]>([]);

  // Selection state
  const [inputDev, setInputDev] = useState("");
  const [inputCh, setInputCh] = useState(1);
  const [outputDev, setOutputDev] = useState("");
  const [outputCh, setOutputCh] = useState(1);

  useEffect(() => {
    // Listen to available devices Replicant
    const rep = nodecg.Replicant<DeviceInfo[]>("availableDevices");
    rep.on("change", (val: DeviceInfo[]) => {
      if (val) setDevices(val);
    });

    // Trigger initial refresh
    handleRefresh();
  }, []);

  const handleRefresh = () => {
    nodecg.sendMessage("refreshDevices");
  };

  useEffect(() => {
    const valid = !!(inputDev && outputDev);
    onSelectionChange(valid);

    if (valid) {
      handleSelectPatch();
    }
  }, [inputDev, inputCh, outputDev, outputCh]);

  const handleSelectPatch = () => {
    // Tell backend to select this patch for control
    nodecg.sendMessage("selectPatch", {
      inputDevice: inputDev,
      inputChannel: inputCh,
      outputDevice: outputDev,
      outputChannel: outputCh,
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ display: "flex", gap: "10px" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <label>Input Device</label>
          <select
            onMouseDown={handleRefresh}
            value={inputDev}
            onChange={(e) => setInputDev(e.target.value)}
          >
            <option value="">Select Device</option>
            {devices
              .filter((d) => d.inputs > 0)
              .map((d) => (
                <option key={d.suid} value={d.suid}>
                  {d.name || d.suid}
                </option>
              ))}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <label>Ch</label>
          <select
            value={inputCh}
            onChange={(e) => setInputCh(parseInt(e.target.value))}
          >
            {devices.find((d) => d.suid === inputDev) &&
              [
                ...Array(devices.find((d) => d.suid === inputDev)?.inputs || 8),
              ].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            {!inputDev &&
              [...Array(8)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
          </select>
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <label>Output Device</label>
          <select
            onMouseDown={handleRefresh}
            value={outputDev}
            onChange={(e) => setOutputDev(e.target.value)}
          >
            <option value="">Select Device</option>
            {devices
              .filter((d) => d.outputs > 0)
              .map((d) => (
                <option key={d.suid} value={d.suid}>
                  {d.name || d.suid}
                </option>
              ))}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <label>Ch</label>
          <select
            value={outputCh}
            onChange={(e) => setOutputCh(parseInt(e.target.value))}
          >
            {devices.find((d) => d.suid === outputDev) &&
              [
                ...Array(
                  devices.find((d) => d.suid === outputDev)?.outputs || 8
                ),
              ].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            {!outputDev &&
              [...Array(8)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
          </select>
        </div>
      </div>
    </div>
  );
};
