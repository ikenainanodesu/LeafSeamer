"use strict";
const obsWebsocketJs = require("obs-websocket-js");
class Logger {
  constructor(context) {
    this.context = context;
  }
  formatMessage(message) {
    return `[${(/* @__PURE__ */ new Date()).toISOString()}] [${this.context}] ${message}`;
  }
  info(message, ...args) {
    console.log(this.formatMessage(message), ...args);
  }
  warn(message, ...args) {
    console.warn(this.formatMessage(message), ...args);
  }
  error(message, ...args) {
    console.error(this.formatMessage(message), ...args);
  }
}
const createLogger = (context) => new Logger(context);
class ConnectionManager {
  constructor(nodecg, sceneManager) {
    this.logger = createLogger("OBSConnection");
    this.reconnectInterval = null;
    this.shouldBeConnected = false;
    this.nodecg = nodecg;
    this.sceneManager = sceneManager;
    this.config = nodecg.bundleConfig;
    this.obs = new obsWebsocketJs.OBSWebSocket();
    this.setupListeners();
  }
  setupListeners() {
    this.obs.on("Identified", () => {
      this.logger.info("Connected to OBS");
      this.sceneManager.setConnected(true);
      this.sceneManager.updateScenes(this.obs);
    });
    this.obs.on("ConnectionClosed", () => {
      this.logger.warn("Disconnected from OBS");
      this.sceneManager.setConnected(false);
      if (this.shouldBeConnected) {
        this.scheduleReconnect();
      }
    });
    this.obs.on("CurrentProgramSceneChanged", (data) => {
      this.sceneManager.setCurrentScene(data.sceneName);
    });
  }
  async connect(params) {
    var _a, _b, _c;
    this.shouldBeConnected = true;
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    const settingsRep = this.nodecg.Replicant(
      "obsConnectionSettings"
    );
    const settings = settingsRep.value;
    const host = (params == null ? void 0 : params.host) || (settings == null ? void 0 : settings.host) || ((_a = this.config.obs) == null ? void 0 : _a.defaultHost) || "localhost";
    const port = (params == null ? void 0 : params.port) || ((settings == null ? void 0 : settings.port) ? parseInt(settings.port) : void 0) || ((_b = this.config.obs) == null ? void 0 : _b.defaultPort) || 4455;
    const password = (params == null ? void 0 : params.password) || (settings == null ? void 0 : settings.password) || ((_c = this.config.obs) == null ? void 0 : _c.defaultPassword) || "";
    if (params) {
      settingsRep.value = {
        host: params.host,
        port: params.port.toString(),
        password: params.password
      };
    }
    const address = `ws://${host}:${port}`;
    this.logger.info(`Connecting to OBS at ${address}`);
    try {
      await this.obs.connect(address, password);
    } catch (error) {
      this.logger.error("Failed to connect to OBS", error.message);
      this.sceneManager.setConnected(false);
      if (this.shouldBeConnected) {
        this.scheduleReconnect();
      }
    }
  }
  async disconnect() {
    this.shouldBeConnected = false;
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    try {
      await this.obs.disconnect();
      this.logger.info("Manually disconnected from OBS");
    } catch (error) {
      this.logger.error("Failed to disconnect from OBS", error.message);
    }
  }
  async setScene(sceneName) {
    try {
      await this.obs.call("SetCurrentProgramScene", {
        sceneName
      });
      this.logger.info(`Switched to scene: ${sceneName}`);
    } catch (error) {
      this.logger.error(
        `Failed to switch scene to ${sceneName}`,
        error.message
      );
    }
  }
  scheduleReconnect() {
    if (!this.reconnectInterval) {
      this.logger.info("Scheduling reconnect in 5s...");
      this.reconnectInterval = setInterval(() => {
        this.logger.info("Attempting to reconnect to OBS...");
        this.connect();
      }, 5e3);
    }
  }
}
class SceneManager {
  constructor(nodecg) {
    this.nodecg = nodecg;
    this.obsStateRep = nodecg.Replicant("obsState", {
      defaultValue: {
        connected: false,
        currentScene: "",
        isStreaming: false,
        isRecording: false,
        scenes: []
      }
    });
    this.obsScenesRep = nodecg.Replicant("obsScenes", {
      defaultValue: []
    });
    this.obsStateRep.value.connected = false;
  }
  setConnected(connected) {
    this.obsStateRep.value.connected = connected;
  }
  setCurrentScene(sceneName) {
    this.obsStateRep.value.currentScene = sceneName;
  }
  async updateScenes(obs) {
    try {
      const response = await obs.call("GetSceneList");
      const scenes = response.scenes.map(
        (scene, index) => ({
          name: scene.sceneName,
          index
          // OBS WebSocket 5 doesn't strictly provide index in the same way, but we can infer order
        })
      );
      this.obsScenesRep.value = JSON.parse(JSON.stringify(scenes));
      this.obsStateRep.value.scenes = JSON.parse(JSON.stringify(scenes));
      this.obsStateRep.value.currentScene = response.currentProgramSceneName;
    } catch (error) {
      this.nodecg.log.error("Failed to update scenes", error);
    }
  }
}
module.exports = function(nodecg) {
  const logger = createLogger("OBSControl");
  logger.info("Starting OBS Control Bundle");
  nodecg.Replicant("obsConnectionSettings", {
    defaultValue: {
      host: "localhost",
      port: "4455",
      password: ""
    }
  });
  logger.info("Debug: SceneManager type:", typeof SceneManager);
  logger.info("Debug: ConnectionManager type:", typeof ConnectionManager);
  if (typeof SceneManager !== "function")
    logger.error("SceneManager is not a constructor/function!", SceneManager);
  if (typeof ConnectionManager !== "function")
    logger.error(
      "ConnectionManager is not a constructor/function!",
      ConnectionManager
    );
  const sceneManager = new SceneManager(nodecg);
  const connectionManager = new ConnectionManager(nodecg, sceneManager);
  nodecg.listenFor(
    "connectOBS",
    (data) => {
      connectionManager.connect(data);
    }
  );
  nodecg.listenFor("disconnectOBS", () => {
    connectionManager.disconnect();
  });
  nodecg.listenFor("setOBSScene", (sceneName) => {
    logger.info(`Received request to switch scene to: ${sceneName}`);
    connectionManager.setScene(sceneName);
  });
};
