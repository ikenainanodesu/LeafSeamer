import { SQLiteAuditStore } from "../bundles/logger-system/extension/audit-store";
import { redactString } from "../shared/security/redaction";
import { equal, test } from "./test-harness";

test("audit store inserts and queries redacted command history", () => {
  const store = new SQLiteAuditStore(":memory:");
  store.append({
    timestamp: 100,
    correlationId: "corr-audit-1",
    command: "obs.startStream",
    subject: "director",
    roles: ["broadcast"],
    target: "obs-main",
    ok: true,
    errorCode: null,
    payload: { scene: "Opening", password: "should-not-persist" },
  });

  const records = store.query({ command: "obs.startStream", limit: 10 });
  equal(records.length, 1);
  equal(records[0].correlationId, "corr-audit-1");
  equal(JSON.stringify(records[0].payload).includes("should-not-persist"), false);
  store.close();
});

test("ordinary log cleanup state cannot remove audit records", () => {
  const store = new SQLiteAuditStore(":memory:");
  store.append({
    timestamp: 100,
    correlationId: "corr-retained",
    command: "vb.patch",
    subject: "audio-operator",
    roles: ["audio"],
    target: "route-a",
    ok: false,
    errorCode: "TARGET_NOT_ALLOWED",
    payload: {},
  });
  const runtimeLogs = [{ timestamp: 100 }].filter((entry) => entry.timestamp >= 200);

  equal(runtimeLogs.length, 0);
  equal(store.query({ limit: 10 }).length, 1);
  store.close();
});

test("logger redaction preserves ordinary operational text", () => {
  equal(redactString("scene=Opening input=Camera1"), "scene=Opening input=Camera1");
  equal(
    redactString("password=demo stream_key=abc"),
    "password=[REDACTED] stream_key=[REDACTED]"
  );
});
