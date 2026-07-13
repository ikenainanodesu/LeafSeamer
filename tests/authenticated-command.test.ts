import {
  AUTHENTICATED_COMMAND_EVENT_PREFIX,
  createAuthenticatedCommandEnvelope,
  getAuthenticatedCommandEventName,
  installAuthenticatedCommandSocket,
  resolveNodeCGCommandIdentity,
} from "../shared/security/authenticated-command";
import { deepEqual, equal, throws, test } from "./test-harness";
import { createServiceCommandEnvelope } from "../shared/security/nodecg-command";

test("rejects command identity when NodeCG login is disabled", () => {
  throws(() =>
    resolveNodeCGCommandIdentity(false, {
      id: "user-1",
      name: "operator",
      roles: [{ name: "broadcast" }],
    })
  );
});

test("derives command identity only from the authenticated NodeCG user", () => {
  deepEqual(
    resolveNodeCGCommandIdentity(true, {
      id: "user-1",
      name: "operator",
      roles: [{ name: "broadcast" }, { name: "broadcast" }],
    }),
    { subject: "operator", roles: ["broadcast"] }
  );
  throws(() => resolveNodeCGCommandIdentity(true, undefined));
});

test("ignores client supplied identity when creating authenticated envelopes", () => {
  const envelope = createAuthenticatedCommandEnvelope(
    {
      command: "obs.setStreamSettings",
      correlationId: "corr-auth-1",
      payload: { id: "main" },
      identity: { subject: "forged-admin", roles: ["superuser"] },
    } as any,
    true,
    {
      id: "user-1",
      name: "operator",
      roles: [{ name: "broadcast" }],
    }
  );
  equal(envelope.identity.subject, "operator");
  deepEqual(envelope.identity.roles, ["broadcast"]);
  equal(envelope.correlationId, "corr-auth-1");
});

test("uses a bundle-specific authenticated command event", () => {
  equal(
    getAuthenticatedCommandEventName("obs-control"),
    `${AUTHENTICATED_COMMAND_EVENT_PREFIX}:obs-control`
  );
  throws(() => getAuthenticatedCommandEventName("../other-bundle"));
});

test("creates explicit service identities for adapter commands", () => {
  const envelope = createServiceCommandEnvelope(
    "vb.updatePatch",
    { id: "patch-1" },
    "seamer-adapter-vb",
    ["audio"]
  );
  equal(envelope.command, "vb.updatePatch");
  deepEqual(envelope.identity, {
    subject: "service:seamer-adapter-vb",
    roles: ["audio"],
  });
});

test("executes socket commands with the server session identity", async () => {
  let onConnection: ((socket: any) => void) | undefined;
  let onCommand: ((request: any, acknowledge: (result: any) => void) => Promise<void>) | undefined;
  let executedEnvelope: any;
  const nodecg = {
    config: { login: { enabled: true } },
    getSocketIOServer: () => ({
      on: (_event: string, handler: (socket: any) => void) => {
        onConnection = handler;
      },
    }),
  };
  const gateway = {
    execute: async (envelope: any) => {
      executedEnvelope = envelope;
      return { correlationId: envelope.correlationId, ok: true };
    },
  };
  installAuthenticatedCommandSocket(
    nodecg as any,
    gateway as any,
    "obs-control"
  );
  onConnection?.({
    request: {
      user: {
        id: "user-1",
        name: "operator",
        roles: [{ name: "broadcast" }],
      },
    },
    on: (_event: string, handler: typeof onCommand) => {
      onCommand = handler;
    },
  });
  let acknowledgement: any;
  await onCommand?.(
    {
      command: "obs.startStreaming",
      correlationId: "corr-socket-1",
      payload: { id: "main" },
      identity: { subject: "forged", roles: ["superuser"] },
    },
    (result) => {
      acknowledgement = result;
    }
  );
  deepEqual(executedEnvelope.identity, {
    subject: "operator",
    roles: ["broadcast"],
  });
  equal(acknowledgement.ok, true);
});

test("rejects socket commands before gateway execution without login", async () => {
  let onConnection: ((socket: any) => void) | undefined;
  let onCommand: ((request: any, acknowledge: (result: any) => void) => Promise<void>) | undefined;
  let executions = 0;
  installAuthenticatedCommandSocket(
    {
      config: { login: { enabled: false } },
      getSocketIOServer: () => ({
        on: (_event: string, handler: (socket: any) => void) => {
          onConnection = handler;
        },
      }),
    } as any,
    {
      execute: async () => {
        executions += 1;
        return { correlationId: "unexpected", ok: true };
      },
    } as any,
    "obs-control"
  );
  onConnection?.({
    request: {},
    on: (_event: string, handler: typeof onCommand) => {
      onCommand = handler;
    },
  });
  let acknowledgement: any;
  await onCommand?.(
    {
      command: "obs.startStreaming",
      correlationId: "corr-socket-2",
      payload: { id: "main" },
    },
    (result) => {
      acknowledgement = result;
    }
  );
  equal(executions, 0);
  equal(acknowledgement.error.code, "AUTH_REQUIRED");
});
