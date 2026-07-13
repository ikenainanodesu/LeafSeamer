import React from "react";
import { CurrentPatchStatus } from "../../types";
import { sendAuthenticatedCommand } from "../../_leaf-core/security/authenticated-command-client";

const updatePatch = (patch: CurrentPatchStatus) =>
  sendAuthenticatedCommand("vb-matrix-control", "vb.updatePatch", patch).catch(
    (error) =>
      window.alert(error instanceof Error ? error.message : String(error))
  );

export const PatchStatus: React.FC<{ status: CurrentPatchStatus }> = ({
  status,
}) => {
  // Removed local state and replicant subscription as we receive status from props

  const updateGain = (delta: number) => {
    if (!status || !status.exists) return;
    void updatePatch({ ...status, gain: status.gain + delta });
  };

  const toggleMute = () => {
    if (!status || !status.exists) return;
    void updatePatch({ ...status, mute: !status.mute });
  };

  const toggleConnection = () => {
    if (!status) return;
    if (status.exists && status.gain > -144) {
      // Disconnect (Remove point)
      void updatePatch({ ...status, exists: false });
    } else {
      // Connect (Create point at 0dB)
      void updatePatch({
        ...status,
        exists: true,
        gain: 0,
        mute: false,
      });
    }
  };

  if (!status || !status.inputDevice || !status.outputDevice) {
    return (
      <div className="empty-inline">
        Please select device
      </div>
    );
  }

  const isPatched = status.exists && status.gain > -144;

  return (
    <div className="patch-status">
      <button
        type="button"
        onClick={toggleConnection}
        className={`connection-toggle ${
          isPatched ? "is-patched" : "is-unpatched"
        } ${status.mute ? "is-muted" : ""}`}
      >
        {isPatched ? (
          <>
            <span className="toggle-value">
              {status.mute ? "MUTED" : `${status.gain.toFixed(1)} dB`}
            </span>
            <span className="toggle-hint">Click to unpatch</span>
          </>
        ) : (
          <>
            <span className="toggle-value">UNPATCHED</span>
            <span className="toggle-hint">Click to patch</span>
          </>
        )}
      </button>

      {isPatched && (
        <div className="status-actions">
          <button className="control-button" onClick={() => updateGain(-1)}>
            -1 dB
          </button>
          <button className="control-button" onClick={() => updateGain(1)}>
            +1 dB
          </button>
          <button className="control-button" onClick={toggleMute}>
            {status.mute ? "Unmute" : "Mute"}
          </button>
        </div>
      )}
    </div>
  );
};
