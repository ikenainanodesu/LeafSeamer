import React from "react";
import { CurrentPatchStatus } from "../../types";

export const PatchStatus: React.FC<{ status: CurrentPatchStatus }> = ({
  status,
}) => {
  // Removed local state and replicant subscription as we receive status from props

  const updateGain = (delta: number) => {
    if (!status || !status.exists) return;
    nodecg.sendMessage("updatePatch", { ...status, gain: status.gain + delta });
  };

  const toggleMute = () => {
    if (!status || !status.exists) return;
    nodecg.sendMessage("updatePatch", { ...status, mute: !status.mute });
  };

  const toggleConnection = () => {
    if (!status) return;
    if (status.exists && status.gain > -144) {
      // Disconnect (Remove point)
      nodecg.sendMessage("updatePatch", { ...status, exists: false });
    } else {
      // Connect (Create point at 0dB)
      nodecg.sendMessage("updatePatch", {
        ...status,
        exists: true,
        gain: 0,
        mute: false,
      });
    }
  };

  if (!status || !status.inputDevice || !status.outputDevice) {
    return (
      <div style={{ marginTop: "10px", color: "#888", textAlign: "center" }}>
        Please select device
      </div>
    );
  }

  const isPatched = status.exists && status.gain > -144;

  return (
    <div style={{ marginTop: "10px" }}>
      <div
        onClick={toggleConnection}
        style={{
          cursor: "pointer",
          fontWeight: "bold",
          marginBottom: "10px",
          padding: "10px",
          backgroundColor: isPatched ? "#e6f7ff" : "#fff1f0",
          border: "1px solid #ccc",
          borderRadius: "4px",
          textAlign: "center",
          userSelect: "none",
        }}
      >
        {isPatched ? (
          <>
            <div style={{ fontSize: "1.2em" }}>
              {status.mute ? "MUTED" : `${status.gain.toFixed(1)} dB`}
            </div>
            <div style={{ fontSize: "0.8em", color: "#666" }}>
              (Click to Unpatch)
            </div>
          </>
        ) : (
          <div style={{ color: "#d9363e" }}>UNPATCHED (Click to Patch)</div>
        )}
      </div>

      {isPatched && (
        <div style={{ display: "flex", gap: "5px", justifyContent: "center" }}>
          <button onClick={() => updateGain(-1)}>-1 dB</button>
          <button onClick={() => updateGain(1)}>+1 dB</button>
          <button onClick={toggleMute}>
            {status.mute ? "Unmute" : "Mute"}
          </button>
        </div>
      )}
    </div>
  );
};
