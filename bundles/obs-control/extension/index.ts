import NodeCG from "nodecg/types";
import { ConnectionManager } from "./connection";
import { SceneManager } from "./scene-manager";
import { SourceManager } from "./source-manager";
import { createLogger } from "./logger";
import { OBSConnectionSettings } from "../src/types/obs.types";
import { ensureOptionalLogCapture } from "./optional-log-capture";
import { CommandGateway } from "../src/_leaf-core/security/command-gateway";
import { createOptionalAuditWriter } from "../src/_leaf-core/security/nodecg-command";
import path from "node:path";
import { createSecretManagerFromEnvironment } from "../src/_leaf-core/security/secret-manager";
import { OBSSecretSettings } from "./secret-settings";
import {
  installAuthenticatedCommandSocket,
} from "../src/_leaf-core/security/authenticated-command";
import type { CommandEnvelope } from "../src/_leaf-core/integration/types";

export interface OBSControlApi {
  executeCommand: (envelope: CommandEnvelope) => ReturnType<CommandGateway["execute"]>;
}

module.exports = function (nodecg: NodeCG.ServerAPI) {
  ensureOptionalLogCapture(nodecg.Logger);
  const logger = createLogger("OBSControl");
  logger.setNodeCG(nodecg);
  logger.info("Starting OBS Control Bundle");

  const obsConnectionsRep = nodecg.Replicant<OBSConnectionSettings[]>("obsConnections", {
    defaultValue: [
      {
        id: "default",
        name: "Main OBS",
        host: "localhost",
        port: "4455",
        passwordConfigured: false,
      },
    ],
  });
  const streamSettingsRep = nodecg.Replicant<Record<string, any>>(
    "obsStreamSettings",
    { defaultValue: {} }
  );
  const legacyConnections = JSON.parse(
    JSON.stringify(obsConnectionsRep.value ?? [])
  ) as Array<OBSConnectionSettings & { password?: string }>;
  const legacyStreams = JSON.parse(
    JSON.stringify(streamSettingsRep.value ?? {})
  ) as Record<string, any>;
  obsConnectionsRep.value = legacyConnections.map((connection) => ({
    id: connection.id,
    name: connection.name,
    host: connection.host,
    port: connection.port,
    passwordConfigured:
      connection.passwordConfigured === true || Boolean(connection.password),
  }));
  streamSettingsRep.value = Object.fromEntries(
    Object.entries(legacyStreams).map(([id, settings]) => [
      id,
      {
        server: settings.server ?? "",
        useAuth: settings.useAuth === true,
        username: settings.username ?? "",
        keyConfigured: settings.keyConfigured === true || Boolean(settings.key),
        passwordConfigured:
          settings.passwordConfigured === true || Boolean(settings.password),
      },
    ])
  );

  let secretManager = null;
  try {
    secretManager = createSecretManagerFromEnvironment(
      path.join(process.cwd(), "cfg", "secrets")
    );
  } catch (error) {
    logger.error(
      "SecretManager initialization failed",
      error instanceof Error ? error.message : String(error)
    );
  }
  if (!secretManager) {
    logger.warn(
      "LEAFSEAMER_SECRET_MASTER_KEY is not configured; password-protected OBS settings are disabled"
    );
  }
  const secretSettings = new OBSSecretSettings(secretManager);

  const sceneManager = new SceneManager(nodecg);
  const sourceManager = new SourceManager(nodecg);
  const commandGateway = new CommandGateway(createOptionalAuditWriter(nodecg));

  const connectionManager = new ConnectionManager(
    nodecg,
    sceneManager,
    sourceManager,
    obsConnectionsRep,
    streamSettingsRep,
    commandGateway,
    secretSettings,
  );
  installAuthenticatedCommandSocket(nodecg, commandGateway, "obs-control");
  void connectionManager.initialize(legacyConnections, legacyStreams);

  return {
    executeCommand: (envelope: CommandEnvelope) =>
      commandGateway.execute(envelope),
  } satisfies OBSControlApi;
};
