import {
  CommandGateway,
  type CommandRegistration,
} from "../shared/security/command-gateway";
import {
  MemorySecretStorage,
  SecretManager,
} from "../shared/security/secret-manager";
import { redactString, redactValue } from "../shared/security/redaction";
import type { CommandEnvelope } from "../shared/integration/types";
import { deepEqual, equal, rejects, test } from "./test-harness";

test("encrypts namespaced secrets without storing plaintext", async () => {
  const storage = new MemorySecretStorage();
  const manager = new SecretManager(Buffer.alloc(32, 7), storage);
  await manager.set("obs-control", "stream-key", "secret-value");

  equal((await storage.read("obs-control", "stream-key"))?.includes("secret-value"), false);
  equal(await manager.get("obs-control", "stream-key"), "secret-value");
});

test("rejects secret decryption with the wrong key", async () => {
  const storage = new MemorySecretStorage();
  await new SecretManager(Buffer.alloc(32, 1), storage).set("obs", "password", "pw");
  await rejects(() =>
    new SecretManager(Buffer.alloc(32, 2), storage).get("obs", "password")
  );
});

test("redacts structured fields and sensitive string patterns", () => {
  deepEqual(
    redactValue({ user: "director", password: "pw", nested: { token: "abc" } }),
    { user: "director", password: "[REDACTED]", nested: { token: "[REDACTED]" } }
  );
  equal(redactString("Authorization: Bearer abc.def.ghi"), "Authorization: Bearer [REDACTED]");
  equal(redactString("scene=Opening"), "scene=Opening");
});

test("command gateway enforces roles schema and target allowlist", async () => {
  const audits: unknown[] = [];
  const gateway = new CommandGateway((event) => {
    audits.push(event);
  });
  let executed = false;
  const registration: CommandRegistration<{ target: string; level: number }, string> = {
    command: "mixer.setLevel",
    roles: ["audio"],
    validate: (payload) =>
      typeof payload.level === "number" ? [] : ["level must be a number"],
    resolveTarget: (payload) => payload.target,
    allowedTargets: ["mixer-a"],
    isTargetAllowed: (target) => target.startsWith("mixer-"),
    handler: async () => {
      executed = true;
      return "ok";
    },
  };
  gateway.register(registration);
  const envelope: CommandEnvelope<{ target: string; level: number }> = {
    version: "1",
    command: "mixer.setLevel",
    correlationId: "corr-1",
    identity: { subject: "operator", roles: ["audio"] },
    payload: { target: "mixer-a", level: -10 },
  };

  const ack = await gateway.execute(envelope);
  equal(ack.ok, true);
  equal(ack.correlationId, "corr-1");
  equal(executed, true);
  equal(audits.length, 1);

  const denied = await gateway.execute({
    ...envelope,
    correlationId: "corr-2",
    identity: { subject: "viewer", roles: ["viewer"] },
  });
  equal(denied.ok, false);
  equal(denied.error?.code, "FORBIDDEN");

  const wrongTarget = await gateway.execute({
    ...envelope,
    correlationId: "corr-3",
    payload: { target: "mixer-b", level: -10 },
  });
  equal(wrongTarget.error?.code, "TARGET_NOT_ALLOWED");
});
