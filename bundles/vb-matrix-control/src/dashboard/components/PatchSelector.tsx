import React, { useState, useEffect } from "react";
import { CurrentPatchStatus, DeviceInfo } from "../../types";

const getPointDevice = (device: DeviceInfo) => device.pointDevice || device.suid;

export const PatchSelector: React.FC<{
  patchId: string;
  connectionId: string;
  status?: CurrentPatchStatus;
  onSelectionChange: (valid: boolean) => void;
}> = ({ patchId, connectionId, status, onSelectionChange }) => {
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
      // Include connectionId in message implicitly by using the patch ID which backend knows about?
      // Actually, backend needs connectionId if it's a new patch or if we want to change connection (which we don't allow here).
      // But for safety, we should assume the backend knows the patch's connectionId from activePatches Replicant,
      // OR we send it for validation.
      // Let's rely on patch ID mostly, but sending everything is safer.
      nodecg.sendMessage("selectPatch", {
        id: patchId,
        connectionId: connectionId, // Added connectionId
        inputDevice: inputDev,
        inputChannel: inputCh,
        outputDevice: outputDev,
        outputChannel: outputCh,
      });
    }
  }, [inputDev, inputCh, outputDev, outputCh, connectionId]);

  // Filter devices by connectionId
  const connectionDevices = devices.filter(
    (d) => d.connectionId === connectionId
  );
  const inputDevice = connectionDevices.find(
    (d) => getPointDevice(d) === inputDev && d.inputs > 0
  );
  const outputDevice = connectionDevices.find(
    (d) => getPointDevice(d) === outputDev && d.outputs > 0
  );

  return (
    <div className="patch-selector">
      <div className="selector-row">
        <label className="field">
          <span>Input Device</span>
          <select
            onMouseDown={handleRefresh}
            value={inputDev}
            onChange={(e) => setInputDev(e.target.value)}
            className="vb-select"
          >
            <option value="">Select Device</option>
            {connectionDevices
              .filter((d) => d.inputs > 0)
              .map((d) => (
                <option key={d.suid} value={getPointDevice(d)}>
                  {d.name || d.suid}
                </option>
              ))}
          </select>
        </label>
        <label className="field">
          <span>Ch</span>
          <select
            value={inputCh}
            onChange={(e) => setInputCh(parseInt(e.target.value))}
            className="vb-select"
          >
            {inputDevice &&
              [...Array(inputDevice.inputs || 8)].map((_, i) => (
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
        </label>
      </div>

      <div className="selector-row">
        <label className="field">
          <span>Output Device</span>
          <select
            onMouseDown={handleRefresh}
            value={outputDev}
            onChange={(e) => setOutputDev(e.target.value)}
            className="vb-select"
          >
            <option value="">Select Device</option>
            {connectionDevices
              .filter((d) => d.outputs > 0)
              .map((d) => (
                <option key={d.suid} value={getPointDevice(d)}>
                  {d.name || d.suid}
                </option>
              ))}
          </select>
        </label>
        <label className="field">
          <span>Ch</span>
          <select
            value={outputCh}
            onChange={(e) => setOutputCh(parseInt(e.target.value))}
            className="vb-select"
          >
            {outputDevice &&
              [...Array(outputDevice.outputs || 8)].map((_, i) => (
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
        </label>
      </div>
    </div>
  );
};
