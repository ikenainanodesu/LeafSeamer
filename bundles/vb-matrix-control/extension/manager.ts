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
} from "../src/types";

export class MatrixManager {
  private nodecg: NodeCG.ServerAPI;
  private connections: Map<string, VBANTransmitter> = new Map();

  // Replicants
  private netConfigsRep: any;
  private activePatchesRep: any;
  private presetsRep: any;
  private hostInfoRep: any;
  private availableDevicesRep: any;

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
        vban = new VBANTransmitter();
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

        // Handle "Unpatch" (Remove)
        if (patch.exists === false) {
          const removeCmd = `Point(${patch.inputDevice}.IN[${inCh}],${patch.outputDevice}.OUT[${outCh}]).Remove;`;
          vban.send(removeCmd);
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

    this.nodecg.listenFor("refreshDevices", () => {
      // Query ALL connections
      const commonSlots = [
        "ASIO1",
        "ASIO2",
        "ASIO128",
        "VBAN1",
        "VBAN2",
        "VBAN3",
        "VBAN4",
        "VBAN5",
        "VBAN6",
        "VBAN7",
        "VBAN8",
        "VAIO1",
        "VAIO2",
        "VAIO3",
        "VAIO4",
        "VAIO5",
        "VAIO6",
        "VAIO7",
        "VAIO8",
        "VAIO9",
        "VAIO10",
        "VAIO11",
        "VAIO12",
        "VAIO13",
        "VAIO14",
        "VAIO15",
        "VAIO16",
        "WDM1",
        "WDM2",
        "MME1",
        "MME2",
        "KS1",
        "KS2",
      ];

      this.connections.forEach((vban) => {
        commonSlots.forEach((suid) => {
          vban.send(`Slot(${suid}).Device = ?;`);
          vban.send(`Slot(${suid}).Info = ?;`);
        });
      });
    });

    this.nodecg.listenFor(
      "savePresetToBank",
      (data: { slotId: string; name: string }) => {
        // Deep clone active patches
        const currentPatches = JSON.parse(
          JSON.stringify(this.activePatchesRep.value || [])
        );
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
          });
        }
      }
    });
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
          const infoMatch = value.match(/In:(\d+),\s*Out:(\d+)/i);
          if (infoMatch) {
            this.updateDeviceInfo(connectionId, suid, "info", {
              inputs: parseInt(infoMatch[1]),
              outputs: parseInt(infoMatch[2]),
            });
          }
        }
      }

      // Patch Status -> dBGain
      if (key.includes("Point") && key.includes(".dBGain")) {
        const match = key.match(
          /Point\(([^.]+)\.IN\[(\d+)\],\s*([^.]+)\.OUT\[(\d+)\]\)\.dBGain/
        );

        if (match && value && value !== "Err") {
          const gainValue = parseFloat(value);
          if (!isNaN(gainValue)) {
            const currentPatches = this.activePatchesRep.value || [];
            let updated = false;

            const updatedPatches = currentPatches.map(
              (patch: CurrentPatchStatus) => {
                if (
                  patch.connectionId === connectionId && // Check connection
                  patch.inputDevice === match[1] &&
                  (patch.inputChannel || 1) === parseInt(match[2]) &&
                  patch.outputDevice === match[3] &&
                  (patch.outputChannel || 1) === parseInt(match[4])
                ) {
                  updated = true;
                  return { ...patch, gain: gainValue, exists: true };
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

        if (match && value && value !== "Err") {
          const muteValue = parseInt(value);
          if (!isNaN(muteValue)) {
            const currentPatches = this.activePatchesRep.value || [];
            let updated = false;

            const updatedPatches = currentPatches.map(
              (patch: CurrentPatchStatus) => {
                if (
                  patch.connectionId === connectionId && // Check connection
                  patch.inputDevice === match[1] &&
                  (patch.inputChannel || 1) === parseInt(match[2]) &&
                  patch.outputDevice === match[3] &&
                  (patch.outputChannel || 1) === parseInt(match[4])
                ) {
                  updated = true;
                  return { ...patch, mute: muteValue === 1, exists: true };
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
