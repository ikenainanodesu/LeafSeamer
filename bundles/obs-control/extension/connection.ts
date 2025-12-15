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
  private isConnecting = false;

  constructor(nodecg: NodeCG.ServerAPI, sceneManager: SceneManager) {
    this.nodecg = nodecg;
    this.logger.setNodeCG(nodecg);
    this.sceneManager = sceneManager;
    this.config = nodecg.bundleConfig;
    this.obs = new OBSWebSocket();

    this.setupListeners();
  }

  private setupListeners() {
    this.obs.on("Identified", () => {
      this.logger.info("Connected to OBS");
      this.sceneManager.setStatus("connected");
      this.sceneManager.updateScenes(this.obs);
      this.sceneManager.updateTransitions(this.obs);
    });

    this.obs.on("ConnectionClosed", () => {
      this.logger.warn("Disconnected from OBS");

      // If we are currently trying to connect, let the connect() loop handle it
      if (this.isConnecting) return;

      this.sceneManager.setStatus("disconnected");
      if (this.shouldBeConnected) {
        // Automatically try to reconnect once if strictly intended to be connected
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
      (transitionName: string, ack: any) => {
        this.setTransition(transitionName)
          .then(() => {
            if (ack && !ack.handled) {
              ack(null);
            }
          })
          .catch((err) => {
            if (ack && !ack.handled) {
              ack(err);
            }
          });
      }
    );
  }

  async connect(params?: { host: string; port: number; password?: string }) {
    if (this.isConnecting) return;

    this.shouldBeConnected = true;
    this.isConnecting = true;

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
    this.sceneManager.setStatus("connecting");

    const maxRetries = 3;
    const retryInterval = 2000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      if (!this.shouldBeConnected) return; // Stop if disconnected

      try {
        await this.obs.connect(address, password);
        return; // Success
      } catch (error: any) {
        this.logger.warn(
          `Failed to connect to OBS (Attempt ${attempt}/${maxRetries}): ${error.message}`
        );
        if (attempt < maxRetries) {
          if (!this.shouldBeConnected) return; // Stop if disconnected during wait
          await new Promise((resolve) => setTimeout(resolve, retryInterval));
        } else {
          this.logger.error("All connection attempts failed");
          this.sceneManager.setStatus("error");
          this.shouldBeConnected = false;
        }
      }
    }

    // Reset connecting flag if we exit the loop (success or failure)
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

  async setTransition(transitionName: string) {
    try {
      await this.obs.call("SetCurrentSceneTransition", {
        transitionName: transitionName,
      });
      this.logger.info(`Switched to transition: ${transitionName}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to switch transition to ${transitionName}`,
        error.message
      );
      throw error;
    }
  }
}
