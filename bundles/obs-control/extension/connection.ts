import { OBSWebSocket } from "obs-websocket-js";
import NodeCG from "nodecg/types";
import { SceneManager } from "./scene-manager";
import { createLogger } from "../../../shared/utils/logger";
import { OBSConnectionSettings } from "../../../shared/types/obs.types";

export class ConnectionManager {
  private nodecg: NodeCG.ServerAPI;
  private sceneManager: SceneManager;
  private obsInstances: Map<string, OBSWebSocket> = new Map();
  private logger = createLogger("OBSConnection");
  private config: any;
  private statsIntervals: Map<string, NodeJS.Timeout> = new Map();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();

  private obsConnectionsRep: any;

  constructor(
    nodecg: NodeCG.ServerAPI,
    sceneManager: SceneManager,
    obsConnectionsRep: any
  ) {
    this.nodecg = nodecg;
    this.logger.setNodeCG(nodecg);
    this.sceneManager = sceneManager;
    this.config = nodecg.bundleConfig;
    this.obsConnectionsRep = obsConnectionsRep;

    this.setupMessageListeners();
  }

  public connectAll() {
    this.logger.info("Auto-connecting to all defined OBS instances...");
    const connections = this.obsConnectionsRep.value || [];
    connections.forEach((conn: OBSConnectionSettings) => {
      this.connect(conn);
    });
  }

  private setupMessageListeners() {
    this.nodecg.listenFor(
      "setOBSTransition",
      (data: { id: string; transition: string }, ack: any) => {
        this.logger.info(
          `[setOBSTransition] Request for ID: ${data.id}, Transition: ${data.transition}`
        );
        this.setTransition(data.id, data.transition)
          .then(() => {
            if (ack && !ack.handled) ack(null);
          })
          .catch((err) => {
            this.logger.error(`[setOBSTransition] Error: ${err.message}`);
            if (ack && !ack.handled) ack(err);
          });
      }
    );

    this.nodecg.listenFor(
      "startStreaming",
      async (data: { id: string }, ack: any) => {
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
      async (data: { id: string }, ack: any) => {
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
      async (data: { id: string; settings: any }, ack: any) => {
        try {
          await this.setStreamSettings(data.id, data.settings);
          if (ack && !ack.handled) ack(null);
        } catch (err) {
          if (ack && !ack.handled) ack(err);
        }
      }
    );

    this.nodecg.listenFor("connectOBS", (data: OBSConnectionSettings) => {
      this.connect(data);
    });

    this.nodecg.listenFor("disconnectOBS", (data: { id: string }) => {
      this.disconnect(data.id);
    });

    this.nodecg.listenFor(
      "setOBSScene",
      (data: { id: string; scene: string }) => {
        this.logger.info(
          `[setOBSScene] Request for ID: ${data.id}, Scene: ${data.scene}`
        );
        this.setScene(data.id, data.scene);
      }
    );
  }

  private getObs(id: string): OBSWebSocket | undefined {
    return this.obsInstances.get(id);
  }

  private setupObsListeners(obsId: string, obs: OBSWebSocket) {
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
          fps: 0,
        });

        if (stats.outputActive) {
          this.startStatsPolling(obsId, obs);
        }

        // Sync settings on connection
        await this.syncStreamSettings(obsId, obs);
      } catch (err: any) {
        this.logger.error(
          `[${obsId}] Failed to get initial stream status`,
          err?.message || err
        );
      }
    });

    obs.on("ConnectionClosed", () => {
      this.logger.warn(`[${obsId}] Disconnected from OBS`);
      this.sceneManager.setStatus(obsId, "disconnected");
      this.stopStatsPolling(obsId);

      // We don't auto-reconnect here for simplicity in this refactor,
      // or we could check if we should be connected.
      // For now, let's just clear intervals.
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
        outputActive: data.outputActive,
      });

      if (data.outputActive) {
        this.startStatsPolling(obsId, obs);
        this.syncStreamSettings(obsId, obs).catch((e) =>
          this.logger.error(
            `[${obsId}] Failed to sync settings on stream start`,
            e
          )
        );
      } else {
        this.stopStatsPolling(obsId);
      }
    });
  }

  async connect(settings: OBSConnectionSettings) {
    const { id, host, port, password } = settings;

    // If exists, might be reconnecting?
    let obs = this.obsInstances.get(id);
    if (!obs) {
      obs = new OBSWebSocket();
      this.obsInstances.set(id, obs);
      this.setupObsListeners(id, obs);
    }

    // Clear any existing reconnects
    if (this.reconnectTimeouts.has(id)) {
      clearTimeout(this.reconnectTimeouts.get(id));
      this.reconnectTimeouts.delete(id);
    }

    const address = `ws://${host}:${port}`;
    this.logger.info(`[${id}] Connecting to OBS at ${address}`);
    this.sceneManager.setStatus(id, "connecting");

    try {
      await obs.connect(address, password);
    } catch (error: any) {
      this.logger.warn(`[${id}] Failed to connect: ${error.message}`);
      this.sceneManager.setStatus(id, "error");

      // Retry logic? For now, no auto-retry loop to keep it simple, OR implement simple retry.
    }
  }

  async disconnect(id: string) {
    const obs = this.obsInstances.get(id);
    if (obs) {
      try {
        await obs.disconnect();
        this.logger.info(`[${id}] Manually disconnected`);
      } catch (e: any) {
        this.logger.error(`[${id}] Failed to disconnect`, e.message);
      }
      // We keep the instance in memory for now, or we could delete it if we want to force fresh start.
      // But keeping it preserves listeners.
      // Actually, if we remove connection from UI, we might want to clean up.
      // But this is just "disconnect".
    }
    this.sceneManager.setStatus(id, "disconnected");
    this.stopStatsPolling(id);
  }

  // Cleanup method if a connection is removed completely
  async removeConnection(id: string) {
    await this.disconnect(id);
    this.obsInstances.delete(id);
    this.sceneManager.deleteState(id);
  }

  async setScene(id: string, sceneName: string) {
    const obs = this.getObs(id);
    if (!obs) return;
    try {
      await obs.call("SetCurrentProgramScene", {
        sceneName: sceneName,
      });
      this.logger.info(`[${id}] Switched to scene: ${sceneName}`);
    } catch (error: any) {
      this.logger.error(`[${id}] Failed to switch scene`, error.message);
    }
  }

  async setTransition(id: string, transitionName: string) {
    const obs = this.getObs(id);
    if (!obs) return;
    try {
      await obs.call("SetCurrentSceneTransition", {
        transitionName: transitionName,
      });
      this.logger.info(`[${id}] Switched to transition: ${transitionName}`);
    } catch (error: any) {
      this.logger.error(`[${id}] Failed to switch transition`, error.message);
      throw error;
    }
  }

  async setStreamSettings(
    id: string,
    settings: {
      server: string;
      key: string;
      useAuth: boolean;
      username?: string;
      password?: string;
    }
  ) {
    const obs = this.getObs(id);
    if (!obs) return;
    try {
      const streamSettings: any = {
        server: settings.server,
        key: settings.key,
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
        streamServiceSettings: streamSettings,
      });
      this.logger.info(`[${id}] Stream settings updated`);
    } catch (error: any) {
      this.logger.error(`[${id}] Failed to set stream settings`, error.message);
      throw error;
    }
  }

  async syncStreamSettings(id: string, obs: OBSWebSocket) {
    try {
      // NOTE: We need to store settings PER ID in replicant.
      // We need a new replicant structure for this.
      // obsStreamSettings -> obsStreamSettingsMap: Record<string, settings>
      // For now, let's assume the frontend will listen to a specific replicant or we pass it back?
      // Let's use a Replicant `obsStreamSettings` as Record<string, Settings>

      const response = await obs.call("GetStreamServiceSettings");
      const settings = response.streamServiceSettings as any;

      const newSettings = {
        server: settings.server || "",
        key: settings.key || "",
        useAuth: settings.use_auth || false,
        username: settings.username || "",
        password: settings.password || "",
      };

      const streamSettingsRep = this.nodecg.Replicant<Record<string, any>>(
        "obsStreamSettings",
        { defaultValue: {} }
      );
      if (!streamSettingsRep.value) streamSettingsRep.value = {}; // Type safety
      streamSettingsRep.value[id] = newSettings;

      this.logger.info(`[${id}] Synced stream settings from OBS`);
    } catch (error: any) {
      this.logger.error(
        `[${id}] Failed to sync stream settings`,
        error.message
      );
    }
  }

  private startStatsPolling(id: string, obs: OBSWebSocket) {
    if (this.statsIntervals.has(id)) {
      clearInterval(this.statsIntervals.get(id));
    }

    const interval = setInterval(async () => {
      try {
        const stats = await obs.call("GetStreamStatus");
        this.sceneManager.updateStreamStats(id, {
          ...stats,
          kbitsPerSec: 0,
          fps: 0,
        });
      } catch (e) {
        // ignore
      }
    }, 2000);
    this.statsIntervals.set(id, interval);
  }

  private stopStatsPolling(id: string) {
    if (this.statsIntervals.has(id)) {
      clearInterval(this.statsIntervals.get(id));
      this.statsIntervals.delete(id);
    }
    this.sceneManager.updateStreamStats(id, {
      outputActive: false,
      fps: 0,
      kbitsPerSec: 0,
      averageFrameTime: 0,
      outputTimecode: "00:00:00",
    });
  }
}
