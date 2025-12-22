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
    this.socket.setMaxListeners(50);
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
    this.connections = /* @__PURE__ */ new Map();
    this.deviceCache = /* @__PURE__ */ new Map();
    this.nodecg = nodecg;
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
    this.netConfigsRep = this.nodecg.Replicant(
      "networkConfigs",
      {
        defaultValue: []
      }
    );
    this.hostInfoRep = this.nodecg.Replicant("hostInfo", {
      defaultValue: { ips: this.getLocalIPs() },
      persistent: false
    });
    this.presetsRep = this.nodecg.Replicant("presets", {
      defaultValue: []
    });
    this.activePatchesRep = this.nodecg.Replicant(
      "activePatches",
      {
        defaultValue: []
      }
    );
    this.availableDevicesRep = this.nodecg.Replicant(
      "availableDevices",
      {
        defaultValue: []
      }
    );
    this.netConfigsRep.on("change", (newVal) => {
      this.updateConnections(newVal || []);
    });
  }
  updateConnections(configs) {
    const activeIds = /* @__PURE__ */ new Set();
    for (const config of configs) {
      activeIds.add(config.id);
      let vban = this.connections.get(config.id);
      if (!vban) {
        vban = new VBANTransmitter();
        this.setupConnectionListeners(vban, config.id);
        this.connections.set(config.id, vban);
        this.nodecg.log.info(
          `[VBAN] Added connection: ${config.name} (${config.id})`
        );
      }
      vban.setConfig(config.ip, config.port, config.streamName);
    }
    for (const [id, vban] of this.connections) {
      if (!activeIds.has(id)) {
        vban.destroy();
        this.connections.delete(id);
        this.nodecg.log.info(`[VBAN] Removed connection: ${id}`);
        const devices = this.availableDevicesRep.value || [];
        this.availableDevicesRep.value = devices.filter(
          (d) => d.connectionId !== id
        );
      }
    }
  }
  setupConnectionListeners(vban, connectionId) {
    vban.on("data", (data) => {
      this.handleResponse(data, connectionId);
    });
    vban.on("error", (err) => {
      this.nodecg.log.error(`[VBAN ${connectionId}] Error:`, err.message);
    });
  }
  initListeners() {
    this.nodecg.listenFor(
      "sendVBAN",
      (data) => {
        if (data.connectionId) {
          const vban = this.connections.get(data.connectionId);
          if (vban) vban.send(data.command);
        } else {
          this.connections.forEach((vban) => vban.send(data.command));
        }
      }
    );
    this.nodecg.listenFor("ping", (connectionId) => {
      this.ping(connectionId);
    });
    this.nodecg.listenFor("addPatch", (connectionId) => {
      if (!connectionId) return;
      const currentPatches = this.activePatchesRep.value || [];
      const newPatch = {
        id: Math.random().toString(36).substr(2, 9),
        connectionId,
        inputDevice: "",
        inputChannel: 1,
        outputDevice: "",
        outputChannel: 1,
        gain: -144,
        mute: false,
        exists: false
      };
      this.activePatchesRep.value = [...currentPatches, newPatch];
    });
    this.nodecg.listenFor("removePatch", (id) => {
      const currentPatches = this.activePatchesRep.value || [];
      this.activePatchesRep.value = currentPatches.filter(
        (p) => p.id !== id
      );
    });
    this.nodecg.listenFor(
      "selectPatch",
      (patch) => {
        if (!patch.id || !patch.connectionId || !patch.inputDevice || !patch.outputDevice) {
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
          (p) => p.id === patch.id
        );
        if (patchIndex === -1) {
          this.nodecg.log.warn(`[selectPatch] Patch ID ${patch.id} not found.`);
          return;
        }
        this.nodecg.log.info("Select Patch Requested:", patch);
        const updatedPatch = {
          ...currentPatches[patchIndex],
          ...patch,
          // Updates connectionId if changed (unlikely here) and devices
          gain: -144,
          // Reset to unknown/default until read
          mute: false,
          exists: false
        };
        currentPatches[patchIndex] = updatedPatch;
        this.activePatchesRep.value = [...currentPatches];
        const inCh = patch.inputChannel || 1;
        const outCh = patch.outputChannel || 1;
        const gainQuery = `Point(${patch.inputDevice}.IN[${inCh}],${patch.outputDevice}.OUT[${outCh}]).dBGain = ?;`;
        const muteQuery = `Point(${patch.inputDevice}.IN[${inCh}],${patch.outputDevice}.OUT[${outCh}]).Mute = ?;`;
        this.nodecg.log.info(
          `[selectPatch] Sending Queries to ${patch.connectionId}: ${gainQuery}`
        );
        vban.send(gainQuery);
        vban.send(muteQuery);
      }
    );
    this.nodecg.listenFor("updatePatch", (patch) => {
      if (!patch.connectionId) return;
      const vban = this.connections.get(patch.connectionId);
      if (!vban) return;
      this.nodecg.log.info("Update Patch:", patch);
      if (patch.inputDevice && patch.outputDevice) {
        const inCh = patch.inputChannel || 1;
        const outCh = patch.outputChannel || 1;
        if (patch.exists === false) {
          const removeCmd = `Point(${patch.inputDevice}.IN[${inCh}],${patch.outputDevice}.OUT[${outCh}]).Remove;`;
          vban.send(removeCmd);
        } else {
          if (typeof patch.gain === "number") {
            const gainCmd = `Point(${patch.inputDevice}.IN[${inCh}],${patch.outputDevice}.OUT[${outCh}]).dBGain = ${patch.gain.toFixed(1)};`;
            vban.send(gainCmd);
          } else if (patch.exists === true && typeof patch.gain === "undefined") {
            const currentPatches2 = this.activePatchesRep.value || [];
            const existing = currentPatches2.find(
              (p) => p.id === patch.id
            );
            if (existing && !existing.exists) {
              const gainCmd = `Point(${patch.inputDevice}.IN[${inCh}],${patch.outputDevice}.OUT[${outCh}]).dBGain = 0.0;`;
              vban.send(gainCmd);
              patch.gain = 0;
            }
          }
          if (typeof patch.mute === "boolean") {
            const muteCmd = `Point(${patch.inputDevice}.IN[${inCh}],${patch.outputDevice}.OUT[${outCh}]).Mute = ${patch.mute ? 1 : 0};`;
            vban.send(muteCmd);
          }
        }
      }
      const currentPatches = this.activePatchesRep.value || [];
      const idx = currentPatches.findIndex(
        (p) => p.id === patch.id
      );
      if (idx !== -1) {
        currentPatches[idx] = patch;
        this.activePatchesRep.value = [...currentPatches];
      }
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
      this.connections.forEach((vban) => {
        commonSlots.forEach((suid) => {
          vban.send(`Slot(${suid}).Device = ?;`);
          vban.send(`Slot(${suid}).Info = ?;`);
        });
      });
    });
    this.nodecg.listenFor(
      "savePresetToBank",
      (data) => {
        const currentPatches = JSON.parse(
          JSON.stringify(this.activePatchesRep.value || [])
        );
        const netConfigs = JSON.parse(JSON.stringify(this.netConfigsRep.value));
        const newPreset = {
          id: data.slotId,
          name: data.name,
          networkConfigs: netConfigs,
          patches: currentPatches
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
      const currentPresets = JSON.parse(
        JSON.stringify(this.presetsRep.value || [])
      );
      const newPresetsList = currentPresets.filter(
        (p) => p.id !== presetId
      );
      this.presetsRep.value = newPresetsList;
      this.savePresetsToFile(newPresetsList);
    });
    this.nodecg.listenFor("loadPreset", (presetId) => {
      const presets = this.presetsRep.value || [];
      const preset = presets.find((p) => p.id === presetId);
      if (preset) {
        this.nodecg.log.info(`Loading Preset: ${preset.name}`);
        if (preset.networkConfigs) {
          this.netConfigsRep.value = JSON.parse(
            JSON.stringify(preset.networkConfigs)
          );
        }
        if (preset.patches) {
          const patchesToLoad = JSON.parse(JSON.stringify(preset.patches));
          this.activePatchesRep.value = patchesToLoad;
          patchesToLoad.forEach((p) => {
            const vban = this.connections.get(p.connectionId);
            if (!vban) return;
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
  ping(connectionId) {
    const versionQuery = "Command.Version = ?;";
    if (connectionId) {
      const vban = this.connections.get(connectionId);
      if (vban) vban.send(versionQuery);
    } else {
      this.connections.forEach((vban) => vban.send(versionQuery));
    }
  }
  handleResponse(data, connectionId) {
    const lines = data.split(/[\r\n]+/).map((line) => line.trim()).filter((line) => line.length > 0);
    for (const line of lines) {
      const commands = line.split(";").map((cmd) => cmd.trim()).filter((cmd) => cmd.length > 0);
      for (const cmd of commands) {
        this.parseLine(cmd, connectionId);
      }
    }
  }
  parseLine(line, connectionId) {
    if (line.includes("=")) {
      const [key, value] = line.split("=").map((s) => s.trim());
      if (key === "Command.Version") {
        this.nodecg.sendMessage("pingSuccess", {
          connectionId,
          version: value
        });
      }
      if (key.includes("Slot") && key.includes(".Device")) {
        const match = key.match(/Slot\(([^)]+)\)\.Device/);
        if (match && value && value !== '""' && value !== "" && value !== "Err") {
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
        if (match && value && value !== '""' && value !== "" && value !== "Err") {
          const suid = match[1];
          const infoMatch = value.match(/In:(\d+),\s*Out:(\d+)/i);
          if (infoMatch) {
            this.updateDeviceInfo(connectionId, suid, "info", {
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
            const currentPatches = this.activePatchesRep.value || [];
            let updated = false;
            const updatedPatches = currentPatches.map(
              (patch) => {
                if (patch.connectionId === connectionId && // Check connection
                patch.inputDevice === match[1] && (patch.inputChannel || 1) === parseInt(match[2]) && patch.outputDevice === match[3] && (patch.outputChannel || 1) === parseInt(match[4])) {
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
              (patch) => {
                if (patch.connectionId === connectionId && // Check connection
                patch.inputDevice === match[1] && (patch.inputChannel || 1) === parseInt(match[2]) && patch.outputDevice === match[3] && (patch.outputChannel || 1) === parseInt(match[4])) {
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
  // Key: "connectionId:suid"
  updateDeviceInfo(connectionId, suid, type, data) {
    const key = `${connectionId}:${suid}`;
    let device = this.deviceCache.get(key) || {
      connectionId,
      suid,
      name: suid,
      inputs: 0,
      outputs: 0
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
module.exports = (nodecg) => {
  try {
    nodecg.log.info("VB Matrix Control Extension starting...");
    new MatrixManager(nodecg);
  } catch (err) {
    nodecg.log.error("Failed to start VB Matrix Control:", err);
  }
};
