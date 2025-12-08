import { OBSWebSocket } from "obs-websocket-js";
import NodeCG from "nodecg/types";
import { SceneManager } from "./scene-manager";
import { createLogger } from "../../../shared/utils/logger";
import { OBSConnectionSettings } from "../../../shared/types/obs.types";

export class ConnectionManager {
  private nodecg: NodeCG.ServerAPI;
  private sceneManager: SceneManager;
  private obs: OBSWebSocket;
  private logger = createLogger("OBSConnection");
  private config: any;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private shouldBeConnected = false;

  constructor(nodecg: NodeCG.ServerAPI, sceneManager: SceneManager) {
    this.nodecg = nodecg;
    this.sceneManager = sceneManager;
    this.config = nodecg.bundleConfig;
    this.obs = new OBSWebSocket();

    this.setupListeners();
  }

  private setupListeners() {
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

  async connect(params?: { host: string; port: number; password?: string }) {
    this.shouldBeConnected = true;

    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }

    // Get settings from Replicant
    const settingsRep = this.nodecg.Replicant<OBSConnectionSettings>(
      "obsConnectionSettings"
    );
    const settings = settingsRep.value;

    const host =
      params?.host ||
      settings?.host ||
      this.config.obs?.defaultHost ||
      "localhost";
    const port =
      params?.port ||
      (settings?.port ? parseInt(settings.port) : undefined) ||
      this.config.obs?.defaultPort ||
      4455;
    const password =
      params?.password ||
      settings?.password ||
      this.config.obs?.defaultPassword ||
      "";

    // Update Replicant if params are provided (manual connection)
    if (params) {
      settingsRep.value = {
        host: params.host,
        port: params.port.toString(),
        password: params.password,
      };
    }

    const address = `ws://${host}:${port}`;

    this.logger.info(`Connecting to OBS at ${address}`);

    try {
      await this.obs.connect(address, password);
    } catch (error: any) {
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
    } catch (error: any) {
      this.logger.error("Failed to disconnect from OBS", error.message);
    }
  }

  async setScene(sceneName: string) {
    try {
      await this.obs.call("SetCurrentProgramScene", {
        sceneName: sceneName,
      });
      this.logger.info(`Switched to scene: ${sceneName}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to switch scene to ${sceneName}`,
        error.message
      );
    }
  }

  private scheduleReconnect() {
    if (!this.reconnectInterval) {
      this.logger.info("Scheduling reconnect in 5s...");
      this.reconnectInterval = setInterval(() => {
        this.logger.info("Attempting to reconnect to OBS...");
        this.connect();
      }, 5000);
    }
  }
}
