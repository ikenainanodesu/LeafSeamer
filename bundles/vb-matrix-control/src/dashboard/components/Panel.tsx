import React, { useEffect } from "react";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { PatchSelector } from "./PatchSelector";
import { PatchStatus } from "./PatchStatus";
import { PresetManager } from "./PresetManager";
import { Bank } from "./Bank";
import { MatrixView } from "./MatrixView";
import {
  CurrentPatchStatus,
  DeviceInfo,
  MatrixPointStatus,
  NetworkConfig,
} from "../../types";

export const Panel: React.FC = () => {
  const [presetName, setPresetName] = React.useState("New Preset");
  const [activeConnectionId, setActiveConnectionId] =
    React.useState<string>("");
  const [networkConfigs, setNetworkConfigs] = React.useState<NetworkConfig[]>(
    []
  );
  const [patches, setPatches] = React.useState<CurrentPatchStatus[]>([]);
  const [devices, setDevices] = React.useState<DeviceInfo[]>([]);
  const [matrixPoints, setMatrixPoints] = React.useState<MatrixPointStatus[]>(
    []
  );

  useEffect(() => {
    const netRep = nodecg.Replicant<NetworkConfig[]>("networkConfigs");
    const handleNetworkChange = (val: NetworkConfig[] = []) => {
      setNetworkConfigs(val);
      setActiveConnectionId((currentId) => {
        if (val.length === 0) return "";
        if (!currentId || !val.find((c) => c.id === currentId)) {
          return val[0].id;
        }
        return currentId;
      });
    };
    netRep.on("change", handleNetworkChange);

    const activePatchesRep =
      nodecg.Replicant<CurrentPatchStatus[]>("activePatches");
    const handlePatchesChange = (val: CurrentPatchStatus[] = []) => {
      setPatches(val);
    };
    activePatchesRep.on("change", handlePatchesChange);

    const availableDevicesRep =
      nodecg.Replicant<DeviceInfo[]>("availableDevices");
    const handleDevicesChange = (val: DeviceInfo[] = []) => {
      setDevices(val);
    };
    availableDevicesRep.on("change", handleDevicesChange);

    const matrixPointsRep =
      nodecg.Replicant<MatrixPointStatus[]>("matrixPoints");
    const handleMatrixPointsChange = (val: MatrixPointStatus[] = []) => {
      setMatrixPoints(val);
    };
    matrixPointsRep.on("change", handleMatrixPointsChange);

    return () => {
      netRep.removeListener("change", handleNetworkChange);
      activePatchesRep.removeListener("change", handlePatchesChange);
      availableDevicesRep.removeListener("change", handleDevicesChange);
      matrixPointsRep.removeListener("change", handleMatrixPointsChange);
    };
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { over } = event;
    // If dropped over a bank slot
    if (over && over.id) {
      // Use the name from state
      nodecg.sendMessage("savePresetToBank", {
        slotId: over.id,
        name: presetName || "Untitled",
      });
    }
  };

  const handleAddPatch = () => {
    if (!activeConnectionId) return;
    nodecg.sendMessage("addPatch", activeConnectionId);
  };

  const handleRemovePatch = (id: string) => {
    nodecg.sendMessage("removePatch", id);
  };

  const handleRefreshMatrix = React.useCallback(() => {
    if (!activeConnectionId) return;
    nodecg.sendMessage("refreshMatrix", activeConnectionId);
  }, [activeConnectionId]);

  const filteredPatches = patches.filter(
    (p) => p.connectionId === activeConnectionId
  );
  const activeConnection = networkConfigs.find(
    (c) => c.id === activeConnectionId
  );

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="vb-shell">
        <header className="vb-header">
          <div className="vb-title-group">
            <span className="vb-kicker">VBAN Matrix</span>
            <h2>VB Matrix Control</h2>
          </div>
          <div className="header-meta" title={activeConnection?.ip || ""}>
            <strong>{activeConnection?.name || "No Matrix"}</strong>
            {activeConnection?.ip || "Not configured"}
          </div>
        </header>

        <div className="matrix-toolbar">
          <label className="field">
            <span>Matrix</span>
            <select
              value={activeConnectionId}
              onChange={(e) => setActiveConnectionId(e.target.value)}
              className="vb-select"
            >
              {networkConfigs.length === 0 && (
                <option value="">No Configurations</option>
              )}
              {networkConfigs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.ip})
                </option>
              ))}
            </select>
          </label>
          <div className="config-count">{networkConfigs.length} Configs</div>
        </div>

        {activeConnectionId ? (
          <>
            <MatrixView
              connectionId={activeConnectionId}
              devices={devices}
              points={matrixPoints}
              patches={patches}
              onRefresh={handleRefreshMatrix}
            />

            <section className="section-panel">
              <div className="section-heading">
                <div className="section-title">
                  <span className="section-kicker">Routing</span>
                  <h3>Patch Control</h3>
                  <p className="section-note">
                    {filteredPatches.length} active row
                    {filteredPatches.length === 1 ? "" : "s"} for{" "}
                    {activeConnection?.name || "selected matrix"}
                  </p>
                </div>
                <button
                  onClick={handleAddPatch}
                  className="icon-button icon-button--primary section-action"
                  title="Add patch"
                  aria-label="Add patch"
                >
                  +
                </button>
              </div>

              {filteredPatches.length === 0 && (
                <div className="empty-state">No patches for this matrix.</div>
              )}

              <div className="patch-list">
                {filteredPatches.map((patch, index) => (
                  <article className="patch-row" key={patch.id}>
                    <div className="patch-row-heading">
                      <span className="patch-index">Patch {index + 1}</span>
                      {index > 0 && (
                        <button
                          onClick={() => handleRemovePatch(patch.id)}
                          className="icon-button icon-button--danger"
                          title="Remove patch"
                          aria-label={`Remove patch ${index + 1}`}
                        >
                          X
                        </button>
                      )}
                    </div>
                    <PatchSelector
                      patchId={patch.id}
                      connectionId={activeConnectionId}
                      status={patch}
                      onSelectionChange={() => {}}
                    />
                    <PatchStatus status={patch} />
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : (
          <div className="empty-panel">
            Please add a Network Configuration in the dedicated panel.
          </div>
        )}

        <div className="management-grid">
          <section className="section-panel">
            <div className="section-title">
              <span className="section-kicker">Capture</span>
              <h3>Preset Manager</h3>
            </div>
            <PresetManager name={presetName} setName={setPresetName} />
          </section>

          <section className="section-panel">
            <div className="section-title">
              <span className="section-kicker">Recall</span>
              <h3>Preset Bank</h3>
            </div>
            <Bank />
          </section>
        </div>
      </div>
    </DndContext>
  );
};
