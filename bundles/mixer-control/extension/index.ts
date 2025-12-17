import NodeCG from "nodecg/types";
import { ConnectionManager } from "./connection";
import { StateManager } from "./state-manager";
import { createLogger } from "../../../shared/utils/logger";
import { MixerConnectionSettings } from "../../../shared/types/mixer.types";

module.exports = function (nodecg: NodeCG.ServerAPI) {
  const logger = createLogger("MixerControl");
  logger.setNodeCG(nodecg);
  logger.info("Starting Mixer Control Bundle");

  // Initialize Replicants
  nodecg.Replicant<MixerConnectionSettings>("mixerConnectionSettings", {
    defaultValue: {
      ip: "127.0.0.1",
      port: "8000",
      protocol: "udp",
    },
  });

  const stateManager = new StateManager(nodecg);
  const connectionManager = new ConnectionManager(nodecg, stateManager);

  // Listeners
  nodecg.listenFor(
    "connectMixer",
    (data: { ip: string; port: number; protocol: "udp" | "tcp" }) => {
      connectionManager.connect(data);
    }
  );

  nodecg.listenFor("disconnectMixer", () => {
    connectionManager.disconnect();
  });

  nodecg.listenFor(
    "setMixerFader",
    (data: { channelId: number; level: number }) => {
      connectionManager.setFaderLevel(data.channelId, data.level);
    }
  );

  nodecg.listenFor(
    "setMixerMute",
    (data: { channelId: number; isMuted: boolean }) => {
      connectionManager.setMute(data.channelId, data.isMuted);
    }
  );

  nodecg.listenFor(
    "setMixerOutputFader",
    (data: { outputId: number; level: number }) => {
      connectionManager.setOutputFaderLevel(data.outputId, data.level);
    }
  );

  nodecg.listenFor(
    "setMixerOutputMute",
    (data: { outputId: number; isMuted: boolean }) => {
      connectionManager.setOutputMute(data.outputId, data.isMuted);
    }
  );

  nodecg.listenFor(
    "setMixerInputSendActive",
    (data: { outputId: number; inputId: number; active: boolean }) => {
      connectionManager.setInputSendActive(
        data.outputId,
        data.inputId,
        data.active
      );
    }
  );

  nodecg.listenFor(
    "setMixerInputSendLevel",
    (data: { outputId: number; inputId: number; level: number }) => {
      connectionManager.setInputSendLevel(
        data.outputId,
        data.inputId,
        data.level
      );
    }
  );

  nodecg.listenFor(
    "setMixerInputSendPre",
    (data: { outputId: number; inputId: number; pre: boolean }) => {
      connectionManager.setInputSendPre(data.outputId, data.inputId, data.pre);
    }
  );

  nodecg.listenFor(
    "setMixerInputSendPan",
    (data: { outputId: number; inputId: number; pan: number }) => {
      connectionManager.setInputSendPan(data.outputId, data.inputId, data.pan);
    }
  );

  nodecg.listenFor("queryOutputRouting", (data: { outputId: number }) => {
    connectionManager.queryOutputRouting(data.outputId);
  });

  nodecg.listenFor(
    "setMixerInputPatch",
    (data: { channelId: number; patch: string }) => {
      connectionManager.setInputPatch(data.channelId, data.patch);
    }
  );
};
