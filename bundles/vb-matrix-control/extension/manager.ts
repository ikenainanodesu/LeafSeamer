import * as os from "os";
import * as fs from "fs";
import * as path from "path";
import NodeCG from "nodecg/types";
import { VBANTransmitter } from "./vban";
import { NetworkConfig, Preset, CurrentPatchStatus } from "../src/types";

export class MatrixManager {
  private nodecg: NodeCG.ServerAPI;
  private vban: VBANTransmitter;

  // Replicants
  private netConfigRep: any;
  private activePatchesRep: any;
  private presetsRep: any;
  private hostInfoRep: any;

  constructor(nodecg: NodeCG.ServerAPI) {
    this.nodecg = nodecg;
    this.vban = new VBANTransmitter();

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
    this.netConfigRep = this.nodecg.Replicant<NetworkConfig>("networkConfig", {
      defaultValue: {
        ip: "127.0.0.1",
        port: 6980,
        streamName: "Command1",
      },
    });

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
        defaultValue: [
          {
            id: "default",
            inputDevice: "",
            inputChannel: 1,
            outputDevice: "",
            outputChannel: 1,
            gain: -144.0,
            mute: false,
            exists: false,
          },
        ],
      }
    );
    this.nodecg.Replicant<any[]>("availableDevices", {
      defaultValue: [],
    });

    // Handle config changes
    this.netConfigRep.on("change", (newVal: NetworkConfig) => {
      this.vban.setConfig(newVal.ip, newVal.port, newVal.streamName);
    });
  }

  private initListeners() {
    // VBAN Listeners
    this.nodecg.listenFor("sendVBAN", (command: string) => {
      this.vban.send(command);
    });

    this.vban.on("data", (data: string) => {
      this.handleResponse(data);
    });

    this.vban.on("error", (err: Error) => {
      this.nodecg.log.error("VBAN Error:", err.message);
    });

    this.nodecg.listenFor("ping", () => {
      this.ping();
    });

    // Dashboard Listeners
    this.nodecg.listenFor("addPatch", () => {
      const currentPatches = this.activePatchesRep.value || [];
      const newPatch: CurrentPatchStatus = {
        id: Math.random().toString(36).substr(2, 9),
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
        inputDevice: string;
        inputChannel: number;
        outputDevice: string;
        outputChannel: number;
      }) => {
        // Validate input
        if (!patch.id || !patch.inputDevice || !patch.outputDevice) {
          this.nodecg.log.warn(
            "[selectPatch] Invalid patch: missing id or device(s)"
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
          ...patch,
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
          `[selectPatch] Sending Queries: ${gainQuery} ; ${muteQuery}`
        );
        this.vban.send(gainQuery);
        this.vban.send(muteQuery);
      }
    );

    this.nodecg.listenFor("updatePatch", (patch: any) => {
      this.nodecg.log.info("Update Patch:", patch);

      // Send VBAN commands to Matrix
      // Format: Point(SUID.IN[n], SUID.OUT[j]).dBGain = X;
      if (patch.inputDevice && patch.outputDevice) {
        const inCh = patch.inputChannel || 1;
        const outCh = patch.outputChannel || 1;

        // Handle "Unpatch" (Remove)
        if (patch.exists === false) {
          const removeCmd = `Point(${patch.inputDevice}.IN[${inCh}],${patch.outputDevice}.OUT[${outCh}]).Remove;`;
          this.nodecg.log.info(`[VBAN Send] ${removeCmd}`);
          this.vban.send(removeCmd);
        } else {
          // Handle "Patch" / Update

          // Set gain
          if (typeof patch.gain === "number") {
            const gainCmd = `Point(${patch.inputDevice}.IN[${inCh}],${patch.outputDevice}.OUT[${outCh}]).dBGain = ${patch.gain.toFixed(1)};`;
            this.nodecg.log.info(`[VBAN Send] ${gainCmd}`);
            this.vban.send(gainCmd);
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
              this.nodecg.log.info(
                `[VBAN Send] ${gainCmd} (Default connection)`
              );
              this.vban.send(gainCmd);
              patch.gain = 0;
            }
          }

          // Set mute
          if (typeof patch.mute === "boolean") {
            const muteCmd = `Point(${patch.inputDevice}.IN[${inCh}],${patch.outputDevice}.OUT[${outCh}]).Mute = ${patch.mute ? 1 : 0};`;
            this.nodecg.log.info(`[VBAN Send] ${muteCmd}`);
            this.vban.send(muteCmd);
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
      // Query Matrix for available slots
      // SUID should be complete slot names like "ASIO1", "VBAN1"
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

      // Query each slot for device info
      commonSlots.forEach((suid) => {
        this.vban.send(`Slot(${suid}).Device = ?;`);
        this.vban.send(`Slot(${suid}).Info = ?;`);
      });
    });

    this.nodecg.listenFor(
      "savePresetToBank",
      (data: { slotId: string; name: string }) => {
        // Deep clone active patches
        const currentPatches = JSON.parse(
          JSON.stringify(this.activePatchesRep.value || [])
        );
        const netConfig = JSON.parse(JSON.stringify(this.netConfigRep.value));

        // removed "no patch selected" check as we can save even empty or multiple configs

        const newPreset: Preset = {
          id: data.slotId,
          name: data.name,
          network: netConfig,
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
      // ... (existing implementation is mostly fine, just ensuring context match)
      this.nodecg.log.info(`[deletePreset] Request to delete: ${presetId}`);

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
        this.netConfigRep.value = JSON.parse(JSON.stringify(preset.network));

        if (preset.patches) {
          // Deep clone status
          const patchesToLoad = JSON.parse(JSON.stringify(preset.patches));
          this.activePatchesRep.value = patchesToLoad;

          // Send Commands for ALL patches
          patchesToLoad.forEach((p: CurrentPatchStatus) => {
            const inCh = p.inputChannel || 1;
            const outCh = p.outputChannel || 1;
            if (typeof p.gain === "number") {
              this.vban.send(
                `Point(${p.inputDevice}.IN[${inCh}],${p.outputDevice}.OUT[${outCh}]).dBGain = ${p.gain.toFixed(1)};`
              );
            }
            if (typeof p.mute === "boolean") {
              this.vban.send(
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

  public ping() {
    // Poll for basic info to ensure connection
    const versionQuery = "Command.Version = ?;";
    this.nodecg.log.debug(`[VBAN Ping] Sending: ${versionQuery}`);
    this.vban.send(versionQuery);
  }

  // ... listener added in initListeners
  // (Using separate tool call for initListeners update)

  private handleResponse(data: string) {
    // Parse response from Matrix
    // Log raw response for debugging
    this.nodecg.log.info(`[VBAN Response] Raw: ${data}`);

    // Split by lines first, then by semicolons
    // Matrix responses are typically line-based, with semicolons ending each command
    const lines = data
      .split(/[\r\n]+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    for (const line of lines) {
      // Each line may contain multiple semicolon-terminated commands
      const commands = line
        .split(";")
        .map((cmd) => cmd.trim())
        .filter((cmd) => cmd.length > 0);

      for (const cmd of commands) {
        this.parseLine(cmd);
      }
    }
  }

  private parseLine(line: string) {
    // Example: "Point(Input,Output).dBGain = -6.0"
    // Example response to "?": "Command.Version = Matrix 1.0.1.8"
    this.nodecg.log.debug(`[VBAN Parse] Line: ${line}`);

    if (line.includes("=")) {
      const [key, value] = line.split("=").map((s) => s.trim());

      // Update local state or Replicants based on key
      // This is a simplified handler. State parsing logic will need to vary
      // based on exact response format which we need to verify in practice.
      this.nodecg.log.info(`[VBAN] ${key} -> ${value}`);

      // Basic Version Check
      if (key === "Command.Version") {
        // Could store this status
        this.nodecg.sendMessage("pingSuccess", value);
      }

      // Device discovery responses
      if (key.includes("Slot") && key.includes(".Device")) {
        // Extract SUID from key: Slot(ASIO128).Device.ASIO or Slot(ASIO128).Device
        const match = key.match(/Slot\(([^)]+)\)\.Device/);
        if (
          match &&
          value &&
          value !== '""' &&
          value !== "" &&
          value !== "Err"
        ) {
          const suid = match[1]; // e.g., "ASIO128" or "VBAN1"
          this.updateDeviceInfo(suid, "device", value.replace(/"/g, ""));
        }
      }

      if (key.includes("Slot") && key.includes(".Info")) {
        // Extract SUID and parse info: "In:18, Out:18, MaxIn:128, MaxOut:128"
        const match = key.match(/Slot\(([^)]+)\)\.Info/);
        if (
          match &&
          value &&
          value !== '""' &&
          value !== "" &&
          value !== "Err"
        ) {
          const suid = match[1]; // e.g., "ASIO128" or "VBAN1"
          // Parse "In:4, Out:8" (case-insensitive)
          const infoMatch = value.match(/In:(\d+),\s*Out:(\d+)/i);
          if (infoMatch) {
            this.updateDeviceInfo(suid, "info", {
              inputs: parseInt(infoMatch[1]),
              outputs: parseInt(infoMatch[2]),
            });
          }
        }
      }

      // Patch Status - Query responses
      // Point(SUID.IN[n], SUID.OUT[j]).dBGain = -6.0
      if (key.includes("Point") && key.includes(".dBGain")) {
        const match = key.match(
          /Point\(([^.]+)\.IN\[(\d+)\],\s*([^.]+)\.OUT\[(\d+)\]\)\.dBGain/
        );

        if (match && value && value !== "Err") {
          const gainValue = parseFloat(value);
          if (!isNaN(gainValue)) {
            const currentPatches = this.activePatchesRep.value || [];
            let updated = false;

            // Find all matching patches and update them
            const updatedPatches = currentPatches.map(
              (patch: CurrentPatchStatus) => {
                if (
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

      // Point(SUID.IN[n], SUID.OUT[j]).Mute = 1
      if (key.includes("Point") && key.includes(".Mute")) {
        const match = key.match(
          /Point\(([^.]+)\.IN\[(\d+)\],\s*([^.]+)\.OUT\[(\d+)\]\)\.Mute/
        );

        if (match && value && value !== "Err") {
          const muteValue = parseInt(value);
          if (!isNaN(muteValue)) {
            const currentPatches = this.activePatchesRep.value || [];
            let updated = false;

            // Find all matching patches and update them
            const updatedPatches = currentPatches.map(
              (patch: CurrentPatchStatus) => {
                if (
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

      // Patch Status
      // key: Point(SUID.IN[2], SUID.OUT[3]).dBGain
      if (key.includes("Point") && key.includes("dBGain")) {
        // Parse indices and update patch Replicant
      }
    }
  }

  private deviceCache: Map<string, any> = new Map();

  private updateDeviceInfo(suid: string, type: "device" | "info", data: any) {
    let device = this.deviceCache.get(suid) || {
      suid,
      name: suid, // Use SUID as default name
      inputs: 0,
      outputs: 0,
    };

    if (type === "device") {
      device.name = data || suid; // Use device name or fallback to SUID
    } else if (type === "info") {
      device.inputs = data.inputs;
      device.outputs = data.outputs;
    }

    this.deviceCache.set(suid, device);

    // Update Replicant with devices that have channel info
    const devices = Array.from(this.deviceCache.values()).filter(
      (d) => d.inputs > 0 || d.outputs > 0
    );
    this.nodecg.Replicant("availableDevices").value = devices;
    this.nodecg.log.info(
      `[Device Discovery] Updated devices: ${devices.map((d) => `${d.suid}(${d.name})`).join(", ")}`
    );
  }

  public getReplicants() {
    return {
      networkConfig: this.netConfigRep,
      presets: this.presetsRep,
    };
  }
}
