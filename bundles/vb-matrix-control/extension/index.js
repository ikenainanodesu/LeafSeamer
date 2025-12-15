"use strict";
const os = require("os");
const fs = require("fs");
const path = require("path");
const dgram = require("dgram");
const events = require("events");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const os__namespace = /* @__PURE__ */ _interopNamespaceDefault(os);
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
const VBAN_HEADER_SIZE = 28;
const VBAN_PROTOCOL_TEXT = 64;
const VBAN_BPS_256000 = 18;
class VBANTransmitter extends events.EventEmitter {
  constructor() {
    super();
    this.ip = "127.0.0.1";
    this.port = 6980;
    this.streamName = "Command1";
    this.packetCounter = 0;
    this.socket = dgram.createSocket("udp4");
    this.socket.on("listening", () => {
      const address = this.socket.address();
      console.log(
        `[VBAN] Socket listening on ${address.address}:${address.port}`
      );
    });
    this.socket.on("message", (msg, rinfo) => {
      if (msg.length < VBAN_HEADER_SIZE) return;
      if (msg.toString("ascii", 0, 4) !== "VBAN") return;
      const payload = msg.toString("utf8", VBAN_HEADER_SIZE);
      this.emit("data", payload, rinfo);
    });
    this.socket.on("error", (err) => {
      this.emit("error", err);
    });
    this.socket.bind(0);
  }
  setConfig(ip, port, streamName) {
    this.ip = ip;
    this.port = port;
    this.streamName = streamName;
  }
  send(text) {
    if (!text) return;
    const buffer = Buffer.alloc(VBAN_HEADER_SIZE + Buffer.byteLength(text));
    buffer.write("VBAN", 0);
    buffer.writeUInt8(VBAN_PROTOCOL_TEXT | VBAN_BPS_256000, 4);
    buffer.writeUInt8(0, 5);
    buffer.writeUInt8(0, 6);
    buffer.writeUInt8(0, 7);
    buffer.write(this.streamName, 8, 16);
    buffer.writeUInt32LE(this.packetCounter++, 24);
    buffer.write(text, 28);
    this.socket.send(buffer, this.port, this.ip, (err) => {
      if (err) this.emit("error", err);
    });
  }
  destroy() {
    this.socket.close();
  }
}
class MatrixManager {
  constructor(nodecg) {
    this.deviceCache = /* @__PURE__ */ new Map();
    this.nodecg = nodecg;
    this.vban = new VBANTransmitter();
    this.initReplicants();
    this.initListeners();
    this.loadPresetsFromFile();
  }
  getLocalIPs() {
    const interfaces = os__namespace.networkInterfaces();
    const ips = [];
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if ("IPv4" !== iface.family || iface.internal) {
          continue;
        }
        ips.push(iface.address);
      }
    }
    return ips;
  }
  initReplicants() {
    this.netConfigRep = this.nodecg.Replicant("networkConfig", {
      defaultValue: {
        ip: "127.0.0.1",
        port: 6980,
        streamName: "Command1"
      }
    });
    this.hostInfoRep = this.nodecg.Replicant("hostInfo", {
      defaultValue: { ips: this.getLocalIPs() },
      persistent: false
    });
    this.presetsRep = this.nodecg.Replicant("presets", {
      defaultValue: []
    });
    this.nodecg.Replicant("availableDevices", {
      defaultValue: []
    });
    this.netConfigRep.on("change", (newVal) => {
      this.vban.setConfig(newVal.ip, newVal.port, newVal.streamName);
    });
  }
  initListeners() {
    this.nodecg.listenFor("sendVBAN", (command) => {
      this.vban.send(command);
    });
    this.vban.on("data", (data) => {
      this.handleResponse(data);
    });
    this.vban.on("error", (err) => {
      this.nodecg.log.error("VBAN Error:", err.message);
    });
    this.nodecg.listenFor("ping", () => {
      this.ping();
    });
    this.nodecg.listenFor(
      "selectPatch",
      (patch) => {
        if (!patch.inputDevice || !patch.outputDevice) {
          this.nodecg.log.warn(
            "[selectPatch] Invalid patch: missing device(s)"
          );
          return;
        }
        this.nodecg.log.info("Select Patch Requested:", patch);
        const initialStatus = {
          ...patch,
          gain: -144,
          mute: false,
          exists: false
        };
        this.nodecg.Replicant("currentPatchStatus").value = initialStatus;
        this.nodecg.log.info(
          "[selectPatch] Set Replicant to initialized state (gain:-144, exists:false)"
        );
        const inCh = patch.inputChannel || 1;
        const outCh = patch.outputChannel || 1;
        const gainQuery = `Point(${patch.inputDevice}.IN[${inCh}],${patch.outputDevice}.OUT[${outCh}]).dBGain = ?;`;
        const muteQuery = `Point(${patch.inputDevice}.IN[${inCh}],${patch.outputDevice}.OUT[${outCh}]).Mute = ?;`;
        this.nodecg.log.info(
          `[selectPatch] Sending Queries: ${gainQuery} ; ${muteQuery}`
        );
        this.vban.send(gainQuery);
        this.vban.send(muteQuery);
      }
    );
    this.nodecg.listenFor("updatePatch", (patch) => {
      this.nodecg.log.info("Update Patch:", patch);
      if (patch.inputDevice && patch.outputDevice) {
        const inCh = patch.inputChannel || 1;
        const outCh = patch.outputChannel || 1;
        if (patch.exists === false) {
          const removeCmd = `Point(${patch.inputDevice}.IN[${inCh}],${patch.outputDevice}.OUT[${outCh}]).Remove;`;
          this.nodecg.log.info(`[VBAN Send] ${removeCmd}`);
          this.vban.send(removeCmd);
        } else {
          if (typeof patch.gain === "number") {
            const gainCmd = `Point(${patch.inputDevice}.IN[${inCh}],${patch.outputDevice}.OUT[${outCh}]).dBGain = ${patch.gain.toFixed(1)};`;
            this.nodecg.log.info(`[VBAN Send] ${gainCmd}`);
            this.vban.send(gainCmd);
          } else if (patch.exists === true && typeof patch.gain === "undefined") {
            const currentPatch = this.nodecg.Replicant(
              "currentPatchStatus"
            ).value;
            if (currentPatch && !currentPatch.exists) {
              const gainCmd = `Point(${patch.inputDevice}.IN[${inCh}],${patch.outputDevice}.OUT[${outCh}]).dBGain = 0.0;`;
              this.nodecg.log.info(
                `[VBAN Send] ${gainCmd} (Default connection)`
              );
              this.vban.send(gainCmd);
              patch.gain = 0;
            }
          }
          if (typeof patch.mute === "boolean") {
            const muteCmd = `Point(${patch.inputDevice}.IN[${inCh}],${patch.outputDevice}.OUT[${outCh}]).Mute = ${patch.mute ? 1 : 0};`;
            this.nodecg.log.info(`[VBAN Send] ${muteCmd}`);
            this.vban.send(muteCmd);
          }
        }
      }
      this.nodecg.Replicant("currentPatchStatus").value = patch;
    });
    this.nodecg.listenFor("refreshDevices", () => {
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
        "KS2"
      ];
      commonSlots.forEach((suid) => {
        this.vban.send(`Slot(${suid}).Device = ?;`);
        this.vban.send(`Slot(${suid}).Info = ?;`);
      });
    });
    this.nodecg.listenFor(
      "savePresetToBank",
      (data) => {
        const currentPatch = JSON.parse(
          JSON.stringify(this.nodecg.Replicant("currentPatchStatus").value)
        );
        const netConfig = JSON.parse(JSON.stringify(this.netConfigRep.value));
        if (!currentPatch) {
          this.nodecg.log.warn("Cannot save preset: No patch selected.");
          return;
        }
        const newPreset = {
          id: data.slotId,
          name: data.name,
          network: netConfig,
          patches: [{ id: "main", ...currentPatch, status: currentPatch }]
        };
        const currentPresets = this.presetsRep.value || [];
        const newPresetsList = JSON.parse(JSON.stringify(currentPresets));
        const existingIndex = newPresetsList.findIndex(
          (p) => p.id === data.slotId
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
    this.nodecg.listenFor("deletePreset", (presetId) => {
      this.nodecg.log.info(`[deletePreset] Request to delete: ${presetId}`);
      const currentPresets = JSON.parse(
        JSON.stringify(this.presetsRep.value || [])
      );
      const initialLength = currentPresets.length;
      const newPresetsList = currentPresets.filter(
        (p) => p.id !== presetId
      );
      if (newPresetsList.length === initialLength) {
        this.nodecg.log.warn(
          `[deletePreset] ID ${presetId} not found in presets list. Available IDs: ${currentPresets.map((p) => p.id).join(", ")}`
        );
      } else {
        this.nodecg.log.info(
          `[deletePreset] Deleted successfully. Remaining: ${newPresetsList.length}`
        );
      }
      this.presetsRep.value = newPresetsList;
      this.savePresetsToFile(newPresetsList);
    });
    this.nodecg.listenFor("loadPreset", (presetId) => {
      const presets = this.presetsRep.value || [];
      const preset = presets.find((p) => p.id === presetId);
      if (preset) {
        this.nodecg.log.info(`Loading Preset: ${preset.name}`);
        this.netConfigRep.value = JSON.parse(JSON.stringify(preset.network));
        if (preset.patches && preset.patches.length > 0) {
          const p = preset.patches[0];
          const status = JSON.parse(JSON.stringify(p.status || p));
          this.nodecg.Replicant("currentPatchStatus").value = status;
          if (status) {
            const inCh = p.inputChannel || 1;
            const outCh = p.outputChannel || 1;
            if (typeof status.gain === "number") {
              const gainCmd = `Point(${p.inputDevice}.IN[${inCh}],${p.outputDevice}.OUT[${outCh}]).dBGain = ${status.gain.toFixed(1)};`;
              this.nodecg.log.info(`[loadPreset] Sending: ${gainCmd}`);
              this.vban.send(gainCmd);
            }
            if (typeof status.mute === "boolean") {
              const muteCmd = `Point(${p.inputDevice}.IN[${inCh}],${p.outputDevice}.OUT[${outCh}]).Mute = ${status.mute ? 1 : 0};`;
              this.nodecg.log.info(`[loadPreset] Sending: ${muteCmd}`);
              this.vban.send(muteCmd);
            }
          }
        }
      }
    });
  }
  savePresetsToFile(presets) {
    try {
      const bundlePath = path__namespace.resolve(__dirname, "..");
      const filePath = path__namespace.join(bundlePath, "presets.json");
      fs__namespace.writeFileSync(filePath, JSON.stringify(presets, null, 2));
    } catch (err) {
      this.nodecg.log.error("Failed to save presets:", err.message);
    }
  }
  loadPresetsFromFile() {
    try {
      const bundlePath = path__namespace.resolve(__dirname, "..");
      const filePath = path__namespace.join(bundlePath, "presets.json");
      if (fs__namespace.existsSync(filePath)) {
        const data = fs__namespace.readFileSync(filePath, "utf8");
        const presets = JSON.parse(data);
        this.presetsRep.value = presets;
        this.nodecg.log.info(`Loaded ${presets.length} presets from file.`);
      }
    } catch (err) {
      this.nodecg.log.error("Failed to load presets:", err.message);
    }
  }
  ping() {
    const versionQuery = "Command.Version = ?;";
    this.nodecg.log.debug(`[VBAN Ping] Sending: ${versionQuery}`);
    this.vban.send(versionQuery);
  }
  // ... listener added in initListeners
  // (Using separate tool call for initListeners update)
  handleResponse(data) {
    this.nodecg.log.info(`[VBAN Response] Raw: ${data}`);
    const lines = data.split(/[\r\n]+/).map((line) => line.trim()).filter((line) => line.length > 0);
    for (const line of lines) {
      const commands = line.split(";").map((cmd) => cmd.trim()).filter((cmd) => cmd.length > 0);
      for (const cmd of commands) {
        this.parseLine(cmd);
      }
    }
  }
  parseLine(line) {
    this.nodecg.log.debug(`[VBAN Parse] Line: ${line}`);
    if (line.includes("=")) {
      const [key, value] = line.split("=").map((s) => s.trim());
      this.nodecg.log.info(`[VBAN] ${key} -> ${value}`);
      if (key === "Command.Version") {
        this.nodecg.sendMessage("pingSuccess", value);
      }
      if (key.includes("Slot") && key.includes(".Device")) {
        const match = key.match(/Slot\(([^)]+)\)\.Device/);
        if (match && value && value !== '""' && value !== "" && value !== "Err") {
          const suid = match[1];
          this.updateDeviceInfo(suid, "device", value.replace(/"/g, ""));
        }
      }
      if (key.includes("Slot") && key.includes(".Info")) {
        const match = key.match(/Slot\(([^)]+)\)\.Info/);
        if (match && value && value !== '""' && value !== "" && value !== "Err") {
          const suid = match[1];
          const infoMatch = value.match(/In:(\d+),\s*Out:(\d+)/i);
          if (infoMatch) {
            this.updateDeviceInfo(suid, "info", {
              inputs: parseInt(infoMatch[1]),
              outputs: parseInt(infoMatch[2])
            });
          }
        }
      }
      if (key.includes("Point") && key.includes(".dBGain")) {
        const match = key.match(
          /Point\(([^.]+)\.IN\[(\d+)\],\s*([^.]+)\.OUT\[(\d+)\]\)\.dBGain/
        );
        if (match && value && value !== "Err") {
          const gainValue = parseFloat(value);
          if (!isNaN(gainValue)) {
            const currentPatch = this.nodecg.Replicant(
              "currentPatchStatus"
            ).value;
            if (currentPatch && match[1] === currentPatch.inputDevice && parseInt(match[2]) === (currentPatch.inputChannel || 1) && match[3] === currentPatch.outputDevice && parseInt(match[4]) === (currentPatch.outputChannel || 1)) {
              currentPatch.gain = gainValue;
              currentPatch.exists = true;
              this.nodecg.Replicant("currentPatchStatus").value = {
                ...currentPatch
              };
            }
          }
        }
      }
      if (key.includes("Point") && key.includes(".Mute")) {
        const match = key.match(
          /Point\(([^.]+)\.IN\[(\d+)\],\s*([^.]+)\.OUT\[(\d+)\]\)\.Mute/
        );
        if (match && value && value !== "Err") {
          const muteValue = parseInt(value);
          if (!isNaN(muteValue)) {
            const currentPatch = this.nodecg.Replicant(
              "currentPatchStatus"
            ).value;
            if (currentPatch && match[1] === currentPatch.inputDevice && parseInt(match[2]) === (currentPatch.inputChannel || 1) && match[3] === currentPatch.outputDevice && parseInt(match[4]) === (currentPatch.outputChannel || 1)) {
              currentPatch.mute = muteValue === 1;
              currentPatch.exists = true;
              this.nodecg.Replicant("currentPatchStatus").value = {
                ...currentPatch
              };
            }
          }
        }
      }
      if (key.includes("Point") && key.includes("dBGain")) ;
    }
  }
  updateDeviceInfo(suid, type, data) {
    let device = this.deviceCache.get(suid) || {
      suid,
      name: suid,
      // Use SUID as default name
      inputs: 0,
      outputs: 0
    };
    if (type === "device") {
      device.name = data || suid;
    } else if (type === "info") {
      device.inputs = data.inputs;
      device.outputs = data.outputs;
    }
    this.deviceCache.set(suid, device);
    const devices = Array.from(this.deviceCache.values()).filter(
      (d) => d.inputs > 0 || d.outputs > 0
    );
    this.nodecg.Replicant("availableDevices").value = devices;
    this.nodecg.log.info(
      `[Device Discovery] Updated devices: ${devices.map((d) => `${d.suid}(${d.name})`).join(", ")}`
    );
  }
  getReplicants() {
    return {
      networkConfig: this.netConfigRep,
      presets: this.presetsRep
    };
  }
}
module.exports = (nodecg) => {
  try {
    nodecg.log.info("VB Matrix Control Extension starting...");
    new MatrixManager(nodecg);
  } catch (err) {
    nodecg.log.error("Failed to start VB Matrix Control:", err);
  }
};
