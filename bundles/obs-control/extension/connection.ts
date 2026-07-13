import { OBSWebSocket } from "obs-websocket-js";
import NodeCG from "nodecg/types";
import { SceneManager } from "./scene-manager";
import { SourceManager } from "./source-manager";
import { createLogger } from "./logger";
import {
  OBSConnectionDraft,
  OBSConnectionSettings,
  OBSStreamSettings,
  OBSStreamSettingsDraft,
} from "../src/types/obs.types";
import { CommandGateway } from "../../../shared/security/command-gateway";
import { createLegacyCommandEnvelope } from "../../../shared/security/nodecg-command";
import { OBSSecretSettings } from "./secret-settings";
import { allowsLegacyPrivilegedMessages } from "../../../shared/security/authenticated-command";

interface SetStreamSettingsPayload {
  id: string;
  settings: OBSStreamSettingsDraft;
}

export class ConnectionManager {
  private nodecg: NodeCG.ServerAPI;
  private sceneManager: SceneManager;
  private sourceManager: SourceManager;
  private obsInstances: Map<string, OBSWebSocket> = new Map();
  private logger = createLogger("OBSConnection");
  private config: any;
  private statsIntervals: Map<string, NodeJS.Timeout> = new Map();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    nodecg: NodeCG.ServerAPI,
    sceneManager: SceneManager,
    sourceManager: SourceManager,
    private readonly obsConnectionsRep: NodeCG.ServerReplicant<
      OBSConnectionSettings[]
    >,
    private readonly streamSettingsRep: NodeCG.ServerReplicant<
      Record<string, OBSStreamSettings>
    >,
    private readonly commandGateway: CommandGateway,
    private readonly secretSettings: OBSSecretSettings,
  ) {
    this.nodecg = nodecg;
    this.logger.setNodeCG(nodecg);
    this.sceneManager = sceneManager;
    this.sourceManager = sourceManager;
    this.config = nodecg.bundleConfig;
    this.registerCommands();
    this.setupMessageListeners();
  }

  private registerCommands(): void {
    this.commandGateway.register<SetStreamSettingsPayload, void>({
      command: "obs.setStreamSettings",
      roles: ["broadcast", "superuser"],
      validate: (payload) => {
        const errors: string[] = [];
        if (!payload || typeof payload.id !== "string" || payload.id.length === 0) {
          errors.push("id is required");
        }
        if (!payload?.settings || typeof payload.settings.server !== "string") {
          errors.push("settings.server must be a string");
        }
        if (
          typeof payload?.settings?.key !== "undefined" &&
          typeof payload.settings.key !== "string"
        ) {
          errors.push("settings.key must be a string when provided");
        }
        if (typeof payload?.settings?.useAuth !== "boolean") {
          errors.push("settings.useAuth must be a boolean");
        }
        if (
          payload?.settings?.useAuth &&
          typeof payload.settings.username !== "string"
        ) {
          errors.push("authenticated streaming requires a username");
        }
        return errors;
      },
      resolveTarget: (payload) => payload.id,
      isTargetAllowed: (target) => this.obsInstances.has(target),
      handler: async (payload) => {
        await this.setStreamSettings(payload.id, payload.settings);
      },
    });

    this.commandGateway.register<OBSConnectionDraft, OBSConnectionSettings>({
      command: "obs.saveConnection",
      roles: ["broadcast", "superuser"],
      validate: (payload) => this.validateConnection(payload),
      resolveTarget: (payload) => payload.id,
      handler: async (payload) => this.saveConnection(payload),
    });

    this.commandGateway.register<{ id: string }, void>({
      command: "obs.connect",
      roles: ["broadcast", "superuser"],
      validate: (payload) =>
        payload && typeof payload.id === "string" && payload.id.length > 0
          ? []
          : ["id is required"],
      resolveTarget: (payload) => payload.id,
      isTargetAllowed: (target) => this.hasConnection(target),
      handler: async (payload) => this.connectById(payload.id),
    });

    this.commandGateway.register<{ id: string }, void>({
      command: "obs.removeConnection",
      roles: ["broadcast", "superuser"],
      validate: (payload) =>
        payload && typeof payload.id === "string" && payload.id.length > 0
          ? []
          : ["id is required"],
      resolveTarget: (payload) => payload.id,
      isTargetAllowed: (target) => this.hasConnection(target),
      handler: async (payload) => this.removeConnection(payload.id),
    });

    this.commandGateway.register<{ id: string }, void>({
      command: "obs.disconnect",
      roles: ["broadcast", "superuser"],
      validate: (payload) =>
        payload && typeof payload.id === "string" && payload.id.length > 0
          ? []
          : ["id is required"],
      resolveTarget: (payload) => payload.id,
      isTargetAllowed: (target) => this.hasConnection(target),
      handler: async (payload) => this.disconnect(payload.id),
    });

    for (const [command, requestType] of [
      ["obs.startStreaming", "StartStream"],
      ["obs.stopStreaming", "StopStream"],
    ] as const) {
      this.commandGateway.register<{ id: string }, void>({
        command,
        roles: ["broadcast", "superuser"],
        validate: (payload) =>
          payload && typeof payload.id === "string" && payload.id.length > 0
            ? []
            : ["id is required"],
        resolveTarget: (payload) => payload.id,
        isTargetAllowed: (target) => this.obsInstances.has(target),
        handler: async (payload) => {
          const obs = this.getObs(payload.id);
          if (!obs) throw new Error(`OBS instance ${payload.id} is unavailable`);
          await obs.call(requestType);
        },
      });
    }
  }

  async initialize(
    legacyConnections: Array<OBSConnectionDraft>,
    legacyStreams: Record<string, OBSStreamSettingsDraft>
  ): Promise<void> {
    const publicConnections: OBSConnectionSettings[] = [];
    for (const connection of legacyConnections) {
      try {
        const prepared = await this.secretSettings.prepareConnection(connection);
        publicConnections.push(prepared.publicSettings);
      } catch (error) {
        this.logger.error(
          `[${connection.id}] Failed to migrate OBS connection secret`,
          error instanceof Error ? error.message : String(error)
        );
        publicConnections.push({
          id: connection.id,
          name: connection.name,
          host: connection.host,
          port: connection.port,
          passwordConfigured: false,
        });
      }
    }
    this.obsConnectionsRep.value = publicConnections;

    const publicStreams: Record<string, OBSStreamSettings> = {};
    for (const [id, settings] of Object.entries(legacyStreams)) {
      try {
        const prepared = await this.secretSettings.prepareStream(id, settings);
        publicStreams[id] = prepared.publicSettings;
      } catch (error) {
        this.logger.error(
          `[${id}] Failed to migrate OBS stream secret`,
          error instanceof Error ? error.message : String(error)
        );
        publicStreams[id] = {
          server: settings.server ?? "",
          useAuth: settings.useAuth === true,
          username: settings.username ?? "",
          keyConfigured: false,
          passwordConfigured: false,
        };
      }
    }
    this.streamSettingsRep.value = publicStreams;

    this.logger.info("Auto-connecting to all defined OBS instances...");
    await Promise.all(
      publicConnections.map((connection) =>
        this.connectById(connection.id).catch(() => undefined)
      )
    );
  }

  private setupMessageListeners() {
    this.nodecg.listenFor(
      "setOBSTransition",
      (data: { id: string; transition: string }, ack: any) => {
        this.logger.info(
          `[setOBSTransition] Request for ID: ${data.id}, Transition: ${data.transition}`,
        );
        this.setTransition(data.id, data.transition)
          .then(() => {
            if (ack && !ack.handled) ack(null);
          })
          .catch((err) => {
            this.logger.error(`[setOBSTransition] Error: ${err.message}`);
            if (ack && !ack.handled) ack(err);
          });
      },
    );

    this.nodecg.listenFor(
      "startStreaming",
      async (data: { id: string }, ack: any) => {
        if (!this.acceptLegacyPrivilegedMessage(ack)) return;
        try {
          const obs = this.getObs(data.id);
          if (obs) await obs.call("StartStream");
          if (ack && !ack.handled) ack(null);
        } catch (err) {
          if (ack && !ack.handled) ack(err);
        }
      },
    );

    this.nodecg.listenFor(
      "stopStreaming",
      async (data: { id: string }, ack: any) => {
        if (!this.acceptLegacyPrivilegedMessage(ack)) return;
        try {
          const obs = this.getObs(data.id);
          if (obs) await obs.call("StopStream");
          if (ack && !ack.handled) ack(null);
        } catch (err) {
          if (ack && !ack.handled) ack(err);
        }
      },
    );

    this.nodecg.listenFor(
      "setStreamSettings",
      async (data: SetStreamSettingsPayload, ack: any) => {
        if (!this.acceptLegacyPrivilegedMessage(ack)) return;
        const result = await this.commandGateway.execute(
          createLegacyCommandEnvelope("obs.setStreamSettings", data, ["broadcast"])
        );
        if (ack && !ack.handled) {
          ack(
            result.ok
              ? null
              : new Error(result.error?.message ?? "Stream settings failed")
          );
        }
      },
    );

    this.nodecg.listenFor(
      "saveOBSConnection",
      async (data: OBSConnectionDraft, ack: any) => {
        if (!this.acceptLegacyPrivilegedMessage(ack)) return;
        const result = await this.commandGateway.execute(
          createLegacyCommandEnvelope("obs.saveConnection", data, ["broadcast"])
        );
        if (ack && !ack.handled) {
          ack(
            result.ok
              ? null
              : new Error(result.error?.message ?? "Connection save failed"),
            result.result
          );
        }
      }
    );

    this.nodecg.listenFor(
      "connectOBS",
      async (data: OBSConnectionDraft | { id: string }, ack: any) => {
        if (!this.acceptLegacyPrivilegedMessage(ack)) return;
        try {
          if ("host" in data) await this.saveConnection(data);
          const result = await this.commandGateway.execute(
            createLegacyCommandEnvelope("obs.connect", { id: data.id }, [
              "broadcast",
            ])
          );
          if (ack && !ack.handled) {
            ack(
              result.ok
                ? null
                : new Error(result.error?.message ?? "OBS connection failed")
            );
          }
        } catch (error) {
          if (ack && !ack.handled) ack(error as Error);
        }
      }
    );

    this.nodecg.listenFor("disconnectOBS", (data: { id: string }, ack: any) => {
      if (!this.acceptLegacyPrivilegedMessage(ack)) return;
      void this.disconnect(data.id);
    });

    this.nodecg.listenFor(
      "removeOBSConnection",
      async (data: { id: string }, ack: any) => {
        if (!this.acceptLegacyPrivilegedMessage(ack)) return;
        const result = await this.commandGateway.execute(
          createLegacyCommandEnvelope("obs.removeConnection", data, [
            "broadcast",
          ])
        );
        if (ack && !ack.handled) {
          ack(
            result.ok
              ? null
              : new Error(result.error?.message ?? "Connection removal failed")
          );
        }
      }
    );

    this.nodecg.listenFor(
      "setOBSScene",
      (data: { id: string; scene: string }) => {
        this.logger.info(
          `[setOBSScene] Request for ID: ${data.id}, Scene: ${data.scene}`,
        );
        this.setScene(data.id, data.scene);
      },
    );

    // ===== 场景源管理相关消息 =====

    // 获取指定场景的Source列表
    this.nodecg.listenFor(
      "getSceneItems",
      async (data: { id: string; sceneName: string }, ack: any) => {
        try {
          const obs = this.getObs(data.id);
          if (!obs) throw new Error(`OBS实例 ${data.id} 未连接`);
          const items = await this.sourceManager.getSceneItems(
            obs,
            data.sceneName,
          );
          if (ack && !ack.handled) ack(null, items);
        } catch (err) {
          if (ack && !ack.handled) ack(err);
        }
      },
    );

    // 切换场景源的可见性
    this.nodecg.listenFor(
      "setSceneItemEnabled",
      async (
        data: {
          id: string;
          sceneName: string;
          sceneItemId: number;
          enabled: boolean;
        },
        ack: any,
      ) => {
        try {
          const obs = this.getObs(data.id);
          if (!obs) throw new Error(`OBS实例 ${data.id} 未连接`);
          await this.sourceManager.setSceneItemEnabled(
            obs,
            data.sceneName,
            data.sceneItemId,
            data.enabled,
          );
          if (ack && !ack.handled) ack(null);
        } catch (err) {
          if (ack && !ack.handled) ack(err);
        }
      },
    );

    // 调整场景源的层级顺序
    this.nodecg.listenFor(
      "setSceneItemIndex",
      async (
        data: {
          id: string;
          sceneName: string;
          sceneItemId: number;
          newIndex: number;
        },
        ack: any,
      ) => {
        try {
          const obs = this.getObs(data.id);
          if (!obs) throw new Error(`OBS实例 ${data.id} 未连接`);
          await this.sourceManager.setSceneItemIndex(
            obs,
            data.sceneName,
            data.sceneItemId,
            data.newIndex,
          );
          if (ack && !ack.handled) ack(null);
        } catch (err) {
          if (ack && !ack.handled) ack(err);
        }
      },
    );

    // 获取媒体输入的播放状态
    this.nodecg.listenFor(
      "getMediaStatus",
      async (data: { id: string; inputName: string }, ack: any) => {
        try {
          const obs = this.getObs(data.id);
          if (!obs) throw new Error(`OBS实例 ${data.id} 未连接`);
          const status = await this.sourceManager.getMediaStatus(
            obs,
            data.inputName,
          );
          if (ack && !ack.handled) ack(null, status);
        } catch (err) {
          if (ack && !ack.handled) ack(err);
        }
      },
    );

    // 触发媒体输入操作（播放/暂停/停止/上一曲/下一曲/重置）
    this.nodecg.listenFor(
      "triggerMediaAction",
      async (
        data: { id: string; inputName: string; action: string },
        ack: any,
      ) => {
        try {
          const obs = this.getObs(data.id);
          if (!obs) throw new Error(`OBS实例 ${data.id} 未连接`);
          await this.sourceManager.triggerMediaAction(
            obs,
            data.inputName,
            data.action,
          );
          if (ack && !ack.handled) ack(null);
        } catch (err) {
          if (ack && !ack.handled) ack(err);
        }
      },
    );

    // 设置媒体输入的播放位置（进度条拖拽）
    this.nodecg.listenFor(
      "setMediaCursor",
      async (
        data: { id: string; inputName: string; cursor: number },
        ack: any,
      ) => {
        try {
          const obs = this.getObs(data.id);
          if (!obs) throw new Error(`OBS实例 ${data.id} 未连接`);
          await this.sourceManager.setMediaCursor(
            obs,
            data.inputName,
            data.cursor,
          );
          if (ack && !ack.handled) ack(null);
        } catch (err) {
          if (ack && !ack.handled) ack(err);
        }
      },
    );

    // 获取输入设置（用于VLC播放列表等）
    this.nodecg.listenFor(
      "getInputSettings",
      async (data: { id: string; inputName: string }, ack: any) => {
        try {
          const obs = this.getObs(data.id);
          if (!obs) throw new Error(`OBS实例 ${data.id} 未连接`);
          const settings = await this.sourceManager.getInputSettings(
            obs,
            data.inputName,
          );
          if (ack && !ack.handled) ack(null, settings);
        } catch (err) {
          if (ack && !ack.handled) ack(err);
        }
      },
    );

    // 设置输入配置（用于VLC播放列表切换播放项等）
    this.nodecg.listenFor(
      "setInputSettings",
      async (
        data: { id: string; inputName: string; settings: any },
        ack: any,
      ) => {
        try {
          const obs = this.getObs(data.id);
          if (!obs) throw new Error(`OBS实例 ${data.id} 未连接`);
          await this.sourceManager.setInputSettings(
            obs,
            data.inputName,
            data.settings,
          );
          if (ack && !ack.handled) ack(null);
        } catch (err) {
          if (ack && !ack.handled) ack(err);
        }
      },
    );

    // 刷新Scene和Source列表（前端刷新按钮触发）
    this.nodecg.listenFor(
      "refreshOBSScenes",
      async (data: { id: string }, ack: any) => {
        try {
          const obs = this.getObs(data.id);
          if (!obs) throw new Error(`OBS实例 ${data.id} 未连接`);
          // 重新获取Scene列表和Transition列表
          await this.sceneManager.updateScenes(data.id, obs);
          await this.sceneManager.updateTransitions(data.id, obs);
          if (ack && !ack.handled) ack(null);
        } catch (err) {
          if (ack && !ack.handled) ack(err);
        }
      },
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
          err?.message || err,
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
        `[${obsId}] Stream State Changed: Active=${data.outputActive}`,
      );

      this.sceneManager.updateStreamStats(obsId, {
        outputActive: data.outputActive,
      });

      if (data.outputActive) {
        this.startStatsPolling(obsId, obs);
        this.syncStreamSettings(obsId, obs).catch((e) =>
          this.logger.error(
            `[${obsId}] Failed to sync settings on stream start`,
            e,
          ),
        );
      } else {
        this.stopStatsPolling(obsId);
      }
    });
  }

  private validateConnection(settings: OBSConnectionDraft): string[] {
    const errors: string[] = [];
    if (!settings || !/^[A-Za-z0-9._-]+$/.test(settings.id ?? "")) {
      errors.push("id contains unsupported characters");
    }
    if (!settings?.host || typeof settings.host !== "string") {
      errors.push("host is required");
    }
    const port = Number(settings?.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      errors.push("port must be an integer between 1 and 65535");
    }
    return errors;
  }

  private acceptLegacyPrivilegedMessage(ack: any): boolean {
    if (allowsLegacyPrivilegedMessages(this.nodecg.bundleConfig)) return true;
    if (ack && !ack.handled) {
      ack(
        new Error(
          "Legacy privileged messages are disabled; use the authenticated command channel"
        )
      );
    }
    return false;
  }

  private hasConnection(id: string): boolean {
    return (this.obsConnectionsRep.value ?? []).some(
      (connection) => connection.id === id
    );
  }

  async saveConnection(
    settings: OBSConnectionDraft
  ): Promise<OBSConnectionSettings> {
    const errors = this.validateConnection(settings);
    if (errors.length > 0) throw new Error(errors.join("; "));
    const prepared = await this.secretSettings.prepareConnection(settings);
    const connections = [...(this.obsConnectionsRep.value ?? [])];
    const index = connections.findIndex(
      (connection) => connection.id === prepared.publicSettings.id
    );
    if (index >= 0) connections[index] = prepared.publicSettings;
    else connections.push(prepared.publicSettings);
    this.obsConnectionsRep.value = connections;
    return prepared.publicSettings;
  }

  async connect(settings: OBSConnectionDraft): Promise<void> {
    const saved = await this.saveConnection(settings);
    await this.connectById(saved.id);
  }

  async connectById(id: string): Promise<void> {
    const settings = (this.obsConnectionsRep.value ?? []).find(
      (connection) => connection.id === id
    );
    if (!settings) throw new Error(`OBS connection ${id} is not configured`);
    const prepared = await this.secretSettings.prepareConnection(settings);
    const { host, port } = prepared.publicSettings;
    const password = prepared.password;

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
      throw error;
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
    await this.secretSettings.deleteConnection(id);
    this.obsConnectionsRep.value = (this.obsConnectionsRep.value ?? []).filter(
      (connection) => connection.id !== id
    );
    const streams = { ...(this.streamSettingsRep.value ?? {}) };
    delete streams[id];
    this.streamSettingsRep.value = streams;
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
    settings: OBSStreamSettingsDraft,
  ) {
    const obs = this.getObs(id);
    if (!obs) throw new Error(`OBS instance ${id} is not connected`);
    try {
      const prepared = await this.secretSettings.prepareStream(id, settings);
      const resolved = prepared.resolvedSettings;
      const streamSettings: any = {
        server: resolved.server,
        key: resolved.key,
      };

      if (resolved.useAuth) {
        streamSettings.use_auth = true;
        streamSettings.username = resolved.username;
        streamSettings.password = resolved.password;
      } else {
        streamSettings.use_auth = false;
      }

      await obs.call("SetStreamServiceSettings", {
        streamServiceType: "rtmp_custom",
        streamServiceSettings: streamSettings,
      });
      this.streamSettingsRep.value = {
        ...(this.streamSettingsRep.value ?? {}),
        [id]: prepared.publicSettings,
      };
      this.logger.info(`[${id}] Stream settings updated`);
    } catch (error: any) {
      this.logger.error(`[${id}] Failed to set stream settings`, error.message);
      throw error;
    }
  }

  async syncStreamSettings(id: string, obs: OBSWebSocket) {
    try {
      const response = await obs.call("GetStreamServiceSettings");
      const settings = response.streamServiceSettings as any;
      const publicSettings = await this.secretSettings.captureStream(id, {
        server: settings.server || "",
        key: settings.key || "",
        useAuth: settings.use_auth || false,
        username: settings.username || "",
        password: settings.password || "",
      });
      this.streamSettingsRep.value = {
        ...(this.streamSettingsRep.value ?? {}),
        [id]: publicSettings,
      };

      this.logger.info(`[${id}] Synced stream settings from OBS`);
    } catch (error: any) {
      this.logger.error(
        `[${id}] Failed to sync stream settings`,
        error.message,
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
