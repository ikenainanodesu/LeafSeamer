import { OBSWebSocket } from "obs-websocket-js";
import NodeCG from "nodecg/types";
import { createLogger } from "../../../shared/utils/logger";
import { OBSSceneItem } from "../../../shared/types/obs.types";

/**
 * SourceManager - 管理OBS场景源（Source）的获取、可见性切换、层级排序，
 * 以及媒体输入的状态查询和控制操作。
 */
export class SourceManager {
  private nodecg: NodeCG.ServerAPI;
  private logger = createLogger("OBSSourceManager");

  constructor(nodecg: NodeCG.ServerAPI) {
    this.nodecg = nodecg;
    this.logger.setNodeCG(nodecg);
  }

  /**
   * 获取指定场景的所有Source项
   * @param obs - OBS WebSocket实例
   * @param sceneName - 场景名称
   * @returns OBSSceneItem数组
   */
  async getSceneItems(
    obs: OBSWebSocket,
    sceneName: string,
  ): Promise<OBSSceneItem[]> {
    try {
      const response = await obs.call("GetSceneItemList", {
        sceneName,
      });

      // 将OBS返回的数据映射为前端使用的类型
      const items: OBSSceneItem[] = response.sceneItems.map(
        (item: any, index: number) => ({
          sceneItemId: item.sceneItemId,
          sourceName: item.sourceName,
          sourceType: item.sourceType || "",
          inputKind: item.inputKind || null,
          sceneItemEnabled: item.sceneItemEnabled,
          sceneItemIndex: item.sceneItemIndex ?? index,
        }),
      );

      this.logger.info(
        `Successfully got scene item list for "${sceneName}", total ${items.length} items`,
      );
      return items;
    } catch (error: any) {
      this.logger.error(
        `Failed to get scene item list for "${sceneName}": ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 切换场景源的可见性
   * @param obs - OBS WebSocket实例
   * @param sceneName - 场景名称
   * @param sceneItemId - 场景项ID
   * @param enabled - 是否显示
   */
  async setSceneItemEnabled(
    obs: OBSWebSocket,
    sceneName: string,
    sceneItemId: number,
    enabled: boolean,
  ): Promise<void> {
    try {
      await obs.call("SetSceneItemEnabled", {
        sceneName,
        sceneItemId,
        sceneItemEnabled: enabled,
      });
      this.logger.info(
        `Visibility of source #${sceneItemId} in scene "${sceneName}" set to ${enabled}`,
      );
    } catch (error: any) {
      this.logger.error(`Failed to set source visibility: ${error.message}`);
      throw error;
    }
  }

  /**
   * 调整场景源的层级索引
   * @param obs - OBS WebSocket实例
   * @param sceneName - 场景名称
   * @param sceneItemId - 场景项ID
   * @param newIndex - 新的层级索引
   */
  async setSceneItemIndex(
    obs: OBSWebSocket,
    sceneName: string,
    sceneItemId: number,
    newIndex: number,
  ): Promise<void> {
    try {
      await obs.call("SetSceneItemIndex", {
        sceneName,
        sceneItemId,
        sceneItemIndex: newIndex,
      });
      this.logger.info(
        `Index of source #${sceneItemId} in scene "${sceneName}" set to ${newIndex}`,
      );
    } catch (error: any) {
      this.logger.error(`Failed to set source index: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取媒体输入的播放状态
   * @param obs - OBS WebSocket实例
   * @param inputName - 输入源名称
   * @returns 包含 mediaState / mediaCursor / mediaDuration 的对象
   */
  async getMediaStatus(
    obs: OBSWebSocket,
    inputName: string,
  ): Promise<{
    mediaState: string;
    mediaCursor: number | null;
    mediaDuration: number | null;
  }> {
    try {
      const response = await obs.call("GetMediaInputStatus", {
        inputName,
      });
      return {
        mediaState: response.mediaState as string,
        mediaCursor: response.mediaCursor as number | null,
        mediaDuration: response.mediaDuration as number | null,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to get media status for "${inputName}": ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 触发媒体输入操作（播放/暂停/停止/上一曲/下一曲/重置）
   * @param obs - OBS WebSocket实例
   * @param inputName - 输入源名称
   * @param action - 操作枚举值，如 "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY"
   */
  async triggerMediaAction(
    obs: OBSWebSocket,
    inputName: string,
    action: string,
  ): Promise<void> {
    try {
      await obs.call("TriggerMediaInputAction", {
        inputName,
        mediaAction: action,
      });
      this.logger.info(`Media action "${action}" sent to "${inputName}"`);
    } catch (error: any) {
      this.logger.error(
        `Failed to trigger media action for "${inputName}" / "${action}": ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 设置媒体输入的播放位置
   * @param obs - OBS WebSocket实例
   * @param inputName - 输入源名称
   * @param cursor - 播放位置（毫秒）
   */
  async setMediaCursor(
    obs: OBSWebSocket,
    inputName: string,
    cursor: number,
  ): Promise<void> {
    try {
      await obs.call("SetMediaInputCursor", {
        inputName,
        mediaCursor: cursor,
      });
      this.logger.info(`Media cursor of "${inputName}" set to ${cursor}ms`);
    } catch (error: any) {
      this.logger.error(
        `Failed to set media cursor for "${inputName}": ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 获取输入的设置信息（用于读取VLC播放列表等）
   * @param obs - OBS WebSocket实例
   * @param inputName - 输入源名称
   * @returns 输入设置对象
   */
  async getInputSettings(obs: OBSWebSocket, inputName: string): Promise<any> {
    try {
      const response = await obs.call("GetInputSettings", {
        inputName,
      });
      this.logger.info(`Successfully got input settings for "${inputName}"`);
      return response.inputSettings;
    } catch (error: any) {
      this.logger.error(
        `Failed to get input settings for "${inputName}": ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 设置输入的部分配置（用于更新VLC播放列表的播放项等）
   * @param obs - OBS WebSocket实例
   * @param inputName - 输入源名称
   * @param settings - 要更新的设置对象（部分更新）
   */
  async setInputSettings(
    obs: OBSWebSocket,
    inputName: string,
    settings: any,
  ): Promise<void> {
    try {
      await obs.call("SetInputSettings", {
        inputName,
        inputSettings: settings,
      });
      this.logger.info(`Successfully set input settings for "${inputName}"`);
    } catch (error: any) {
      this.logger.error(
        `Failed to set input settings for "${inputName}": ${error.message}`,
      );
      throw error;
    }
  }
}
