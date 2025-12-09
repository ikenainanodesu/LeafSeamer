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
  private patchStatusRep: any;
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

    // Available devices from Matrix
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
    this.nodecg.listenFor(
      "selectPatch",
      (patch: {
        inputDevice: string;
        inputChannel: number;
        outputDevice: string;
        outputChannel: number;
      }) => {
        // Validate input
        if (!patch.inputDevice || !patch.outputDevice) {
          this.nodecg.log.warn(
            "[selectPatch] Invalid patch: missing device(s)"
          );
          return;
        }

        this.nodecg.log.info("Select Patch Requested:", patch);

        // Initialize with exists: false. If we get a response, we'll set it to true.
        // Initialize with exists: false. If we get a response, we'll set it to true.
        const initialStatus = {
          ...patch,
          gain: -144.0,
          mute: false,
          exists: false,
        };

        this.nodecg.Replicant("currentPatchStatus").value = initialStatus;
        this.nodecg.log.info(
          "[selectPatch] Set Replicant to initialized state (gain:-144, exists:false)"
        );

        const inCh = patch.inputChannel || 1;
        const outCh = patch.outputChannel || 1;

        // Query actual status from Matrix
        // If the point exists, Matrix will return values.
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
          // Verify removal by NOT getting a response? Or just assume it's gone.
          // We update replicant below.
        } else {
          // Handle "Patch" / Update
          // If it was previously not existing (or we want to ensure it exists), ensure we set meaningful values
          // If exists was false (or undefined) and now is true, we might want to set defaults if gain not present?
          // Usually updatePatch comes with specific props.

          // Set gain
          if (typeof patch.gain === "number") {
            const gainCmd = `Point(${patch.inputDevice}.IN[${inCh}],${patch.outputDevice}.OUT[${outCh}]).dBGain = ${patch.gain.toFixed(1)};`;
            this.nodecg.log.info(`[VBAN Send] ${gainCmd}`);
            this.vban.send(gainCmd);
          } else if (
            patch.exists === true &&
            typeof patch.gain === "undefined"
          ) {
            // If we are strictly "connecting" without a specific gain, default to 0dB?
            // Depending on UI logic. If UI just sends { exists: true }, we should probably set 0dB.
            // But let's check Replicant to see if we already have a gain?
            const currentPatch =
              this.nodecg.Replicant<CurrentPatchStatus>(
                "currentPatchStatus"
              ).value;
            if (currentPatch && !currentPatch.exists) {
              // Was unconnected, now connecting -> Default 0dB
              const gainCmd = `Point(${patch.inputDevice}.IN[${inCh}],${patch.outputDevice}.OUT[${outCh}]).dBGain = 0.0;`;
              this.nodecg.log.info(
                `[VBAN Send] ${gainCmd} (Default connection)`
              );
              this.vban.send(gainCmd);
              patch.gain = 0; // Update local patch obj for Replicant update
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
      this.nodecg.Replicant("currentPatchStatus").value = patch;
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
        // Deep clone values to detach from Replicant proxies
        const currentPatch = JSON.parse(
          JSON.stringify(this.nodecg.Replicant<any>("currentPatchStatus").value)
        );
        const netConfig = JSON.parse(JSON.stringify(this.netConfigRep.value));

        if (!currentPatch) {
          this.nodecg.log.warn("Cannot save preset: No patch selected.");
          return;
        }

        const newPreset: Preset = {
          id: data.slotId,
          name: data.name,
          network: netConfig,
          patches: [{ id: "main", ...currentPatch, status: currentPatch }],
        };

        const currentPresets = this.presetsRep.value || [];
        // Clone existing presets array to modify it safely (though mostly handled by NodeCG)
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
      this.nodecg.log.info(`[deletePreset] Request to delete: ${presetId}`);

      // Deep clone to ensure we aren't fighting with Proxies
      const currentPresets = JSON.parse(
        JSON.stringify(this.presetsRep.value || [])
      );
      const initialLength = currentPresets.length;

      const newPresetsList = currentPresets.filter(
        (p: Preset) => p.id !== presetId
      );

      if (newPresetsList.length === initialLength) {
        this.nodecg.log.warn(
          `[deletePreset] ID ${presetId} not found in presets list. Available IDs: ${currentPresets.map((p: any) => p.id).join(", ")}`
        );
      } else {
        this.nodecg.log.info(
          `[deletePreset] Deleted successfully. Remaining: ${newPresetsList.length}`
        );
      }

      this.presetsRep.value = newPresetsList;
      this.savePresetsToFile(newPresetsList);
    });

    this.nodecg.listenFor("loadPreset", (presetId: string) => {
      const presets = this.presetsRep.value || [];
      const preset = presets.find((p: Preset) => p.id === presetId);
      if (preset) {
        this.nodecg.log.info(`Loading Preset: ${preset.name}`);
        // Apply Network Config
        // Deep clone to avoid Replicant ownership error
        this.netConfigRep.value = JSON.parse(JSON.stringify(preset.network));

        // Apply Patch
        if (preset.patches && preset.patches.length > 0) {
          const p = preset.patches[0];
          // Apply logic:
          // Point(In, Out).dBGain = X
          // Point(In, Out).Mute = X
          // Deep clone status
          this.nodecg.Replicant("currentPatchStatus").value = JSON.parse(
            JSON.stringify(p.status || p)
          );

          // Construct command
          // const cmd = `Point(${p.inputDevice}.IN[${p.inputChannel}], ...).dBGain = ${p.status.gain}`;
          // this.vban.send(cmd);
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
            const currentPatch =
              this.nodecg.Replicant<CurrentPatchStatus>(
                "currentPatchStatus"
              ).value;

            // Validate match against current patch
            if (
              currentPatch &&
              match[1] === currentPatch.inputDevice &&
              parseInt(match[2]) === (currentPatch.inputChannel || 1) &&
              match[3] === currentPatch.outputDevice &&
              parseInt(match[4]) === (currentPatch.outputChannel || 1)
            ) {
              currentPatch.gain = gainValue;
              currentPatch.exists = true; // Received data means it exists
              this.nodecg.Replicant("currentPatchStatus").value = {
                ...currentPatch,
              };
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
            const currentPatch =
              this.nodecg.Replicant<CurrentPatchStatus>(
                "currentPatchStatus"
              ).value;

            // Validate match against current patch
            if (
              currentPatch &&
              match[1] === currentPatch.inputDevice &&
              parseInt(match[2]) === (currentPatch.inputChannel || 1) &&
              match[3] === currentPatch.outputDevice &&
              parseInt(match[4]) === (currentPatch.outputChannel || 1)
            ) {
              currentPatch.mute = muteValue === 1;
              currentPatch.exists = true;
              this.nodecg.Replicant("currentPatchStatus").value = {
                ...currentPatch,
              };
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
