import {
  MemorySecretStorage,
  SecretManager,
} from "../bundles/obs-control/src/_leaf-core/security/secret-manager";
import { OBSSecretSettings } from "../bundles/obs-control/extension/secret-settings";
import { deepEqual, equal, rejects, test } from "./test-harness";

test("migrates OBS connection passwords out of public settings", async () => {
  const manager = new SecretManager(Buffer.alloc(32, 4), new MemorySecretStorage());
  const settings = new OBSSecretSettings(manager);
  const prepared = await settings.prepareConnection({
    id: "main",
    name: "Main OBS",
    host: "127.0.0.1",
    port: "4455",
    password: "websocket-secret",
  });

  deepEqual(prepared.publicSettings, {
    id: "main",
    name: "Main OBS",
    host: "127.0.0.1",
    port: "4455",
    passwordConfigured: true,
  });
  equal(prepared.password, "websocket-secret");
  equal(JSON.stringify(prepared.publicSettings).includes("websocket-secret"), false);
});

test("stores stream credentials and reuses them when inputs stay blank", async () => {
  const manager = new SecretManager(Buffer.alloc(32, 5), new MemorySecretStorage());
  const settings = new OBSSecretSettings(manager);
  const first = await settings.prepareStream("main", {
    server: "rtmp://example.test/live",
    key: "stream-key",
    useAuth: true,
    username: "operator",
    password: "stream-password",
  });
  const reused = await settings.prepareStream("main", {
    server: "rtmp://example.test/live",
    key: "",
    useAuth: true,
    username: "operator",
    password: "",
  });

  deepEqual(first.publicSettings, {
    server: "rtmp://example.test/live",
    useAuth: true,
    username: "operator",
    keyConfigured: true,
    passwordConfigured: true,
  });
  equal(reused.resolvedSettings.key, "stream-key");
  equal(reused.resolvedSettings.password, "stream-password");
  equal(JSON.stringify(reused.publicSettings).includes("stream-key"), false);
});

test("requires explicit clear flags before deleting OBS secrets", async () => {
  const manager = new SecretManager(Buffer.alloc(32, 6), new MemorySecretStorage());
  const settings = new OBSSecretSettings(manager);
  await settings.prepareStream("main", {
    server: "rtmp://example.test/live",
    key: "stream-key",
    useAuth: false,
  });
  const cleared = await settings.prepareStream("main", {
    server: "rtmp://example.test/live",
    key: "",
    clearKey: true,
    useAuth: false,
  });

  equal(cleared.resolvedSettings.key, "");
  equal(cleared.publicSettings.keyConfigured, false);
});

test("rejects secret persistence when no master key is configured", async () => {
  const settings = new OBSSecretSettings(null);
  await rejects(() =>
    settings.prepareConnection({
      id: "main",
      host: "127.0.0.1",
      port: "4455",
      password: "cannot-store",
    })
  );
  await settings.deleteConnection("passwordless");
});

test("deletes all OBS secrets when a connection is removed", async () => {
  const manager = new SecretManager(Buffer.alloc(32, 7), new MemorySecretStorage());
  const settings = new OBSSecretSettings(manager);
  await settings.prepareConnection({
    id: "main",
    host: "127.0.0.1",
    port: "4455",
    password: "websocket-secret",
  });
  await settings.prepareStream("main", {
    server: "rtmp://example.test/live",
    key: "stream-key",
    useAuth: true,
    username: "operator",
    password: "stream-password",
  });

  await settings.deleteConnection("main");
  const connection = await settings.prepareConnection({
    id: "main",
    host: "127.0.0.1",
    port: "4455",
  });
  const stream = await settings.prepareStream("main", {
    server: "rtmp://example.test/live",
    useAuth: true,
    username: "operator",
  });
  equal(connection.publicSettings.passwordConfigured, false);
  equal(stream.publicSettings.keyConfigured, false);
  equal(stream.publicSettings.passwordConfigured, false);
});

test("treats empty credentials captured from OBS as authoritative clears", async () => {
  const manager = new SecretManager(Buffer.alloc(32, 8), new MemorySecretStorage());
  const settings = new OBSSecretSettings(manager);
  await settings.prepareStream("main", {
    server: "rtmp://example.test/live",
    key: "old-key",
    useAuth: true,
    username: "operator",
    password: "old-password",
  });

  const captured = await settings.captureStream("main", {
    server: "rtmp://example.test/live",
    key: "",
    useAuth: false,
    username: "",
    password: "",
  });
  equal(captured.keyConfigured, false);
  equal(captured.passwordConfigured, false);
});
