// 此文件由 scripts/sync-bundle-core.ts 生成，请勿手工修改。
import { randomUUID } from "node:crypto";
import type NodeCG from "nodecg/types";
import type { CommandEnvelope } from "../integration/types";
import type { CommandAuditEvent } from "./command-gateway";

interface OptionalLoggerApi {
  audit?: (event: CommandAuditEvent) => void;
}

export const createOptionalAuditWriter = (nodecg: NodeCG.ServerAPI) =>
  (event: CommandAuditEvent): void => {
    try {
      const extensions = nodecg.extensions as Record<string, OptionalLoggerApi | undefined>;
      extensions["logger-system"]?.audit?.(event);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`[command-gateway] Audit write failed: ${message}\n`);
    }
  };

export const createLegacyCommandEnvelope = <T>(
  command: string,
  payload: T,
  roles: string[]
): CommandEnvelope<T> => ({
  version: "1",
  command,
  correlationId: randomUUID(),
  identity: { subject: "nodecg-dashboard", roles },
  payload,
});

export const createServiceCommandEnvelope = <T>(
  command: string,
  payload: T,
  service: string,
  roles: string[]
): CommandEnvelope<T> => ({
  version: "1",
  command,
  correlationId: randomUUID(),
  identity: { subject: `service:${service}`, roles },
  payload,
});
