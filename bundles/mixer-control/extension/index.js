"use strict";
const net = require("net");
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
const net__namespace = /* @__PURE__ */ _interopNamespaceDefault(net);
class Logger {
  constructor(context) {
    this.context = context;
  }
  setNodeCG(nodecg) {
    this.nodecg = nodecg;
  }
  formatMessage(message) {
    return `[${(/* @__PURE__ */ new Date()).toISOString()}] [${this.context}] ${message}`;
  }
  logToBundle(level, message, args) {
    if (this.nodecg && this.nodecg.extensions && this.nodecg.extensions["logger-system"]) {
      try {
        const loggerBundle = this.nodecg.extensions["logger-system"];
        const argString = args.map((a) => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" ");
        const fullMessage = args.length > 0 ? `${message} ${argString}` : message;
        loggerBundle.log(level, this.context, fullMessage);
      } catch (e) {
      }
    }
  }
  info(message, ...args) {
    console.log(this.formatMessage(message), ...args);
    this.logToBundle("info", message, args);
  }
  warn(message, ...args) {
    console.warn(this.formatMessage(message), ...args);
    this.logToBundle("warn", message, args);
  }
  error(message, ...args) {
    console.error(this.formatMessage(message), ...args);
    this.logToBundle("error", message, args);
  }
}
const createLogger = (context) => new Logger(context);
class ConnectionManager {
  // Buffer for TCP data
  constructor(nodecg, stateManager) {
    this.udpClient = null;
    this.udpServer = null;
    this.tcpClient = null;
    this.logger = createLogger("MixerConnection");
    this.reconnectInterval = null;
    this.shouldBeConnected = false;
    this.buffer = "";
    this.nodecg = nodecg;
    this.logger.setNodeCG(nodecg);
    this.stateManager = stateManager;
    this.config = nodecg.bundleConfig;
  }
  async connect(params) {
    var _a, _b;
    this.shouldBeConnected = true;
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    const settingsRep = this.nodecg.Replicant(
      "mixerConnectionSettings"
    );
    const settings = settingsRep.value;
    const ip = (params == null ? void 0 : params.ip) || (settings == null ? void 0 : settings.ip) || ((_a = this.config.mixer) == null ? void 0 : _a.defaultIP) || "192.168.0.128";
    const port = (params == null ? void 0 : params.port) || ((settings == null ? void 0 : settings.port) ? parseInt(settings.port) : void 0) || ((_b = this.config.mixer) == null ? void 0 : _b.defaultPort) || 49280;
    const protocol = (params == null ? void 0 : params.protocol) || (settings == null ? void 0 : settings.protocol) || "tcp";
    if (params) {
      settingsRep.value = {
        ip: params.ip,
        port: params.port.toString(),
        protocol: params.protocol
      };
    }
    this.logger.info(`Connecting to mixer at ${ip}:${port} via ${protocol}`);
    try {
      this.connectTCP(ip, port);
    } catch (error) {
      this.logger.error("Failed to connect to mixer", error);
      this.stateManager.setConnected(false);
      if (this.shouldBeConnected) {
        this.scheduleReconnect();
      }
    }
  }
  connectTCP(ip, port) {
    this.closeConnections();
    this.tcpClient = new net__namespace.Socket();
    this.tcpClient.connect(port, ip, () => {
      this.logger.info("TCP Connected (RCP)");
      this.stateManager.setConnected(true);
      this.startHeartbeat();
    });
    this.tcpClient.on("data", (data) => {
      this.buffer += data.toString();
      let lineEnd;
      while ((lineEnd = this.buffer.indexOf("\n")) !== -1) {
        const line = this.buffer.substring(0, lineEnd).trim();
        this.buffer = this.buffer.substring(lineEnd + 1);
        if (line) {
          this.handleRCPMessage(line);
        }
      }
    });
    this.tcpClient.on("close", () => {
      this.logger.warn("TCP Connection closed");
      this.stateManager.setConnected(false);
      if (this.shouldBeConnected) {
        this.scheduleReconnect();
      }
    });
    this.tcpClient.on("error", (err) => {
      this.logger.error("TCP Connection error", err);
      this.stateManager.setConnected(false);
    });
  }
  closeConnections() {
    if (this.udpClient) {
      this.udpClient.close();
      this.udpClient = null;
    }
    if (this.udpServer) {
      this.udpServer.close();
      this.udpServer = null;
    }
    if (this.tcpClient) {
      this.tcpClient.destroy();
      this.tcpClient = null;
    }
  }
  disconnect() {
    this.shouldBeConnected = false;
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    this.closeConnections();
    this.stateManager.setConnected(false);
    this.logger.info("Manually disconnected from mixer");
  }
  setFaderLevel(channelId, level) {
    if (this.tcpClient && this.shouldBeConnected) {
      const index = channelId - 1;
      this.tcpClient.write(
        `set "MIXER:Current/InCh/Fader/Level" ${index} 0 ${level}
`
      );
    }
  }
  setMute(channelId, isMuted) {
    if (this.tcpClient && this.shouldBeConnected) {
      const index = channelId - 1;
      const value = isMuted ? 0 : 1;
      this.tcpClient.write(
        `set "MIXER:Current/InCh/Fader/On" ${index} 0 ${value}
`
      );
    }
  }
  setOutputFaderLevel(outputId, level) {
    if (this.tcpClient && this.shouldBeConnected) {
      if (outputId <= 6) {
        const index = outputId - 1;
        this.tcpClient.write(
          `set "MIXER:Current/Mix/Fader/Level" ${index} 0 ${level}
`
        );
      } else if (outputId === 7 || outputId === 8) {
        this.tcpClient.write(
          `set "MIXER:Current/St/Fader/Level" 0 0 ${level}
`
        );
      }
    }
  }
  setOutputMute(outputId, isMuted) {
    if (this.tcpClient && this.shouldBeConnected) {
      const value = isMuted ? 0 : 1;
      if (outputId <= 6) {
        const index = outputId - 1;
        this.tcpClient.write(
          `set "MIXER:Current/Mix/Fader/On" ${index} 0 ${value}
`
        );
      } else if (outputId === 7 || outputId === 8) {
        this.tcpClient.write(`set "MIXER:Current/St/Fader/On" 0 0 ${value}
`);
      }
    }
  }
  queryOutputRouting(outputId) {
    if (this.tcpClient && this.shouldBeConnected) {
      this.logger.info(`Querying routing for Output ${outputId}`);
      for (let i = 0; i < 16; i++) {
        if (outputId <= 6) {
          const mixIndex = outputId - 1;
          this.tcpClient.write(
            `get "MIXER:Current/InCh/ToMix/On" ${i} ${mixIndex}
`
          );
          this.tcpClient.write(
            `get "MIXER:Current/InCh/ToMix/Level" ${i} ${mixIndex}
`
          );
        } else if (outputId === 7 || outputId === 8) {
          this.tcpClient.write(`get "MIXER:Current/InCh/ToSt/On" ${i} 0
`);
          this.tcpClient.write(`get "MIXER:Current/InCh/ToSt/Level" ${i} 0
`);
        }
      }
    }
  }
  handleRCPMessage(line) {
    this.logger.info(`RCP RX: ${line}`);
    if (line.startsWith("OK") || line.startsWith("NOTIFY")) {
      const content = line.replace(/^(OK|NOTIFY)\s+/, "");
      if (content.includes("MIXER:Current/InCh/Fader/Level")) {
        const match = content.match(
          /(?:get|set)?\s*"?MIXER:Current\/InCh\/Fader\/Level"?\s+(\d+)\s+0\s+(-?\d+)/
        );
        if (match) {
          const chIndex = parseInt(match[1]);
          const value = parseInt(match[2]);
          this.stateManager.updateChannel(chIndex + 1, { faderLevel: value });
          this.logger.info(`Updated CH${chIndex + 1} fader: ${value}`);
        }
      } else if (content.includes("MIXER:Current/InCh/Label/Name")) {
        const match = content.match(
          /(?:get|set)?\s*"?MIXER:Current\/InCh\/Label\/Name"?\s+(\d+)\s+0\s+"([^"]+)"/
        );
        if (match) {
          const chIndex = parseInt(match[1]);
          const name = match[2];
          this.stateManager.updateChannel(chIndex + 1, { name });
          this.logger.info(`Updated CH${chIndex + 1} name: ${name}`);
        }
      } else if (content.includes("MIXER:Current/InCh/Fader/On")) {
        const match = content.match(
          /(?:get|set)?\s*"?MIXER:Current\/InCh\/Fader\/On"?\s+(\d+)\s+0\s+(\d+)/
        );
        if (match) {
          const chIndex = parseInt(match[1]);
          const onValue = parseInt(match[2]);
          const isMuted = onValue === 0;
          this.stateManager.updateChannel(chIndex + 1, { isMuted });
          this.logger.info(`Updated CH${chIndex + 1} muted: ${isMuted}`);
        }
      } else if (content.includes("MIXER:Current/Mix/Fader/Level")) {
        const match = content.match(
          /(?:get|set)?\s*"?MIXER:Current\/Mix\/Fader\/Level"?\s+(\d+)\s+0\s+(-?\d+)/
        );
        if (match) {
          const mixIndex = parseInt(match[1]);
          const level = parseInt(match[2]);
          this.stateManager.updateOutput(mixIndex + 1, { faderLevel: level });
        }
      } else if (content.includes("MIXER:Current/Mix/Label/Name")) {
        const match = content.match(
          /(?:get|set)?\s*"?MIXER:Current\/Mix\/Label\/Name"?\s+(\d+)\s+0\s+"?([^"\n]+)"?/
        );
        if (match) {
          const mixIndex = parseInt(match[1]);
          const name = match[2];
          this.stateManager.updateOutput(mixIndex + 1, { name });
        }
      } else if (content.includes("MIXER:Current/Mix/Fader/On")) {
        const match = content.match(
          /(?:get|set)?\s*"?MIXER:Current\/Mix\/Fader\/On"?\s+(\d+)\s+0\s+(\d+)/
        );
        if (match) {
          const mixIndex = parseInt(match[1]);
          const onValue = parseInt(match[2]);
          const isMuted = onValue === 0;
          this.stateManager.updateOutput(mixIndex + 1, { isMuted });
        }
      } else if (content.includes("MIXER:Current/St/Fader/Level")) {
        const match = content.match(
          /(?:get|set)?\s*"?MIXER:Current\/St\/Fader\/Level"?\s+0\s+0\s+(-?\d+)/
        );
        if (match) {
          const level = parseInt(match[1]);
          this.stateManager.updateOutput(7, { faderLevel: level });
          this.stateManager.updateOutput(8, { faderLevel: level });
        }
      } else if (content.includes("MIXER:Current/St/Fader/On")) {
        const match = content.match(
          /(?:get|set)?\s*"?MIXER:Current\/St\/Fader\/On"?\s+0\s+0\s+(\d+)/
        );
        if (match) {
          const onValue = parseInt(match[1]);
          const isMuted = onValue === 0;
          this.stateManager.updateOutput(7, { isMuted });
          this.stateManager.updateOutput(8, { isMuted });
        }
      } else if (content.includes("MIXER:Current/InCh/ToMix/On")) {
        const match = content.match(
          /(?:get|set)?\s*"?MIXER:Current\/InCh\/ToMix\/On"?\s+(\d+)\s+(\d+)\s+(\d+)/
        );
        if (match) {
          const inputIndex = parseInt(match[1]);
          const mixIndex = parseInt(match[2]);
          const onValue = parseInt(match[3]);
          const active = onValue === 1;
          const outputId = mixIndex + 1;
          this.stateManager.updateInputSend(outputId, inputIndex + 1, {
            active
          });
        }
      } else if (content.includes("MIXER:Current/InCh/ToMix/Level")) {
        const match = content.match(
          /(?:get|set)?\s*"?MIXER:Current\/InCh\/ToMix\/Level"?\s+(\d+)\s+(\d+)\s+(-?\d+)/
        );
        if (match) {
          const inputIndex = parseInt(match[1]);
          const mixIndex = parseInt(match[2]);
          const level = parseInt(match[3]);
          this.logger.info(
            `Parsed ToMix Level: Input ${inputIndex}, Mix ${mixIndex}, Level ${level}`
          );
          const outputId = mixIndex + 1;
          this.stateManager.updateInputSend(outputId, inputIndex + 1, {
            level
          });
        }
      } else if (content.includes("MIXER:Current/InCh/ToSt/On")) {
        const match = content.match(
          /(?:get|set)?\s*"?MIXER:Current\/InCh\/ToSt\/On"?\s+(\d+)\s+0\s+(\d+)/
        );
        if (match) {
          const inputIndex = parseInt(match[1]);
          const onValue = parseInt(match[2]);
          const active = onValue === 1;
          this.stateManager.updateInputSend(7, inputIndex + 1, { active });
          this.stateManager.updateInputSend(8, inputIndex + 1, { active });
        }
      } else if (content.includes("MIXER:Current/InCh/ToSt/Level")) {
        const match = content.match(
          /(?:get|set)?\s*"?MIXER:Current\/InCh\/ToSt\/Level"?\s+(\d+)\s+0\s+(-?\d+)/
        );
        if (match) {
          const inputIndex = parseInt(match[1]);
          const level = parseInt(match[2]);
          this.logger.info(
            `Parsed ToSt Level: Input ${inputIndex}, Level ${level}`
          );
          this.stateManager.updateInputSend(7, inputIndex + 1, { level });
          this.stateManager.updateInputSend(8, inputIndex + 1, { level });
        }
      }
    }
  }
  startHeartbeat() {
    setInterval(() => {
      if (this.tcpClient && this.shouldBeConnected) {
        for (let i = 0; i < 16; i++) {
          this.tcpClient.write(`get "MIXER:Current/InCh/Fader/Level" ${i} 0
`);
          this.tcpClient.write(`get "MIXER:Current/InCh/Label/Name" ${i} 0
`);
          this.tcpClient.write(`get "MIXER:Current/InCh/Fader/On" ${i} 0
`);
        }
        for (let i = 0; i < 6; i++) {
          this.tcpClient.write(`get "MIXER:Current/Mix/Fader/Level" ${i} 0
`);
          this.tcpClient.write(`get "MIXER:Current/Mix/Label/Name" ${i} 0
`);
          this.tcpClient.write(`get "MIXER:Current/Mix/Fader/On" ${i} 0
`);
        }
        this.tcpClient.write(`get "MIXER:Current/St/Fader/Level" 0 0
`);
        this.tcpClient.write(`get "MIXER:Current/St/Fader/On" 0 0
`);
      }
    }, 5e3);
  }
  scheduleReconnect() {
    if (!this.reconnectInterval) {
      this.logger.info("Scheduling mixer reconnect in 5s...");
      this.reconnectInterval = setInterval(() => {
        this.logger.info("Attempting to reconnect to mixer...");
        const settingsRep = this.nodecg.Replicant(
          "mixerConnectionSettings"
        );
        const settings = settingsRep.value;
        if (settings) {
          this.connect();
        }
      }, 5e3);
    }
  }
}
function getCurrentTimestamp() {
  return Date.now();
}
class StateManager {
  constructor(nodecg) {
    this.nodecg = nodecg;
    this.mixerStateRep = nodecg.Replicant("mixerState", {
      defaultValue: {
        connected: false,
        channels: [],
        outputs: [],
        lastUpdate: 0
      }
    });
    this.mixerStateRep.value.connected = false;
    this.mixerChannelsRep = nodecg.Replicant("mixerChannels", {
      defaultValue: []
    });
    if (this.mixerStateRep.value.channels.length === 0) {
      this.mixerStateRep.value.channels = Array.from(
        { length: 32 },
        (_, i) => ({
          id: i + 1,
          name: `CH ${i + 1}`,
          faderLevel: 0,
          isMuted: false,
          inputSource: `IN ${i + 1}`
        })
      );
    }
    if (!this.mixerStateRep.value.outputs || this.mixerStateRep.value.outputs.length === 0) {
      this.mixerStateRep.value.outputs = Array.from({ length: 8 }, (_, i) => ({
        id: i + 1,
        name: i < 6 ? `Mix ${i + 1}` : i === 6 ? "Stereo L" : "Stereo R",
        faderLevel: -32768,
        isMuted: true,
        inputSends: []
      }));
    }
  }
  setConnected(connected) {
    if (this.mixerStateRep.value.connected !== connected) {
      this.mixerStateRep.value.connected = connected;
      this.mixerStateRep.value.lastUpdate = getCurrentTimestamp();
    }
  }
  updateChannel(channelId, data) {
    const channels = this.mixerStateRep.value.channels;
    const index = channels.findIndex((c) => c.id === channelId);
    if (index !== -1) {
      const channel = channels[index];
      let changed = false;
      if (data.faderLevel !== void 0 && channel.faderLevel !== data.faderLevel) {
        channel.faderLevel = data.faderLevel;
        changed = true;
      }
      if (data.isMuted !== void 0 && channel.isMuted !== data.isMuted) {
        channel.isMuted = data.isMuted;
        changed = true;
      }
      if (data.inputSource !== void 0 && channel.inputSource !== data.inputSource) {
        channel.inputSource = data.inputSource;
        changed = true;
      }
      if (data.name !== void 0 && channel.name !== data.name) {
        channel.name = data.name;
        changed = true;
      }
      if (changed) {
        this.mixerStateRep.value.lastUpdate = getCurrentTimestamp();
      }
    }
  }
  updateOutput(outputId, data) {
    const outputs = this.mixerStateRep.value.outputs;
    if (!outputs) return;
    const index = outputs.findIndex((o) => o.id === outputId);
    if (index !== -1) {
      const output = outputs[index];
      let changed = false;
      if (data.faderLevel !== void 0 && output.faderLevel !== data.faderLevel) {
        output.faderLevel = data.faderLevel;
        changed = true;
      }
      if (data.isMuted !== void 0 && output.isMuted !== data.isMuted) {
        output.isMuted = data.isMuted;
        changed = true;
      }
      if (data.name !== void 0 && output.name !== data.name) {
        output.name = data.name;
        changed = true;
      }
      if (data.inputSends !== void 0) {
        output.inputSends = data.inputSends;
        changed = true;
      }
      if (changed) {
        this.mixerStateRep.value.lastUpdate = getCurrentTimestamp();
      }
    }
  }
  updateInputSend(outputId, inputId, data) {
    const outputs = this.mixerStateRep.value.outputs;
    if (!outputs) return;
    const outputIndex = outputs.findIndex(
      (o) => o.id === outputId
    );
    if (outputIndex === -1) return;
    const output = outputs[outputIndex];
    let sendIndex = output.inputSends.findIndex(
      (s) => s.inputId === inputId
    );
    let changed = false;
    if (sendIndex === -1) {
      const channels = this.mixerStateRep.value.channels;
      const inputChannel = channels == null ? void 0 : channels.find((c) => c.id === inputId);
      const inputName = (inputChannel == null ? void 0 : inputChannel.name) || `CH${inputId}`;
      const newSend = {
        inputId,
        inputName,
        active: data.active !== void 0 ? data.active : false,
        level: data.level !== void 0 ? data.level : -32768
      };
      output.inputSends.push(newSend);
      sendIndex = output.inputSends.length - 1;
      changed = true;
    } else {
      const send = output.inputSends[sendIndex];
      if (data.active !== void 0 && send.active !== data.active) {
        send.active = data.active;
        changed = true;
      }
      if (data.level !== void 0 && send.level !== data.level) {
        send.level = data.level;
        changed = true;
      }
    }
    if (changed) {
      this.mixerStateRep.value.lastUpdate = getCurrentTimestamp();
      if (sendIndex !== -1) {
        output.inputSends[sendIndex] = { ...output.inputSends[sendIndex] };
      }
    }
  }
  getMixerState() {
    return this.mixerStateRep.value;
  }
}
module.exports = function(nodecg) {
  const logger = createLogger("MixerControl");
  logger.setNodeCG(nodecg);
  logger.info("Starting Mixer Control Bundle");
  nodecg.Replicant("mixerConnectionSettings", {
    defaultValue: {
      ip: "127.0.0.1",
      port: "8000",
      protocol: "udp"
    }
  });
  const stateManager = new StateManager(nodecg);
  const connectionManager = new ConnectionManager(nodecg, stateManager);
  nodecg.listenFor(
    "connectMixer",
    (data) => {
      connectionManager.connect(data);
    }
  );
  nodecg.listenFor("disconnectMixer", () => {
    connectionManager.disconnect();
  });
  nodecg.listenFor(
    "setMixerFader",
    (data) => {
      connectionManager.setFaderLevel(data.channelId, data.level);
    }
  );
  nodecg.listenFor(
    "setMixerMute",
    (data) => {
      connectionManager.setMute(data.channelId, data.isMuted);
    }
  );
  nodecg.listenFor(
    "setMixerOutputFader",
    (data) => {
      connectionManager.setOutputFaderLevel(data.outputId, data.level);
    }
  );
  nodecg.listenFor(
    "setMixerOutputMute",
    (data) => {
      connectionManager.setOutputMute(data.outputId, data.isMuted);
    }
  );
  nodecg.listenFor("queryOutputRouting", (data) => {
    connectionManager.queryOutputRouting(data.outputId);
  });
};
