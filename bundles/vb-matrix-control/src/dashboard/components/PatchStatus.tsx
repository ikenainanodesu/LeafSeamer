import React, { useRef, useState } from "react";
import { ToastRegion, useToast } from "../_leaf-ui/components";
import { CurrentPatchStatus } from "../../types";
import { sendAuthenticatedCommand } from "../../_leaf-core/security/authenticated-command-client";

export const PatchStatus: React.FC<{ status: CurrentPatchStatus }> = ({
  status,
}) => {
  const { items: toasts, pushToast } = useToast();
  const [isPatchCommandPending, setIsPatchCommandPending] = useState(false);
  const patchCommandLockRef = useRef(false);

  // 状态由父组件传入，因此不在此订阅 Replicant。
  const updatePatch = (patch: CurrentPatchStatus) => {
    if (patchCommandLockRef.current) return;
    patchCommandLockRef.current = true;
    setIsPatchCommandPending(true);
    void sendAuthenticatedCommand("vb-matrix-control", "vb.updatePatch", patch)
      .catch((error) =>
        pushToast(error instanceof Error ? error.message : String(error), "danger")
      )
      .finally(() => {
        patchCommandLockRef.current = false;
        setIsPatchCommandPending(false);
      });
  };

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
      // 断开连接并移除节点。
      void updatePatch({ ...status, exists: false });
    } else {
      // 建立连接并以 0dB 创建节点。
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
      <>
        <div className="empty-inline">Please select device</div>
        <ToastRegion items={toasts} />
      </>
    );
  }

  const isPatched = status.exists && status.gain > -144;

  return (
    <>
      <div className="patch-status">
        <button
          type="button"
          onClick={toggleConnection}
          disabled={isPatchCommandPending}
          aria-busy={isPatchCommandPending}
          className={`connection-toggle ${
            isPatched ? "is-patched" : "is-unpatched"
          } ${status.mute ? "is-muted" : ""}`}
        >
          {isPatchCommandPending ? (
            <>
              <span className="toggle-value">Updating patch...</span>
              <span className="toggle-hint">Please wait</span>
            </>
          ) : isPatched ? (
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
            <button
              className="control-button"
              onClick={() => updateGain(-1)}
              disabled={isPatchCommandPending}
            >
              -1 dB
            </button>
            <button
              className="control-button"
              onClick={() => updateGain(1)}
              disabled={isPatchCommandPending}
            >
              +1 dB
            </button>
            <button
              className="control-button"
              onClick={toggleMute}
              disabled={isPatchCommandPending}
            >
              {status.mute ? "Unmute" : "Mute"}
            </button>
          </div>
        )}
      </div>
      <ToastRegion items={toasts} />
    </>
  );
};
