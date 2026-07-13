import React, { useEffect, useMemo, useState } from "react";
import { sendAuthenticatedCommand } from "../../_leaf-core/security/authenticated-command-client";
import {
  CurrentPatchStatus,
  DeviceInfo,
  MatrixPointAddress,
  MatrixPointStatus,
} from "../../types";

interface MatrixEndpoint {
  slotSuid: string;
  pointDevice: string;
  deviceName: string;
  channel: number;
}

interface MatrixViewProps {
  connectionId: string;
  devices: DeviceInfo[];
  points: MatrixPointStatus[];
  patches: CurrentPatchStatus[];
  onRefresh: () => void;
}

const getPointKey = (point: MatrixPointAddress) =>
  [
    point.connectionId,
    point.inputDevice,
    point.inputChannel,
    point.outputDevice,
    point.outputChannel,
  ].join("|");

const getMatrixPatchId = (point: MatrixPointAddress) =>
  `matrix-${getPointKey(point).replace(/[^a-zA-Z0-9_-]/g, "_")}`;

const getPointDevice = (device: DeviceInfo) => device.pointDevice || device.suid;

const expandEndpoints = (
  devices: DeviceInfo[],
  direction: "inputs" | "outputs"
): MatrixEndpoint[] =>
  devices.flatMap((device) => {
    const count = direction === "inputs" ? device.inputs : device.outputs;
    return Array.from({ length: count }, (_, index) => ({
      slotSuid: device.suid,
      pointDevice: getPointDevice(device),
      deviceName: device.name || device.suid,
      channel: index + 1,
    }));
  });

export const MatrixView: React.FC<MatrixViewProps> = ({
  connectionId,
  devices,
  points,
  patches,
  onRefresh,
}) => {
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());

  const connectionDevices = useMemo(
    () => devices.filter((device) => device.connectionId === connectionId),
    [connectionId, devices]
  );
  const inputEndpoints = useMemo(
    () => expandEndpoints(connectionDevices, "inputs"),
    [connectionDevices]
  );
  const outputEndpoints = useMemo(
    () => expandEndpoints(connectionDevices, "outputs"),
    [connectionDevices]
  );
  const pointMap = useMemo(() => {
    const map = new Map<string, MatrixPointStatus>();

    patches
      .filter((patch) => patch.connectionId === connectionId)
      .forEach((patch) => {
        const key = getPointKey(patch);
        map.set(key, {
          key,
          connectionId: patch.connectionId,
          inputDevice: patch.inputDevice,
          inputChannel: patch.inputChannel,
          outputDevice: patch.outputDevice,
          outputChannel: patch.outputChannel,
          gain: patch.gain,
          mute: patch.mute,
          exists: !!patch.exists && patch.gain > -144,
          updatedAt: 0,
        });
      });

    points
      .filter((point) => point.connectionId === connectionId)
      .forEach((point) => {
        map.set(point.key, point);
      });

    return map;
  }, [connectionId, patches, points]);
  const connectionPoints = useMemo(
    () => [...pointMap.values()].filter((point) => point.exists),
    [pointMap]
  );
  const totalCells = inputEndpoints.length * outputEndpoints.length;
  const knownCells = pointMap.size;
  const lastUpdatedAt = useMemo(
    () =>
      Math.max(
        0,
        ...points
          .filter((point) => point.connectionId === connectionId)
          .map((point) => point.updatedAt)
      ),
    [connectionId, points]
  );

  useEffect(() => {
    const refreshTimer = window.setTimeout(() => {
      onRefresh();
    }, 250);

    return () => window.clearTimeout(refreshTimer);
  }, [connectionId, inputEndpoints.length, outputEndpoints.length, onRefresh]);

  const togglePoint = (point: MatrixPointAddress, isPatched: boolean) => {
    const key = getPointKey(point);
    setPendingKeys((current) => new Set(current).add(key));
    const patch: CurrentPatchStatus = {
      id: getMatrixPatchId(point),
      ...point,
      gain: isPatched ? -144 : 0,
      mute: false,
      exists: !isPatched,
    };

    void sendAuthenticatedCommand(
      "vb-matrix-control",
      "vb.updatePatch",
      patch
    ).catch((error) =>
      window.alert(error instanceof Error ? error.message : String(error))
    );
    window.setTimeout(() => {
      setPendingKeys((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }, 700);
  };

  if (!connectionId) {
    return null;
  }

  const hasMatrix = inputEndpoints.length > 0 && outputEndpoints.length > 0;

  return (
    <section className="section-panel matrix-panel">
      <div className="section-heading">
        <div className="section-title">
          <span className="section-kicker">Matrix</span>
          <h3>Patch Matrix</h3>
          <p className="section-note">
            {inputEndpoints.length} inputs / {outputEndpoints.length} outputs
          </p>
        </div>
        <button
          type="button"
          className="control-button section-action"
          onClick={onRefresh}
        >
          Refresh
        </button>
      </div>

      {hasMatrix ? (
        <>
          <div className="matrix-summary" aria-label="Matrix summary">
            <span>
              Patched <strong>{connectionPoints.length}</strong>
            </span>
            <span>
              Known <strong>{knownCells}</strong> / <strong>{totalCells}</strong>
            </span>
            <span>
              {lastUpdatedAt > 0
                ? `Updated ${new Date(lastUpdatedAt).toLocaleTimeString()}`
                : "Awaiting scan"}
            </span>
          </div>

          <div className="matrix-legend" aria-label="Matrix legend">
            <span>
              <i className="matrix-legend-dot matrix-legend-dot--patched" />
              Patched
            </span>
            <span>
              <i className="matrix-legend-dot matrix-legend-dot--muted" />
              Muted
            </span>
            <span>
              <i className="matrix-legend-dot" />
              Open
            </span>
          </div>

          <div className="matrix-scroll" aria-label="Voicemeeter Matrix">
            <div
              className="matrix-grid"
              style={{
                gridTemplateColumns: `156px repeat(${outputEndpoints.length}, 38px)`,
              }}
            >
              <div className="matrix-corner">Inputs / Outputs</div>
              {outputEndpoints.map((output) => (
                <div
                  className="matrix-column-header"
                  key={`${output.slotSuid}-${output.channel}`}
                  title={`${output.deviceName} OUT ${output.channel}`}
                >
                  <span>{output.deviceName}</span>
                  <strong>O{output.channel}</strong>
                </div>
              ))}

              {inputEndpoints.map((input) => (
                <React.Fragment key={`${input.slotSuid}-${input.channel}`}>
                  <div
                    className="matrix-row-header"
                    title={`${input.deviceName} IN ${input.channel}`}
                  >
                    <span>{input.deviceName}</span>
                    <strong>IN {input.channel}</strong>
                  </div>
                  {outputEndpoints.map((output) => {
                    const point: MatrixPointAddress = {
                      connectionId,
                      inputDevice: input.pointDevice,
                      inputChannel: input.channel,
                      outputDevice: output.pointDevice,
                      outputChannel: output.channel,
                    };
                    const key = getPointKey(point);
                    const status = pointMap.get(key);
                    const isPatched = !!status?.exists && status.gain > -144;
                    const isMuted = isPatched && !!status?.mute;
                    const isPending = pendingKeys.has(key);
                    const gainLabel =
                      isPatched && typeof status?.gain === "number"
                        ? `${status.gain.toFixed(1)} dB`
                        : "Open";

                    return (
                      <button
                        type="button"
                        key={key}
                        className={`matrix-cell ${
                          isPatched ? "is-patched" : ""
                        } ${isMuted ? "is-muted" : ""} ${
                          isPending ? "is-pending" : ""
                        }`}
                        title={`${input.deviceName} IN ${input.channel} -> ${output.deviceName} OUT ${output.channel}: ${gainLabel}`}
                        aria-pressed={isPatched}
                        aria-label={`${isPatched ? "Depatch" : "Patch"} ${
                          input.deviceName
                        } input ${input.channel} to ${output.deviceName} output ${
                          output.channel
                        }`}
                        onClick={() => togglePoint(point, isPatched)}
                      >
                        <span aria-hidden="true" />
                      </button>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="empty-state">
          No Matrix devices discovered. Refresh after Voicemeeter Matrix is
          reachable.
        </div>
      )}
    </section>
  );
};
