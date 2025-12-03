import NodeCG from "nodecg/types";
import { ConnectionManager } from "./connection";
import { SceneManager } from "./scene-manager";
import { createLogger } from "../../../shared/utils/logger";
import { OBSConnectionSettings } from "../../../shared/types/obs.types";

module.exports = function (nodecg: NodeCG.ServerAPI) {
  const logger = createLogger("OBSControl");
  logger.info("Starting OBS Control Bundle");

  // Initialize Replicants
  nodecg.Replicant<OBSConnectionSettings>("obsConnectionSettings", {
    defaultValue: {
      host: "localhost",
      port: "4455",
      password: "",
    },
  });

  const sceneManager = new SceneManager(nodecg);
  const connectionManager = new ConnectionManager(nodecg, sceneManager);

  // Initialize connection
  // connectionManager.connect();

  nodecg.listenFor(
    "connectOBS",
    (data: { host: string; port: number; password?: string }) => {
      connectionManager.connect(data);
    }
  );

  nodecg.listenFor("disconnectOBS", () => {
    connectionManager.disconnect();
  });

  nodecg.listenFor("setOBSScene", (sceneName: string) => {
    logger.info(`Received request to switch scene to: ${sceneName}`);
    connectionManager.setScene(sceneName);
  });
};
