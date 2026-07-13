import React, { useEffect } from "react";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { Plus, Trash2 } from "lucide-react";
import {
  Button,
  Disclosure,
  IconButton,
  PanelHeader,
} from "../_leaf-ui/components";
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
    // 拖放到预设库槽位时保存当前预设。
    if (over && over.id) {
      // 使用状态中的预设名称。
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
        <PanelHeader
          kicker="VBAN Matrix"
          title="VB Matrix Control"
          target={
            activeConnection
              ? `${activeConnection.name} · ${activeConnection.ip}`
              : "Not configured"
          }
          status={activeConnectionId ? "Configured" : "Not Configured"}
          statusTone={activeConnectionId ? "neutral" : "warning"}
        />

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

        <MatrixView
          connectionId={activeConnectionId}
          devices={devices}
          points={matrixPoints}
          patches={patches}
          onRefresh={handleRefreshMatrix}
        />

        <Disclosure
          title="Patch Control"
          summary={`${filteredPatches.length} active`}
          defaultOpen
          storageKey="vb.patch-control.open"
        >
          <div className="leaf-toolbar">
            <Button
              tone="primary"
              onClick={handleAddPatch}
              disabled={!activeConnectionId}
            >
              <Plus size={15} aria-hidden="true" />
              Add Patch
            </Button>
          </div>
          {filteredPatches.length === 0 ? (
            <div className="empty-state">No patches for this matrix.</div>
          ) : null}
          <div className="patch-list">
            {filteredPatches.map((patch, index) => (
              <article className="patch-row" key={patch.id}>
                <div className="patch-row-heading">
                  <span className="patch-index">Patch {index + 1}</span>
                  {index > 0 ? (
                    <IconButton
                      tone="danger"
                      label={`Remove patch ${index + 1}`}
                      icon={<Trash2 size={14} aria-hidden="true" />}
                      onClick={() => handleRemovePatch(patch.id)}
                    />
                  ) : null}
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
        </Disclosure>

        <Disclosure
          title="Preset Manager"
          defaultOpen={false}
          storageKey="vb.preset-manager.open"
        >
          <PresetManager name={presetName} setName={setPresetName} />
        </Disclosure>
        <Disclosure
          title="Preset Bank"
          defaultOpen={false}
          storageKey="vb.preset-bank.open"
        >
          <Bank />
        </Disclosure>
      </div>
    </DndContext>
  );
};
