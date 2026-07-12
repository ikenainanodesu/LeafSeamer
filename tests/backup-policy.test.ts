import {
  buildBackupManifest,
  classifyBackupPath,
  encryptSecretPayload,
  normalizeBackupRequest,
} from "../bundles/backup-system/extension/backup-policy";
import { deepEqual, equal, ok, throws, test } from "./test-harness";

test("backup defaults to public and operational data", () => {
  deepEqual(normalizeBackupRequest(undefined).levels, ["L0", "L1"]);
  equal(classifyBackupPath("cfg/example.json.example"), "L0");
  equal(classifyBackupPath("cfg/vb-matrix-control.json"), "L1");
  equal(classifyBackupPath("db/replicants.db"), "L2");
  equal(classifyBackupPath("cfg/secrets/obs.json"), "L3");
});

test("backup requires explicit secret selection and passphrase", () => {
  throws(() =>
    normalizeBackupRequest({ levels: ["L0", "L3"], includeSecrets: false })
  );
  throws(() =>
    normalizeBackupRequest({ levels: ["L3"], includeSecrets: true })
  );
});

test("backup manifest contains stable hashes and rejects traversal", () => {
  const manifest = buildBackupManifest(
    [{ path: "cfg/example.json.example", content: Buffer.from("demo") }],
    ["L0"]
  );
  equal(manifest.entries.length, 1);
  equal(manifest.entries[0].sha256.length, 64);
  equal(manifest.entries[0].encrypted, false);
  throws(() => classifyBackupPath("../cfg/password.json"));
  throws(() => classifyBackupPath("C:/cfg/password.json"));
});

test("secret payload encryption never exposes plaintext", () => {
  const encrypted = encryptSecretPayload(
    [{ path: "cfg/secrets/obs.json", content: Buffer.from("stream-secret") }],
    "correct horse battery staple"
  );
  ok(encrypted.length > 0);
  equal(encrypted.includes("stream-secret"), false);
});
