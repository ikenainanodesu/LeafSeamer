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
  constructor(nodecg, sceneManager) {
    this.logger = createLogger("OBSConnection");
    this.reconnectInterval = null;
    this.shouldBeConnected = false;
    this.isConnecting = false;
    this.nodecg = nodecg;
    this.logger.setNodeCG(nodecg);
    this.sceneManager = sceneManager;
    this.config = nodecg.bundleConfig;
    this.obs = new obsWebsocketJs.OBSWebSocket();
    this.setupListeners();
  }
  setupListeners() {
    this.obs.on("Identified", () => {
      this.logger.info("Connected to OBS");
      this.sceneManager.setStatus("connected");
      this.sceneManager.updateScenes(this.obs);
      this.sceneManager.updateTransitions(this.obs);
    });
    this.obs.on("ConnectionClosed", () => {
      this.logger.warn("Disconnected from OBS");
      if (this.isConnecting) return;
      this.sceneManager.setStatus("disconnected");
      if (this.shouldBeConnected) {
        this.connect();
      }
    });
    this.obs.on("CurrentProgramSceneChanged", (data) => {
      this.sceneManager.setCurrentScene(data.sceneName);
    });
    this.obs.on("CurrentSceneTransitionChanged", (data) => {
      this.sceneManager.setCurrentTransition(data.transitionName);
    });
    this.nodecg.listenFor(
      "setOBSTransition",
      (transitionName, ack) => {
        this.setTransition(transitionName).then(() => {
          if (ack && !ack.handled) {
            ack(null);
          }
        }).catch((err) => {
          if (ack && !ack.handled) {
            ack(err);
          }
        });
      }
    );
  }
  async connect(params) {
    var _a, _b, _c;
    if (this.isConnecting) return;
    this.shouldBeConnected = true;
    this.isConnecting = true;
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
    this.sceneManager.setStatus("connecting");
    const maxRetries = 3;
    const retryInterval = 2e3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      if (!this.shouldBeConnected) return;
      try {
        await this.obs.connect(address, password);
        return;
      } catch (error) {
        this.logger.warn(
          `Failed to connect to OBS (Attempt ${attempt}/${maxRetries}): ${error.message}`
        );
        if (attempt < maxRetries) {
          if (!this.shouldBeConnected) return;
          await new Promise((resolve) => setTimeout(resolve, retryInterval));
        } else {
          this.logger.error("All connection attempts failed");
          this.sceneManager.setStatus("error");
          this.shouldBeConnected = false;
        }
      }
    }
    this.isConnecting = false;
  }
  async disconnect() {
    this.shouldBeConnected = false;
    this.sceneManager.setStatus("disconnected");
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
  async setTransition(transitionName) {
    try {
      await this.obs.call("SetCurrentSceneTransition", {
        transitionName
      });
      this.logger.info(`Switched to transition: ${transitionName}`);
    } catch (error) {
      this.logger.error(
        `Failed to switch transition to ${transitionName}`,
        error.message
      );
      throw error;
    }
  }
}
class SceneManager {
  constructor(nodecg) {
    this.nodecg = nodecg;
    this.obsStateRep = nodecg.Replicant("obsState", {
      defaultValue: {
        connected: false,
        status: "disconnected",
        currentScene: "",
        isStreaming: false,
        isRecording: false,
        scenes: [],
        transitions: [],
        currentTransition: ""
      }
    });
    this.obsScenesRep = nodecg.Replicant("obsScenes", {
      defaultValue: []
    });
    this.obsStateRep.value.connected = false;
    this.obsStateRep.value.status = "disconnected";
  }
  setConnected(connected) {
    this.obsStateRep.value.connected = connected;
    this.obsStateRep.value.status = connected ? "connected" : "disconnected";
  }
  setStatus(status) {
    this.obsStateRep.value.status = status;
    this.obsStateRep.value.connected = status === "connected";
  }
  setCurrentScene(sceneName) {
    this.obsStateRep.value.currentScene = sceneName;
  }
  setCurrentTransition(transitionName) {
    this.obsStateRep.value.currentTransition = transitionName;
  }
  async updateScenes(obs) {
    try {
      const response = await obs.call("GetSceneList");
      const scenes = response.scenes.map(
        (scene, index) => ({
          name: scene.sceneName,
          index
        })
      );
      this.obsScenesRep.value = JSON.parse(JSON.stringify(scenes));
      this.obsStateRep.value.scenes = JSON.parse(JSON.stringify(scenes));
      this.obsStateRep.value.currentScene = response.currentProgramSceneName;
    } catch (error) {
      this.nodecg.log.error("Failed to update scenes", error);
    }
  }
  async updateTransitions(obs) {
    try {
      const response = await obs.call("GetSceneTransitionList");
      this.obsStateRep.value.transitions = response.transitions.map(
        (t) => t.transitionName
      );
      this.obsStateRep.value.currentTransition = response.currentSceneTransitionName;
    } catch (error) {
      this.nodecg.log.error("Failed to update transitions", error);
    }
  }
}
module.exports = function(nodecg) {
  const logger = createLogger("OBSControl");
  logger.setNodeCG(nodecg);
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
