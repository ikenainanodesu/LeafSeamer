import NodeCG from "nodecg/types";
import { ConnectionManager } from "./connection";
import { SceneManager } from "./scene-manager";
import { createLogger } from "../../../shared/utils/logger";
import { OBSConnectionSettings } from "../../../shared/types/obs.types";

module.exports = function (nodecg: NodeCG.ServerAPI) {
  const logger = createLogger("OBSControl");
  logger.setNodeCG(nodecg);
  logger.info("Starting OBS Control Bundle");

  // Initialize Replicants
  // Now we use an array of connections
  nodecg.Replicant<OBSConnectionSettings[]>("obsConnections", {
    defaultValue: [
      {
        id: "default", // Default connection
        name: "Main OBS",
        host: "localhost",
        port: "4455",
        password: "",
      },
    ],
  });

  const sceneManager = new SceneManager(nodecg);
  const connectionManager = new ConnectionManager(nodecg, sceneManager);

  // Connection manager sets up its own listeners now.
};
