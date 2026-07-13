// 此文件由 scripts/sync-bundle-core.ts 生成，请勿手工修改。
import type { CommandAck } from "../integration/types";
import { getAuthenticatedCommandEventName } from "./authenticated-command";

interface BrowserSocket {
  emit(
    event: string,
    request: {
      command: string;
      correlationId: string;
      payload: unknown;
    },
    acknowledge: (result: CommandAck) => void
  ): void;
}

export const sendAuthenticatedCommand = <TResult = unknown>(
  bundleName: string,
  command: string,
  payload: unknown
): Promise<TResult> =>
  new Promise((resolve, reject) => {
    const correlationId = globalThis.crypto.randomUUID();
    const socket = (nodecg as unknown as { socket: BrowserSocket }).socket;
    socket.emit(
      getAuthenticatedCommandEventName(bundleName),
      { command, correlationId, payload },
      (result) => {
        if (result.ok) {
          resolve(result.result as TResult);
          return;
        }
        reject(
          new Error(
            `${result.error?.code ?? "COMMAND_FAILED"}: ${
              result.error?.message ?? "Command failed"
            }`
          )
        );
      }
    );
  });
