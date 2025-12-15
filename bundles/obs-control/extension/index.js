"use strict";
const obsWebsocketJs = require("obs-websocket-js");
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
  constructor(nodecg, sceneManager, obsConnectionsRep) {
    this.obsInstances = /* @__PURE__ */ new Map();
    this.logger = createLogger("OBSConnection");
    this.statsIntervals = /* @__PURE__ */ new Map();
    this.reconnectTimeouts = /* @__PURE__ */ new Map();
    this.nodecg = nodecg;
    this.logger.setNodeCG(nodecg);
    this.sceneManager = sceneManager;
    this.config = nodecg.bundleConfig;
    this.obsConnectionsRep = obsConnectionsRep;
    this.setupMessageListeners();
  }
  connectAll() {
    this.logger.info("Auto-connecting to all defined OBS instances...");
    const connections = this.obsConnectionsRep.value || [];
    connections.forEach((conn) => {
      this.connect(conn);
    });
  }
  setupMessageListeners() {
    this.nodecg.listenFor(
      "setOBSTransition",
      (data, ack) => {
        this.logger.info(
          `[setOBSTransition] Request for ID: ${data.id}, Transition: ${data.transition}`
        );
        this.setTransition(data.id, data.transition).then(() => {
          if (ack && !ack.handled) ack(null);
        }).catch((err) => {
          this.logger.error(`[setOBSTransition] Error: ${err.message}`);
          if (ack && !ack.handled) ack(err);
        });
      }
    );
    this.nodecg.listenFor(
      "startStreaming",
      async (data, ack) => {
        try {
          const obs = this.getObs(data.id);
          if (obs) await obs.call("StartStream");
          if (ack && !ack.handled) ack(null);
        } catch (err) {
          if (ack && !ack.handled) ack(err);
        }
      }
    );
    this.nodecg.listenFor(
      "stopStreaming",
      async (data, ack) => {
        try {
          const obs = this.getObs(data.id);
          if (obs) await obs.call("StopStream");
          if (ack && !ack.handled) ack(null);
        } catch (err) {
          if (ack && !ack.handled) ack(err);
        }
      }
    );
    this.nodecg.listenFor(
      "setStreamSettings",
      async (data, ack) => {
        try {
          await this.setStreamSettings(data.id, data.settings);
          if (ack && !ack.handled) ack(null);
        } catch (err) {
          if (ack && !ack.handled) ack(err);
        }
      }
    );
    this.nodecg.listenFor("connectOBS", (data) => {
      this.connect(data);
    });
    this.nodecg.listenFor("disconnectOBS", (data) => {
      this.disconnect(data.id);
    });
    this.nodecg.listenFor(
      "setOBSScene",
      (data) => {
        this.logger.info(
          `[setOBSScene] Request for ID: ${data.id}, Scene: ${data.scene}`
        );
        this.setScene(data.id, data.scene);
      }
    );
  }
  getObs(id) {
    return this.obsInstances.get(id);
  }
  setupObsListeners(obsId, obs) {
    obs.on("Identified", async () => {
      this.logger.info(`[${obsId}] Connected to OBS`);
      this.sceneManager.setStatus(obsId, "connected");
      this.sceneManager.updateScenes(obsId, obs);
      this.sceneManager.updateTransitions(obsId, obs);
      try {
        const stats = await obs.call("GetStreamStatus");
        this.sceneManager.updateStreamStats(obsId, {
          ...stats,
          kbitsPerSec: 0,
          fps: 0
        });
        if (stats.outputActive) {
          this.startStatsPolling(obsId, obs);
        }
        await this.syncStreamSettings(obsId, obs);
      } catch (err) {
        this.logger.error(
          `[${obsId}] Failed to get initial stream status`,
          (err == null ? void 0 : err.message) || err
        );
      }
    });
    obs.on("ConnectionClosed", () => {
      this.logger.warn(`[${obsId}] Disconnected from OBS`);
      this.sceneManager.setStatus(obsId, "disconnected");
      this.stopStatsPolling(obsId);
    });
    obs.on("CurrentProgramSceneChanged", (data) => {
      this.sceneManager.setCurrentScene(obsId, data.sceneName);
    });
    obs.on("CurrentSceneTransitionChanged", (data) => {
      this.sceneManager.setCurrentTransition(obsId, data.transitionName);
    });
    obs.on("StreamStateChanged", (data) => {
      this.logger.info(
        `[${obsId}] Stream State Changed: Active=${data.outputActive}`
      );
      this.sceneManager.updateStreamStats(obsId, {
        outputActive: data.outputActive
      });
      if (data.outputActive) {
        this.startStatsPolling(obsId, obs);
        this.syncStreamSettings(obsId, obs).catch(
          (e) => this.logger.error(
            `[${obsId}] Failed to sync settings on stream start`,
            e
          )
        );
      } else {
        this.stopStatsPolling(obsId);
      }
    });
  }
  async connect(settings) {
    const { id, host, port, password } = settings;
    let obs = this.obsInstances.get(id);
    if (!obs) {
      obs = new obsWebsocketJs.OBSWebSocket();
      this.obsInstances.set(id, obs);
      this.setupObsListeners(id, obs);
    }
    if (this.reconnectTimeouts.has(id)) {
      clearTimeout(this.reconnectTimeouts.get(id));
      this.reconnectTimeouts.delete(id);
    }
    const address = `ws://${host}:${port}`;
    this.logger.info(`[${id}] Connecting to OBS at ${address}`);
    this.sceneManager.setStatus(id, "connecting");
    try {
      await obs.connect(address, password);
    } catch (error) {
      this.logger.warn(`[${id}] Failed to connect: ${error.message}`);
      this.sceneManager.setStatus(id, "error");
    }
  }
  async disconnect(id) {
    const obs = this.obsInstances.get(id);
    if (obs) {
      try {
        await obs.disconnect();
        this.logger.info(`[${id}] Manually disconnected`);
      } catch (e) {
        this.logger.error(`[${id}] Failed to disconnect`, e.message);
      }
    }
    this.sceneManager.setStatus(id, "disconnected");
    this.stopStatsPolling(id);
  }
  // Cleanup method if a connection is removed completely
  async removeConnection(id) {
    await this.disconnect(id);
    this.obsInstances.delete(id);
    this.sceneManager.deleteState(id);
  }
  async setScene(id, sceneName) {
    const obs = this.getObs(id);
    if (!obs) return;
    try {
      await obs.call("SetCurrentProgramScene", {
        sceneName
      });
      this.logger.info(`[${id}] Switched to scene: ${sceneName}`);
    } catch (error) {
      this.logger.error(`[${id}] Failed to switch scene`, error.message);
    }
  }
  async setTransition(id, transitionName) {
    const obs = this.getObs(id);
    if (!obs) return;
    try {
      await obs.call("SetCurrentSceneTransition", {
        transitionName
      });
      this.logger.info(`[${id}] Switched to transition: ${transitionName}`);
    } catch (error) {
      this.logger.error(`[${id}] Failed to switch transition`, error.message);
      throw error;
    }
  }
  async setStreamSettings(id, settings) {
    const obs = this.getObs(id);
    if (!obs) return;
    try {
      const streamSettings = {
        server: settings.server,
        key: settings.key
      };
      if (settings.useAuth) {
        streamSettings.use_auth = true;
        streamSettings.username = settings.username;
        streamSettings.password = settings.password;
      } else {
        streamSettings.use_auth = false;
      }
      await obs.call("SetStreamServiceSettings", {
        streamServiceType: "rtmp_custom",
        streamServiceSettings: streamSettings
      });
      this.logger.info(`[${id}] Stream settings updated`);
    } catch (error) {
      this.logger.error(`[${id}] Failed to set stream settings`, error.message);
      throw error;
    }
  }
  async syncStreamSettings(id, obs) {
    try {
      const response = await obs.call("GetStreamServiceSettings");
      const settings = response.streamServiceSettings;
      const newSettings = {
        server: settings.server || "",
        key: settings.key || "",
        useAuth: settings.use_auth || false,
        username: settings.username || "",
        password: settings.password || ""
      };
      const streamSettingsRep = this.nodecg.Replicant(
        "obsStreamSettings",
        { defaultValue: {} }
      );
      if (!streamSettingsRep.value) streamSettingsRep.value = {};
      streamSettingsRep.value[id] = newSettings;
      this.logger.info(`[${id}] Synced stream settings from OBS`);
    } catch (error) {
      this.logger.error(
        `[${id}] Failed to sync stream settings`,
        error.message
      );
    }
  }
  startStatsPolling(id, obs) {
    if (this.statsIntervals.has(id)) {
      clearInterval(this.statsIntervals.get(id));
    }
    const interval = setInterval(async () => {
      try {
        const stats = await obs.call("GetStreamStatus");
        this.sceneManager.updateStreamStats(id, {
          ...stats,
          kbitsPerSec: 0,
          fps: 0
        });
      } catch (e) {
      }
    }, 2e3);
    this.statsIntervals.set(id, interval);
  }
  stopStatsPolling(id) {
    if (this.statsIntervals.has(id)) {
      clearInterval(this.statsIntervals.get(id));
      this.statsIntervals.delete(id);
    }
    this.sceneManager.updateStreamStats(id, {
      outputActive: false,
      fps: 0,
      kbitsPerSec: 0,
      averageFrameTime: 0,
      outputTimecode: "00:00:00"
    });
  }
}
class SceneManager {
  constructor(nodecg) {
    this.nodecg = nodecg;
    this.obsStatesRep = nodecg.Replicant(
      "obsStates",
      {
        defaultValue: {}
      }
    );
  }
  getDefaultState() {
    return {
      connected: false,
      status: "disconnected",
      currentScene: "",
      isStreaming: false,
      isRecording: false,
      scenes: [],
      transitions: [],
      currentTransition: "",
      streamStats: { fps: 0, kbitsPerSec: 0, averageFrameTime: 0 }
    };
  }
  ensureState(obsId) {
    if (!this.obsStatesRep.value[obsId]) {
      this.obsStatesRep.value[obsId] = this.getDefaultState();
    }
  }
  setConnected(obsId, connected) {
    this.ensureState(obsId);
    this.obsStatesRep.value[obsId].connected = connected;
    this.obsStatesRep.value[obsId].status = connected ? "connected" : "disconnected";
  }
  setStatus(obsId, status) {
    this.ensureState(obsId);
    this.obsStatesRep.value[obsId].status = status;
    this.obsStatesRep.value[obsId].connected = status === "connected";
  }
  setCurrentScene(obsId, sceneName) {
    this.ensureState(obsId);
    this.obsStatesRep.value[obsId].currentScene = sceneName;
  }
  setCurrentTransition(obsId, transitionName) {
    this.ensureState(obsId);
    this.obsStatesRep.value[obsId].currentTransition = transitionName;
  }
  async updateScenes(obsId, obs) {
    this.ensureState(obsId);
    try {
      const response = await obs.call("GetSceneList");
      const scenes = response.scenes.map(
        (scene, index) => ({
          name: scene.sceneName,
          index
        })
      );
      this.obsStatesRep.value[obsId].scenes = JSON.parse(
        JSON.stringify(scenes)
      );
      this.obsStatesRep.value[obsId].currentScene = response.currentProgramSceneName;
    } catch (error) {
      this.nodecg.log.error(`[${obsId}] Failed to update scenes`, error);
    }
  }
  async updateTransitions(obsId, obs) {
    this.ensureState(obsId);
    try {
      const response = await obs.call("GetSceneTransitionList");
      this.obsStatesRep.value[obsId].transitions = response.transitions.map(
        (t) => t.transitionName
      );
      this.obsStatesRep.value[obsId].currentTransition = response.currentSceneTransitionName;
    } catch (error) {
      this.nodecg.log.error(`[${obsId}] Failed to update transitions`, error);
    }
  }
  updateStreamStats(obsId, stats) {
    this.ensureState(obsId);
    this.obsStatesRep.value[obsId].streamStats = {
      fps: stats.fps || 0,
      kbitsPerSec: stats.kbitsPerSec || 0,
      averageFrameTime: stats.averageFrameTime || 0,
      outputTimecode: stats.outputTimecode
    };
    this.obsStatesRep.value[obsId].isStreaming = stats.outputActive;
  }
  deleteState(obsId) {
    if (this.obsStatesRep.value[obsId]) {
      delete this.obsStatesRep.value[obsId];
    }
  }
}
module.exports = function(nodecg) {
  const logger = createLogger("OBSControl");
  logger.setNodeCG(nodecg);
  logger.info("Starting OBS Control Bundle");
  nodecg.Replicant("obsConnections", {
    defaultValue: [
      {
        id: "default",
        // Default connection
        name: "Main OBS",
        host: "localhost",
        port: "4455",
        password: ""
      }
    ]
  });
  const sceneManager = new SceneManager(nodecg);
  const obsConnectionsRep = nodecg.Replicant("obsConnections");
  const connectionManager = new ConnectionManager(
    nodecg,
    sceneManager,
    obsConnectionsRep
  );
  connectionManager.connectAll();
};
