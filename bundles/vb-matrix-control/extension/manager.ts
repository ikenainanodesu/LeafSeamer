import * as os from "os";
import * as fs from "fs";
import * as path from "path";
import NodeCG from "nodecg/types";
import { VBANTransmitter } from "./vban";
import {
  NetworkConfig,
  Preset,
  CurrentPatchStatus,
  DeviceInfo,
  MatrixPointAddress,
  MatrixPointStatus,
} from "../src/types";

export class MatrixManager {
  private nodecg: NodeCG.ServerAPI;
  private connections: Map<string, VBANTransmitter> = new Map();
  private lastDiscoveryAt: Map<string, number> = new Map();

  // Replicants
  private netConfigsRep: any;
  private activePatchesRep: any;
  private presetsRep: any;
  private hostInfoRep: any;
  private availableDevicesRep: any;
  private matrixPointsRep: any;

  constructor(nodecg: NodeCG.ServerAPI) {
    this.nodecg = nodecg;

    this.initReplicants();
    this.initListeners();
    this.loadPresetsFromFile();
  }

  private getLocalIPs(): string[] {
    const interfaces = os.networkInterfaces();
    const ips: string[] = [];
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]!) {
        // Skip internal (127.0.0.1) and non-IPv4
        if ("IPv4" !== iface.family || iface.internal) {
          continue;
        }
        ips.push(iface.address);
      }
    }
    return ips;
  }

  private initReplicants() {
    this.netConfigsRep = this.nodecg.Replicant<NetworkConfig[]>(
      "networkConfigs",
      {
        defaultValue: [],
      }
    );

    this.hostInfoRep = this.nodecg.Replicant("hostInfo", {
      defaultValue: { ips: this.getLocalIPs() },
      persistent: false,
    });

    this.presetsRep = this.nodecg.Replicant<Preset[]>("presets", {
      defaultValue: [],
    });

    // activePatches Replicant
    this.activePatchesRep = this.nodecg.Replicant<CurrentPatchStatus[]>(
      "activePatches",
      {
        defaultValue: [],
      }
    );
    this.availableDevicesRep = this.nodecg.Replicant<DeviceInfo[]>(
      "availableDevices",
      {
        defaultValue: [],
      }
    );
    this.matrixPointsRep = this.nodecg.Replicant<MatrixPointStatus[]>(
      "matrixPoints",
      {
        defaultValue: [],
        persistent: false,
      }
    );

    // Handle config changes
    this.netConfigsRep.on("change", (newVal: NetworkConfig[]) => {
      this.updateConnections(newVal || []);
    });
  }

  private updateConnections(configs: NetworkConfig[]) {
    const activeIds = new Set<string>();

    for (const config of configs) {
      activeIds.add(config.id);

      let vban = this.connections.get(config.id);
      if (!vban) {
        // Create new connection
        vban = new VBANTransmitter((message) =>
          this.nodecg.log.info(message)
        );
        this.setupConnectionListeners(vban, config.id);
        this.connections.set(config.id, vban);
        this.nodecg.log.info(
          `[VBAN] Added connection: ${config.name} (${config.id})`
        );
      }

      // Always update config in case IP/Port changed
      vban.setConfig(config.ip, config.port, config.streamName);
    }

    // Cleanup removed connections
    for (const [id, vban] of this.connections) {
      if (!activeIds.has(id)) {
        vban.destroy();
        this.connections.delete(id);
        this.nodecg.log.info(`[VBAN] Removed connection: ${id}`);

        // Also cleanup devices and patches associated with this connection?
        // Maybe keep patches but mark disconnected? For now, we keep them in memory
        // until User explicitly removes, or we could filter them out.
        // Let's filter availableDevices at least.
        const devices = this.availableDevicesRep.value || [];
        this.availableDevicesRep.value = devices.filter(
          (d: DeviceInfo) => d.connectionId !== id
        );
        const matrixPoints = this.matrixPointsRep.value || [];
        this.matrixPointsRep.value = matrixPoints.filter(
          (p: MatrixPointStatus) => p.connectionId !== id
        );
      }
    }
  }

  private setupConnectionListeners(
    vban: VBANTransmitter,
    connectionId: string
  ) {
    vban.on("data", (data: string) => {
      this.handleResponse(data, connectionId);
    });

    vban.on("error", (err: Error) => {
      this.nodecg.log.error(`[VBAN ${connectionId}] Error:`, err.message);
    });
  }

  private initListeners() {
    // VBAN Listeners
    // sendVBAN might need target. Default to all? Or specific?
    // Let's assume specific if ID provided, else all?
    // Actually, usually commands are specific.
    this.nodecg.listenFor(
      "sendVBAN",
      (data: { command: string; connectionId?: string }) => {
        if (data.connectionId) {
          const vban = this.connections.get(data.connectionId);
          if (vban) vban.send(data.command);
        } else {
          // Broadcast? Or error.
          // For legacy compat (if any), maybe broadcast to first?
          this.connections.forEach((vban) => vban.send(data.command));
        }
      }
    );

    this.nodecg.listenFor("ping", (connectionId?: string) => {
      this.ping(connectionId);
    });

    // Dashboard Listeners
    this.nodecg.listenFor("addPatch", (connectionId: string) => {
      if (!connectionId) return;

      const currentPatches = this.activePatchesRep.value || [];
      const newPatch: CurrentPatchStatus = {
        id: Math.random().toString(36).substr(2, 9),
        connectionId: connectionId,
        inputDevice: "",
        inputChannel: 1,
        outputDevice: "",
        outputChannel: 1,
        gain: -144.0,
        mute: false,
        exists: false,
      };
      this.activePatchesRep.value = [...currentPatches, newPatch];
    });

    this.nodecg.listenFor("removePatch", (id: string) => {
      const currentPatches = this.activePatchesRep.value || [];
      this.activePatchesRep.value = currentPatches.filter(
        (p: CurrentPatchStatus) => p.id !== id
      );
    });

    this.nodecg.listenFor(
      "selectPatch",
      (patch: {
        id: string;
        connectionId: string;
        inputDevice: string;
        inputChannel: number;
        outputDevice: string;
        outputChannel: number;
      }) => {
        // Validate input
        if (
          !patch.id ||
          !patch.connectionId ||
          !patch.inputDevice ||
          !patch.outputDevice
        ) {
          this.nodecg.log.warn(
            "[selectPatch] Invalid patch: missing id or device(s)"
          );
          return;
        }

        const vban = this.connections.get(patch.connectionId);
        if (!vban) {
          this.nodecg.log.warn(
            `[selectPatch] Connection ${patch.connectionId} not found.`
          );
          return;
        }

        const currentPatches = this.activePatchesRep.value || [];
        const patchIndex = currentPatches.findIndex(
          (p: CurrentPatchStatus) => p.id === patch.id
        );

        if (patchIndex === -1) {
          this.nodecg.log.warn(`[selectPatch] Patch ID ${patch.id} not found.`);
          return;
        }

        this.nodecg.log.info("Select Patch Requested:", patch);

        const updatedPatch = {
          ...currentPatches[patchIndex],
          ...patch, // Updates connectionId if changed (unlikely here) and devices
          gain: -144.0, // Reset to unknown/default until read
          mute: false,
          exists: false,
        };

        // Optimistic update
        currentPatches[patchIndex] = updatedPatch;
        this.activePatchesRep.value = [...currentPatches];

        const inCh = patch.inputChannel || 1;
        const outCh = patch.outputChannel || 1;

        // Query actual status from Matrix
        const gainQuery = `Point(${patch.inputDevice}.IN[${inCh}],${patch.outputDevice}.OUT[${outCh}]).dBGain = ?;`;
        const muteQuery = `Point(${patch.inputDevice}.IN[${inCh}],${patch.outputDevice}.OUT[${outCh}]).Mute = ?;`;

        this.nodecg.log.info(
          `[selectPatch] Sending Queries to ${patch.connectionId}: ${gainQuery}`
        );
        vban.send(gainQuery);
        vban.send(muteQuery);
      }
    );

    this.nodecg.listenFor("updatePatch", (patch: any) => {
      // patch must have connectionId
      if (!patch.connectionId) return;
      const vban = this.connections.get(patch.connectionId);
      if (!vban) return;

      this.nodecg.log.info("Update Patch:", patch);

      // Send VBAN commands to Matrix
      if (patch.inputDevice && patch.outputDevice) {
        const inCh = patch.inputChannel || 1;
        const outCh = patch.outputChannel || 1;
        const point: MatrixPointAddress = {
          connectionId: patch.connectionId,
          inputDevice: patch.inputDevice,
          inputChannel: inCh,
          outputDevice: patch.outputDevice,
          outputChannel: outCh,
        };

        // Handle "Unpatch" (Remove)
        if (patch.exists === false) {
          const removeCmd = `Point(${patch.inputDevice}.IN[${inCh}],${patch.outputDevice}.OUT[${outCh}]).Remove;`;
          vban.send(removeCmd);
          this.upsertMatrixPoint(point, {
            exists: false,
            gain: -144,
            mute: false,
          });
          this.upsertActivePatchFromMatrixPoint(
            point,
            { exists: false, gain: -144, mute: false },
            false
          );
          patch.gain = -144;
          patch.mute = false;
        } else {
          // Handle "Patch" / Update

          // Set gain
          if (typeof patch.gain === "number") {
            const gainCmd = `Point(${patch.inputDevice}.IN[${inCh}],${patch.outputDevice}.OUT[${outCh}]).dBGain = ${patch.gain.toFixed(1)};`;
            vban.send(gainCmd);
          } else if (
            patch.exists === true &&
            typeof patch.gain === "undefined"
          ) {
            // Check if we need to default to 0dB
            const currentPatches = this.activePatchesRep.value || [];
            const existing = currentPatches.find(
              (p: CurrentPatchStatus) => p.id === patch.id
            );

            if (existing && !existing.exists) {
              // Was unconnected, now connecting -> Default 0dB
              const gainCmd = `Point(${patch.inputDevice}.IN[${inCh}],${patch.outputDevice}.OUT[${outCh}]).dBGain = 0.0;`;
              vban.send(gainCmd);
              patch.gain = 0;
            }
          }

          // Set mute
          if (typeof patch.mute === "boolean") {
            const muteCmd = `Point(${patch.inputDevice}.IN[${inCh}],${patch.outputDevice}.OUT[${outCh}]).Mute = ${patch.mute ? 1 : 0};`;
            vban.send(muteCmd);
          }

          this.upsertMatrixPoint(point, {
            exists: patch.exists !== false && (patch.gain ?? 0) > -144,
            gain: typeof patch.gain === "number" ? patch.gain : 0,
            mute: typeof patch.mute === "boolean" ? patch.mute : false,
          });
          this.upsertActivePatchFromMatrixPoint(
            point,
            {
              exists: patch.exists !== false && (patch.gain ?? 0) > -144,
              gain: typeof patch.gain === "number" ? patch.gain : 0,
              mute: typeof patch.mute === "boolean" ? patch.mute : false,
            },
            true
          );
        }
      }

      // Update Replicant
      const currentPatches = this.activePatchesRep.value || [];
      const idx = currentPatches.findIndex(
        (p: CurrentPatchStatus) => p.id === patch.id
      );
      if (idx !== -1) {
        currentPatches[idx] = patch;
        this.activePatchesRep.value = [...currentPatches];
      }
    });

    this.nodecg.listenFor("refreshDevices", (connectionId?: string) => {
      this.requestDeviceDiscovery(connectionId);
    });

    this.nodecg.listenFor("refreshMatrix", (connectionId?: string) => {
      this.requestDeviceDiscovery(connectionId, true);
      this.refreshMatrix(connectionId);
    });

    this.nodecg.listenFor("toggleMatrixPoint", (point: MatrixPointAddress) => {
      this.toggleMatrixPoint(point);
    });

    this.nodecg.listenFor(
      "savePresetToBank",
      (data: { slotId: string; name: string }) => {
        const currentPatches = this.getCurrentPatchSnapshot();
        const netConfigs = JSON.parse(JSON.stringify(this.netConfigsRep.value));

        const newPreset: Preset = {
          id: data.slotId,
          name: data.name,
          networkConfigs: netConfigs,
          patches: currentPatches,
        };

        const currentPresets = this.presetsRep.value || [];
        const newPresetsList = JSON.parse(JSON.stringify(currentPresets));

        const existingIndex = newPresetsList.findIndex(
          (p: Preset) => p.id === data.slotId
        );

        if (existingIndex >= 0) {
          newPresetsList[existingIndex] = newPreset;
        } else {
          newPresetsList.push(newPreset);
        }

        this.presetsRep.value = newPresetsList;
        this.savePresetsToFile(newPresetsList);
      }
    );

    this.nodecg.listenFor("deletePreset", (presetId: string) => {
      const currentPresets = JSON.parse(
        JSON.stringify(this.presetsRep.value || [])
      );
      const newPresetsList = currentPresets.filter(
        (p: Preset) => p.id !== presetId
      );

      this.presetsRep.value = newPresetsList;
      this.savePresetsToFile(newPresetsList);
    });

    this.nodecg.listenFor("loadPreset", (presetId: string) => {
      const presets = this.presetsRep.value || [];
      const preset = presets.find((p: Preset) => p.id === presetId);
      if (preset) {
        this.nodecg.log.info(`Loading Preset: ${preset.name}`);
        if (preset.networkConfigs) {
          this.netConfigsRep.value = JSON.parse(
            JSON.stringify(preset.networkConfigs)
          );
          // Wait for connections to update? Replicant handler updates Map immediately.
        }

        if (preset.patches) {
          // Deep clone status
          const patchesToLoad = JSON.parse(JSON.stringify(preset.patches));
          this.activePatchesRep.value = patchesToLoad;

          // Send Commands for ALL patches
          patchesToLoad.forEach((p: CurrentPatchStatus) => {
            const vban = this.connections.get(p.connectionId);
            if (!vban) return; // Can't send if connection missing

            const inCh = p.inputChannel || 1;
            const outCh = p.outputChannel || 1;
            if (typeof p.gain === "number") {
              vban.send(
                `Point(${p.inputDevice}.IN[${inCh}],${p.outputDevice}.OUT[${outCh}]).dBGain = ${p.gain.toFixed(1)};`
              );
            }
            if (typeof p.mute === "boolean") {
              vban.send(
                `Point(${p.inputDevice}.IN[${inCh}],${p.outputDevice}.OUT[${outCh}]).Mute = ${p.mute ? 1 : 0};`
              );
            }
            this.upsertMatrixPoint(
              {
                connectionId: p.connectionId,
                inputDevice: p.inputDevice,
                inputChannel: inCh,
                outputDevice: p.outputDevice,
                outputChannel: outCh,
              },
              {
                exists: !!p.exists && p.gain > -144,
                gain: p.gain,
                mute: p.mute,
              }
            );
          });
        }
      }
    });
  }

  private getCurrentPatchSnapshot(): CurrentPatchStatus[] {
    const snapshot = new Map<string, CurrentPatchStatus>();
    const activePatches: CurrentPatchStatus[] = this.activePatchesRep.value || [];
    const matrixPoints: MatrixPointStatus[] = this.matrixPointsRep.value || [];

    activePatches.forEach((patch) => {
      if (!patch.inputDevice || !patch.outputDevice) return;
      snapshot.set(this.getMatrixPointKey(patch), {
        ...patch,
        id: patch.id || this.getPatchIdForMatrixPoint(patch),
      });
    });

    matrixPoints.forEach((point) => {
      if (!point.exists || point.gain <= -144) return;
      if (snapshot.has(point.key)) return;

      snapshot.set(point.key, {
        id: this.getPatchIdForMatrixPoint(point),
        connectionId: point.connectionId,
        inputDevice: point.inputDevice,
        inputChannel: point.inputChannel,
        outputDevice: point.outputDevice,
        outputChannel: point.outputChannel,
        gain: point.gain,
        mute: point.mute,
        exists: true,
      });
    });

    return JSON.parse(JSON.stringify([...snapshot.values()]));
  }

  private savePresetsToFile(presets: Preset[]) {
    try {
      const bundlePath = path.resolve(__dirname, "..");
      const filePath = path.join(bundlePath, "presets.json");
      fs.writeFileSync(filePath, JSON.stringify(presets, null, 2));
    } catch (err: any) {
      this.nodecg.log.error("Failed to save presets:", err.message);
    }
  }

  private loadPresetsFromFile() {
    try {
      const bundlePath = path.resolve(__dirname, "..");
      const filePath = path.join(bundlePath, "presets.json");
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, "utf8");
        const presets = JSON.parse(data);
        this.presetsRep.value = presets;
        this.nodecg.log.info(`Loaded ${presets.length} presets from file.`);
      }
    } catch (err: any) {
      this.nodecg.log.error("Failed to load presets:", err.message);
    }
  }

  public ping(connectionId?: string) {
    const versionQuery = "Command.Version = ?;";
    if (connectionId) {
      const vban = this.connections.get(connectionId);
      if (vban) vban.send(versionQuery);
    } else {
      this.connections.forEach((vban) => vban.send(versionQuery));
    }
  }

  private buildDiscoverySlots(): string[] {
    // VB-Audio Matrix uses fixed slot SUIDs. WDM/MME/KS are device
    // interface selectors, not slot names.
    const slots = new Set<string>([
      "ASIO128",
      "ASIO64A",
      "ASIO64B",
      "VBAN64",
      "VASIO8",
      "VASIO128",
      "VASIO64A",
      "VASIO64B",
    ]);

    const ranges: Array<[string, number, string?]> = [
      ["WIN", 4, ".IN"],
      ["WIN", 4, ".OUT"],
      ["VAIO", 4],
      ["VBAN", 4],
    ];

    ranges.forEach(([prefix, max, suffix = ""]) => {
      for (let i = 1; i <= max; i++) {
        slots.add(`${prefix}${i}${suffix}`);
      }
    });

    return [...slots];
  }

  private requestDeviceDiscovery(connectionId?: string, force = false) {
    const commonSlots = this.buildDiscoverySlots();

    const targets = connectionId
      ? [[connectionId, this.connections.get(connectionId)] as const]
      : Array.from(this.connections.entries());

    targets.forEach(([id, vban]) => {
      if (!vban) return;
      const now = Date.now();
      const lastRun = this.lastDiscoveryAt.get(id) || 0;
      if (!force && now - lastRun < 1500) return;

      this.lastDiscoveryAt.set(id, now);
      commonSlots.forEach((suid) => {
        vban.send(`Slot(${suid}).Device = ?;`);
        vban.send(`Slot(${suid}).Info = ?;`);
      });
      this.nodecg.log.info(
        `[VBAN] Requested ${commonSlots.length} Matrix slot probes for ${id}.`
      );
    });
  }

  private getMatrixPointKey(point: MatrixPointAddress): string {
    return [
      point.connectionId,
      point.inputDevice,
      point.inputChannel,
      point.outputDevice,
      point.outputChannel,
    ].join("|");
  }

  private getPointDeviceSuid(slotSuid: string): string {
    return slotSuid.replace(/\.(IN|OUT)$/i, "");
  }

  private getPatchIdForMatrixPoint(point: MatrixPointAddress): string {
    return `matrix-${this.getMatrixPointKey(point).replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  }

  private upsertMatrixPoint(
    point: MatrixPointAddress,
    updates: Partial<Omit<MatrixPointStatus, keyof MatrixPointAddress | "key">>
  ): MatrixPointStatus {
    const key = this.getMatrixPointKey(point);
    const currentPoints = this.matrixPointsRep.value || [];
    const existingIndex = currentPoints.findIndex(
      (candidate: MatrixPointStatus) => candidate.key === key
    );
    const previous = currentPoints[existingIndex];
    const nextPoint: MatrixPointStatus = {
      key,
      ...point,
      gain: updates.gain ?? previous?.gain ?? -144,
      mute: updates.mute ?? previous?.mute ?? false,
      exists: updates.exists ?? previous?.exists ?? false,
      updatedAt: Date.now(),
    };

    if (existingIndex >= 0) {
      currentPoints[existingIndex] = nextPoint;
      this.matrixPointsRep.value = [...currentPoints];
    } else {
      this.matrixPointsRep.value = [...currentPoints, nextPoint];
    }

    return nextPoint;
  }

  private upsertActivePatchFromMatrixPoint(
    point: MatrixPointAddress,
    updates: Partial<Pick<CurrentPatchStatus, "gain" | "mute" | "exists">>,
    createIfMissing: boolean
  ) {
    const currentPatches = this.activePatchesRep.value || [];
    const existingIndex = currentPatches.findIndex(
      (patch: CurrentPatchStatus) =>
        patch.connectionId === point.connectionId &&
        patch.inputDevice === point.inputDevice &&
        (patch.inputChannel || 1) === point.inputChannel &&
        patch.outputDevice === point.outputDevice &&
        (patch.outputChannel || 1) === point.outputChannel
    );

    if (existingIndex === -1 && !createIfMissing) {
      return;
    }

    const previous = currentPatches[existingIndex];
    const nextPatch: CurrentPatchStatus = {
      id: previous?.id || this.getPatchIdForMatrixPoint(point),
      ...point,
      gain: updates.gain ?? previous?.gain ?? -144,
      mute: updates.mute ?? previous?.mute ?? false,
      exists: updates.exists ?? previous?.exists ?? false,
    };

    if (existingIndex >= 0) {
      currentPatches[existingIndex] = nextPatch;
      this.activePatchesRep.value = [...currentPatches];
    } else {
      this.activePatchesRep.value = [...currentPatches, nextPatch];
    }
  }

  private refreshMatrix(connectionId?: string) {
    const connectionIds = connectionId
      ? [connectionId]
      : Array.from(this.connections.keys());
    const devices: DeviceInfo[] = this.availableDevicesRep.value || [];

    connectionIds.forEach((id) => {
      const vban = this.connections.get(id);
      if (!vban) return;

      const connectionDevices = devices.filter(
        (device: DeviceInfo) => device.connectionId === id
      );
      const inputDevices = connectionDevices.filter(
        (device: DeviceInfo) => device.inputs > 0
      );
      const outputDevices = connectionDevices.filter(
        (device: DeviceInfo) => device.outputs > 0
      );

      if (inputDevices.length === 0 || outputDevices.length === 0) {
        this.nodecg.log.warn(
          `[refreshMatrix] No discovered Matrix devices for ${id}.`
        );
        return;
      }

      inputDevices.forEach((inputDevice: DeviceInfo) => {
        const inputPointDevice = inputDevice.pointDevice || inputDevice.suid;
        for (
          let inputChannel = 1;
          inputChannel <= inputDevice.inputs;
          inputChannel++
        ) {
          outputDevices.forEach((outputDevice: DeviceInfo) => {
            const outputPointDevice =
              outputDevice.pointDevice || outputDevice.suid;
            for (
              let outputChannel = 1;
              outputChannel <= outputDevice.outputs;
              outputChannel++
            ) {
              vban.send(
                `Point(${inputPointDevice}.IN[${inputChannel}],${outputPointDevice}.OUT[${outputChannel}]).dBGain = ?;`
              );
              vban.send(
                `Point(${inputPointDevice}.IN[${inputChannel}],${outputPointDevice}.OUT[${outputChannel}]).Mute = ?;`
              );
            }
          });
        }
      });
    });
  }

  private toggleMatrixPoint(point: MatrixPointAddress) {
    if (
      !point?.connectionId ||
      !point.inputDevice ||
      !point.outputDevice ||
      !point.inputChannel ||
      !point.outputChannel
    ) {
      this.nodecg.log.warn("[toggleMatrixPoint] Invalid matrix point.");
      return;
    }

    const vban = this.connections.get(point.connectionId);
    if (!vban) {
      this.nodecg.log.warn(
        `[toggleMatrixPoint] Connection ${point.connectionId} not found.`
      );
      return;
    }

    const key = this.getMatrixPointKey(point);
    const currentPoint = (this.matrixPointsRep.value || []).find(
      (candidate: MatrixPointStatus) => candidate.key === key
    );
    const isPatched =
      !!currentPoint && currentPoint.exists && currentPoint.gain > -144;

    if (isPatched) {
      vban.send(
        `Point(${point.inputDevice}.IN[${point.inputChannel}],${point.outputDevice}.OUT[${point.outputChannel}]).Remove;`
      );
      this.upsertMatrixPoint(point, {
        exists: false,
        gain: -144,
        mute: false,
      });
      this.upsertActivePatchFromMatrixPoint(
        point,
        { exists: false, gain: -144, mute: false },
        false
      );
    } else {
      vban.send(
        `Point(${point.inputDevice}.IN[${point.inputChannel}],${point.outputDevice}.OUT[${point.outputChannel}]).dBGain = 0.0;`
      );
      vban.send(
        `Point(${point.inputDevice}.IN[${point.inputChannel}],${point.outputDevice}.OUT[${point.outputChannel}]).Mute = 0;`
      );
      this.upsertMatrixPoint(point, {
        exists: true,
        gain: 0,
        mute: false,
      });
      this.upsertActivePatchFromMatrixPoint(
        point,
        { exists: true, gain: 0, mute: false },
        true
      );
    }
  }

  private handleResponse(data: string, connectionId: string) {
    // Parse response from Matrix
    // this.nodecg.log.debug(`[VBAN ${connectionId}] Raw: ${data}`);

    const lines = data
      .split(/[\r\n]+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    for (const line of lines) {
      const commands = line
        .split(";")
        .map((cmd) => cmd.trim())
        .filter((cmd) => cmd.length > 0);

      for (const cmd of commands) {
        this.parseLine(cmd, connectionId);
      }
    }
  }

  private parseLine(line: string, connectionId: string) {
    // Example: "Point(Input,Output).dBGain = -6.0"
    // Example response to "?": "Command.Version = Matrix 1.0.1.8"

    if (line.includes("=")) {
      const [key, value] = line.split("=").map((s) => s.trim());
      // this.nodecg.log.debug(`[VBAN ${connectionId}] ${key} -> ${value}`);

      // Basic Version Check
      if (key === "Command.Version") {
        // Send success with connectionId
        this.nodecg.sendMessage("pingSuccess", {
          connectionId,
          version: value,
        });
      }

      // Device discovery responses
      if (key.includes("Slot") && key.includes(".Device")) {
        const match = key.match(/Slot\(([^)]+)\)\.Device/);
        if (
          match &&
          value &&
          value !== '""' &&
          value !== "" &&
          value !== "Err"
        ) {
          const suid = match[1];
          this.updateDeviceInfo(
            connectionId,
            suid,
            "device",
            value.replace(/"/g, "")
          );
        }
      }

      if (key.includes("Slot") && key.includes(".Info")) {
        const match = key.match(/Slot\(([^)]+)\)\.Info/);
        if (
          match &&
          value &&
          value !== '""' &&
          value !== "" &&
          value !== "Err"
        ) {
          const suid = match[1];
          const info = this.parseSlotInfo(value);
          if (info) {
            this.updateDeviceInfo(connectionId, suid, "info", {
              inputs: info.inputs,
              outputs: info.outputs,
            });
          }
        }
      }

      // Patch Status -> dBGain
      if (key.includes("Point") && key.includes(".dBGain")) {
        const match = key.match(
          /Point\(([^.]+)\.IN\[(\d+)\],\s*([^.]+)\.OUT\[(\d+)\]\)\.dBGain/
        );

        if (match && value) {
          const point: MatrixPointAddress = {
            connectionId,
            inputDevice: match[1],
            inputChannel: parseInt(match[2]),
            outputDevice: match[3],
            outputChannel: parseInt(match[4]),
          };

          if (value === "Err") {
            this.upsertMatrixPoint(point, {
              gain: -144,
              exists: false,
            });
            this.upsertActivePatchFromMatrixPoint(
              point,
              { gain: -144, exists: false },
              false
            );
            return;
          }

          const gainValue = parseFloat(value);
          if (!isNaN(gainValue)) {
            const exists = gainValue > -144;
            this.upsertMatrixPoint(point, {
              gain: gainValue,
              exists,
            });
            const currentPatches = this.activePatchesRep.value || [];
            let updated = false;

            const updatedPatches = currentPatches.map(
              (patch: CurrentPatchStatus) => {
                if (
                  patch.connectionId === point.connectionId &&
                  patch.inputDevice === point.inputDevice &&
                  (patch.inputChannel || 1) === point.inputChannel &&
                  patch.outputDevice === point.outputDevice &&
                  (patch.outputChannel || 1) === point.outputChannel
                ) {
                  updated = true;
                  return { ...patch, gain: gainValue, exists };
                }
                return patch;
              }
            );

            if (updated) {
              this.activePatchesRep.value = updatedPatches;
            }
          }
        }
      }

      // Patch Status -> Mute
      if (key.includes("Point") && key.includes(".Mute")) {
        const match = key.match(
          /Point\(([^.]+)\.IN\[(\d+)\],\s*([^.]+)\.OUT\[(\d+)\]\)\.Mute/
        );

        if (match && value) {
          const point: MatrixPointAddress = {
            connectionId,
            inputDevice: match[1],
            inputChannel: parseInt(match[2]),
            outputDevice: match[3],
            outputChannel: parseInt(match[4]),
          };

          if (value === "Err") {
            this.upsertMatrixPoint(point, {
              mute: false,
              exists: false,
            });
            this.upsertActivePatchFromMatrixPoint(
              point,
              { mute: false, exists: false },
              false
            );
            return;
          }

          const muteValue = parseInt(value);
          if (!isNaN(muteValue)) {
            this.upsertMatrixPoint(point, {
              mute: muteValue === 1,
            });
            const currentPatches = this.activePatchesRep.value || [];
            let updated = false;

            const updatedPatches = currentPatches.map(
              (patch: CurrentPatchStatus) => {
                if (
                  patch.connectionId === point.connectionId &&
                  patch.inputDevice === point.inputDevice &&
                  (patch.inputChannel || 1) === point.inputChannel &&
                  patch.outputDevice === point.outputDevice &&
                  (patch.outputChannel || 1) === point.outputChannel
                ) {
                  updated = true;
                  return {
                    ...patch,
                    mute: muteValue === 1,
                    exists: patch.exists ?? true,
                  };
                }
                return patch;
              }
            );

            if (updated) {
              this.activePatchesRep.value = updatedPatches;
            }
          }
        }
      }
    }
  }

  private deviceCache: Map<string, DeviceInfo> = new Map(); // Key: "connectionId:suid"

  private parseSlotInfo(value: string): { inputs: number; outputs: number } | null {
    const normalized = value.replace(/["“”]/g, "").trim();
    const directMatch = normalized.match(
      /\bin\s*:?\s*(\d+)\s*[,;/ ]+\s*out\s*:?\s*(\d+)/i
    );
    if (directMatch) {
      return {
        inputs: parseInt(directMatch[1], 10),
        outputs: parseInt(directMatch[2], 10),
      };
    }

    const inputMatch = normalized.match(/\bin(?:put)?s?\s*:?\s*(\d+)/i);
    const outputMatch = normalized.match(/\bout(?:put)?s?\s*:?\s*(\d+)/i);
    if (inputMatch || outputMatch) {
      return {
        inputs: inputMatch ? parseInt(inputMatch[1], 10) : 0,
        outputs: outputMatch ? parseInt(outputMatch[1], 10) : 0,
      };
    }

    return null;
  }

  private updateDeviceInfo(
    connectionId: string,
    suid: string,
    type: "device" | "info",
    data: any
  ) {
    const key = `${connectionId}:${suid}`;
    let device = this.deviceCache.get(key) || {
      connectionId,
      suid,
      pointDevice: this.getPointDeviceSuid(suid),
      name: suid,
      inputs: 0,
      outputs: 0,
    };

    if (type === "device") {
      device.name = data || suid;
    } else if (type === "info") {
      device.inputs = data.inputs;
      device.outputs = data.outputs;
    }

    this.deviceCache.set(key, device);

    const devices = Array.from(this.deviceCache.values()).filter(
      (d) => d.inputs > 0 || d.outputs > 0
    );
    this.availableDevicesRep.value = devices;
  }
}
