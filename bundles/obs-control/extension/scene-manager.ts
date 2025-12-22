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
      this.obsStatesRep.value = {
        ...this.obsStatesRep.value,
        [obsId]: this.getDefaultState(),
      };
    }
  }

  // Helper to update state immutably
  private updateState(obsId: string, transform: (state: OBSState) => OBSState) {
    this.ensureState(obsId); // Ensure it exists first
    const currentState = this.obsStatesRep.value[obsId];
    if (currentState) {
      this.obsStatesRep.value = {
        ...this.obsStatesRep.value,
        [obsId]: transform({ ...currentState }),
      };
    }
  }

  setConnected(obsId: string, connected: boolean) {
    this.updateState(obsId, (state) => ({
      ...state,
      connected,
      status: connected ? "connected" : "disconnected",
    }));
  }

  setStatus(obsId: string, status: OBSConnectionStatus) {
    this.updateState(obsId, (state) => ({
      ...state,
      status,
      connected: status === "connected",
    }));
  }

  setCurrentScene(obsId: string, sceneName: string) {
    this.updateState(obsId, (state) => ({
      ...state,
      currentScene: sceneName,
    }));
  }

  setCurrentTransition(obsId: string, transitionName: string) {
    this.updateState(obsId, (state) => ({
      ...state,
      currentTransition: transitionName,
    }));
  }

  async updateScenes(obsId: string, obs: OBSWebSocket) {
    try {
      const response = await obs.call("GetSceneList");
      const scenes: OBSScene[] = response.scenes.map(
        (scene: any, index: number) => ({
          name: scene.sceneName as string,
          index: index,
        })
      );

      this.updateState(obsId, (state) => ({
        ...state,
        scenes: scenes,
        currentScene: response.currentProgramSceneName,
      }));
    } catch (error) {
      this.nodecg.log.error(`[${obsId}] Failed to update scenes`, error);
    }
  }

  async updateTransitions(obsId: string, obs: OBSWebSocket) {
    try {
      const response = await obs.call("GetSceneTransitionList");
      const transitions = response.transitions.map(
        (t: any) => t.transitionName
      );

      this.updateState(obsId, (state) => ({
        ...state,
        transitions: transitions,
        currentTransition: response.currentSceneTransitionName,
      }));
    } catch (error) {
      this.nodecg.log.error(`[${obsId}] Failed to update transitions`, error);
    }
  }

  updateStreamStats(obsId: string, stats: any) {
    this.updateState(obsId, (state) => ({
      ...state,
      streamStats: {
        fps: stats.fps || 0,
        kbitsPerSec: stats.kbitsPerSec || 0,
        averageFrameTime: stats.averageFrameTime || 0,
        outputTimecode: stats.outputTimecode,
      },
      isStreaming: stats.outputActive,
    }));
  }

  deleteState(obsId: string) {
    if (this.obsStatesRep.value[obsId]) {
      const newVal = { ...this.obsStatesRep.value };
      delete newVal[obsId];
      this.obsStatesRep.value = newVal;
    }
  }
}
