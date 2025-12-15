import React, { useState, useEffect } from "react";
import { CurrentPatchStatus, DeviceInfo } from "../../types";

export const PatchSelector: React.FC<{
  patchId: string;
  status?: CurrentPatchStatus;
  onSelectionChange: (valid: boolean) => void;
}> = ({ patchId, status, onSelectionChange }) => {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);

  // Selection state
  const [inputDev, setInputDev] = useState("");
  const [inputCh, setInputCh] = useState(1);
  const [outputDev, setOutputDev] = useState("");
  const [outputCh, setOutputCh] = useState(1);

  useEffect(() => {
    // Listen to available devices Replicant
    const rep = nodecg.Replicant<DeviceInfo[]>("availableDevices");
    const handleChange = (val: DeviceInfo[]) => {
      if (val) setDevices(val);
    };
    rep.on("change", handleChange);

    // Trigger initial refresh
    nodecg.sendMessage("refreshDevices");

    return () => {
      rep.removeListener("change", handleChange);
    };
  }, []);

  const handleRefresh = () => {
    nodecg.sendMessage("refreshDevices");
  };

  // Sync with incoming status prop
  useEffect(() => {
    if (status) {
      if (status.inputDevice !== inputDev) setInputDev(status.inputDevice);
      if (status.inputChannel !== inputCh) setInputCh(status.inputChannel);
      if (status.outputDevice !== outputDev) setOutputDev(status.outputDevice);
      if (status.outputChannel !== outputCh) setOutputCh(status.outputChannel);
    }
  }, [status]);

  // Handle local changes
  useEffect(() => {
    const valid = !!(inputDev && outputDev);
    onSelectionChange(valid);

    // Only send update if we have a valid selection AND it differs from the prop (to avoid loops)
    // Actually, checking difference vs prop might be tricky if prop hasn't updated yet.
    // But since we are "controlling" this via local state + prop sync,
    // we should just send the message when the USER changes something.
    // The useEffect triggers on state change. We just need to make sure we don't trigger this when we programmatically set state from prop.
    // A simple way is to check if the new state matches the status. IF it matches, we don't need to send.

    // Check if current state matches the status prop
    const isSameAsProp =
      status &&
      status.inputDevice === inputDev &&
      status.inputChannel === inputCh &&
      status.outputDevice === outputDev &&
      status.outputChannel === outputCh;

    if (valid && !isSameAsProp) {
      nodecg.sendMessage("selectPatch", {
        id: patchId,
        inputDevice: inputDev,
        inputChannel: inputCh,
        outputDevice: outputDev,
        outputChannel: outputCh,
      });
    }
  }, [inputDev, inputCh, outputDev, outputCh]);

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
