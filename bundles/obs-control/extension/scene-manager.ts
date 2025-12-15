import NodeCG from "nodecg/types";
import { OBSWebSocket } from "obs-websocket-js";
import {
  OBSState,
  OBSScene,
  OBSConnectionStatus,
} from "../../../shared/types/obs.types";

export class SceneManager {
  private nodecg: NodeCG.ServerAPI;
  private obsStatesRep: any;

  constructor(nodecg: NodeCG.ServerAPI) {
    this.nodecg = nodecg;
    this.obsStatesRep = nodecg.Replicant<Record<string, OBSState>>(
      "obsStates",
      {
        defaultValue: {},
      }
    );
  }

  private getDefaultState(): OBSState {
    return {
      connected: false,
      status: "disconnected",
      currentScene: "",
      isStreaming: false,
      isRecording: false,
      scenes: [],
      transitions: [],
      currentTransition: "",
      streamStats: { fps: 0, kbitsPerSec: 0, averageFrameTime: 0 },
    };
  }

  ensureState(obsId: string) {
    if (!this.obsStatesRep.value[obsId]) {
      this.obsStatesRep.value[obsId] = this.getDefaultState();
    }
  }

  setConnected(obsId: string, connected: boolean) {
    this.ensureState(obsId);
    this.obsStatesRep.value[obsId].connected = connected;
    this.obsStatesRep.value[obsId].status = connected
      ? "connected"
      : "disconnected";
  }

  setStatus(obsId: string, status: OBSConnectionStatus) {
    this.ensureState(obsId);
    this.obsStatesRep.value[obsId].status = status;
    this.obsStatesRep.value[obsId].connected = status === "connected";
  }

  setCurrentScene(obsId: string, sceneName: string) {
    this.ensureState(obsId);
    this.obsStatesRep.value[obsId].currentScene = sceneName;
  }

  setCurrentTransition(obsId: string, transitionName: string) {
    this.ensureState(obsId);
    this.obsStatesRep.value[obsId].currentTransition = transitionName;
  }

  async updateScenes(obsId: string, obs: OBSWebSocket) {
    this.ensureState(obsId);
    try {
      const response = await obs.call("GetSceneList");
      const scenes: OBSScene[] = response.scenes.map(
        (scene: any, index: number) => ({
          name: scene.sceneName as string,
          index: index,
        })
      );

      this.obsStatesRep.value[obsId].scenes = JSON.parse(
        JSON.stringify(scenes)
      );
      this.obsStatesRep.value[obsId].currentScene =
        response.currentProgramSceneName;
    } catch (error) {
      this.nodecg.log.error(`[${obsId}] Failed to update scenes`, error);
    }
  }

  async updateTransitions(obsId: string, obs: OBSWebSocket) {
    this.ensureState(obsId);
    try {
      const response = await obs.call("GetSceneTransitionList");
      this.obsStatesRep.value[obsId].transitions = response.transitions.map(
        (t: any) => t.transitionName
      );
      this.obsStatesRep.value[obsId].currentTransition =
        response.currentSceneTransitionName;
    } catch (error) {
      this.nodecg.log.error(`[${obsId}] Failed to update transitions`, error);
    }
  }

  updateStreamStats(obsId: string, stats: any) {
    this.ensureState(obsId);
    this.obsStatesRep.value[obsId].streamStats = {
      fps: stats.fps || 0,
      kbitsPerSec: stats.kbitsPerSec || 0,
      averageFrameTime: stats.averageFrameTime || 0,
      outputTimecode: stats.outputTimecode,
    };
    this.obsStatesRep.value[obsId].isStreaming = stats.outputActive;
  }

  deleteState(obsId: string) {
    if (this.obsStatesRep.value[obsId]) {
      delete this.obsStatesRep.value[obsId];
    }
  }
}
