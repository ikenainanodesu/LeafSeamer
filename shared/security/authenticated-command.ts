import type NodeCG from "nodecg/types";
import type {
  CommandAck,
  CommandEnvelope,
  CommandIdentity,
} from "../integration/types";
import type { CommandGateway } from "./command-gateway";

export const AUTHENTICATED_COMMAND_EVENT_PREFIX =
  "leafseamer:authenticated-command";

export interface AuthenticatedCommandRequest<T = unknown> {
  command: string;
  correlationId?: string;
  payload: T;
}

export interface NodeCGCommandUser {
  id: string;
  name: string;
  roles: Array<{ name: string }>;
}

const createCorrelationId = (): string =>
  globalThis.crypto?.randomUUID?.() ??
  `corr-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const getAuthenticatedCommandEventName = (bundleName: string): string => {
  if (!/^[A-Za-z0-9._-]+$/.test(bundleName)) {
    throw new Error("Bundle name contains unsupported characters");
  }
  return `${AUTHENTICATED_COMMAND_EVENT_PREFIX}:${bundleName}`;
};

export const resolveNodeCGCommandIdentity = (
  loginEnabled: boolean,
  user: NodeCGCommandUser | undefined
): CommandIdentity => {
  if (!loginEnabled) {
    throw new Error("NodeCG login must be enabled for privileged commands");
  }
  if (!user?.id || !user.name) {
    throw new Error("Authenticated NodeCG user is unavailable");
  }
  return {
    subject: user.name,
    roles: [...new Set((user.roles ?? []).map((role) => role.name))],
  };
};

export const createAuthenticatedCommandEnvelope = <T>(
  request: AuthenticatedCommandRequest<T>,
  loginEnabled: boolean,
  user: NodeCGCommandUser | undefined
): CommandEnvelope<T> => ({
  version: "1",
  command: request.command,
  correlationId: request.correlationId || createCorrelationId(),
  identity: resolveNodeCGCommandIdentity(loginEnabled, user),
  payload: request.payload,
});

interface SocketLike {
  request?: { user?: NodeCGCommandUser };
  on(
    event: string,
    handler: (
      request: AuthenticatedCommandRequest,
      acknowledge?: (result: CommandAck) => void
    ) => void
  ): void;
}

interface SocketServerLike {
  on(event: "connection", handler: (socket: SocketLike) => void): void;
}

export const installAuthenticatedCommandSocket = (
  nodecg: NodeCG.ServerAPI,
  gateway: CommandGateway,
  bundleName: string
): void => {
  const eventName = getAuthenticatedCommandEventName(bundleName);
  const socketServer = nodecg.getSocketIOServer() as unknown as SocketServerLike;
  socketServer.on("connection", (socket) => {
    socket.on(eventName, async (request, acknowledge) => {
      const correlationId = request?.correlationId || createCorrelationId();
      try {
        const envelope = createAuthenticatedCommandEnvelope(
          { ...request, correlationId },
          nodecg.config.login?.enabled === true,
          socket.request?.user
        );
        const result = await gateway.execute(envelope);
        acknowledge?.(result);
      } catch (error) {
        acknowledge?.({
          correlationId,
          ok: false,
          error: {
            code: "AUTH_REQUIRED",
            message: error instanceof Error ? error.message : String(error),
          },
        });
      }
    });
  });
};

export const allowsLegacyPrivilegedMessages = (
  bundleConfig: unknown
): boolean =>
  (bundleConfig as {
    security?: { allowLegacyPrivilegedMessages?: boolean };
  })?.security?.allowLegacyPrivilegedMessages === true;
