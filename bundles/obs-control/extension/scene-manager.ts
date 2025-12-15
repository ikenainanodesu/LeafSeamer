import NodeCG from "nodecg/types";
import { OBSWebSocket } from "obs-websocket-js";
import {
  OBSState,
  OBSScene,
  OBSConnectionStatus,
} from "../../../shared/types/obs.types";

export class SceneManager {
  private nodecg: NodeCG.ServerAPI;
  private obsStateRep: any;
  private obsScenesRep: any;

  constructor(nodecg: NodeCG.ServerAPI) {
    this.nodecg = nodecg;
    this.obsStateRep = nodecg.Replicant<OBSState>("obsState", {
      defaultValue: {
        connected: false,
        status: "disconnected",
        currentScene: "",
        isStreaming: false,
        isRecording: false,
        scenes: [],
      },
    });
    this.obsScenesRep = nodecg.Replicant<OBSScene[]>("obsScenes", {
      defaultValue: [],
    });

    // Always reset connection state to false on startup
    this.obsStateRep.value.connected = false;
    this.obsStateRep.value.status = "disconnected";
  }

  setConnected(connected: boolean) {
    this.obsStateRep.value.connected = connected;
    this.obsStateRep.value.status = connected ? "connected" : "disconnected";
  }

  setStatus(status: OBSConnectionStatus) {
    this.obsStateRep.value.status = status;
    this.obsStateRep.value.connected = status === "connected";
  }

  setCurrentScene(sceneName: string) {
    this.obsStateRep.value.currentScene = sceneName;
  }

  async updateScenes(obs: OBSWebSocket) {
    try {
      const response = await obs.call("GetSceneList");
      const scenes: OBSScene[] = response.scenes.map(
        (scene: any, index: number) => ({
          name: scene.sceneName as string,
          index: index, // OBS WebSocket 5 doesn't strictly provide index in the same way, but we can infer order
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
