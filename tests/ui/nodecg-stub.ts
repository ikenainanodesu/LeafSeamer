import type { Page } from "@playwright/test";

export type NodecgSeed = Record<string, unknown>;

export interface NodecgStubOptions {
  pendingMessages?: string[];
  pendingSocketEvents?: string[];
  messageResults?: Record<string, unknown>;
  socketAcks?: Record<string, unknown>;
}

export const installNodecgStub = async (
  page: Page,
  seed: NodecgSeed,
  options: NodecgStubOptions = {},
): Promise<void> => {
  await page.addInitScript(
    ({ messageResults, pendingMessages, socketAcks, socketPendingEvents, values }) => {
      type Listener = (...args: unknown[]) => void;
      type ReplicantRecord = {
        value: unknown;
        listeners: Set<Listener>;
        instance: Record<string, unknown>;
      };
      type PendingMessage = {
        callback?: (error: Error | null, result?: unknown) => void;
        message: string;
        reject: (error: Error) => void;
        resolve: (result: unknown) => void;
      };
      type PendingSocket = {
        acknowledge: (result: unknown) => void;
        event: string;
      };

      const replicants = new Map<string, ReplicantRecord>();
      const listeners = new Map<string, Set<Listener>>();
      const pending = new Set(pendingMessages);
      const pendingSocketEvents = new Set(socketPendingEvents);
      const pendingRequests: PendingMessage[] = [];
      const pendingSockets: PendingSocket[] = [];
      const calls: Array<Record<string, unknown>> = [];

      const getReplicant = (name: string, defaultValue?: unknown) => {
        const existing = replicants.get(name);
        if (existing) return existing.instance;

        const record = {} as ReplicantRecord;
        const hasSeed = Object.prototype.hasOwnProperty.call(values, name);
        record.value = hasSeed ? values[name] : defaultValue;
        record.listeners = new Set<Listener>();
        record.instance = {
          get value() {
            return record.value;
          },
          set value(next: unknown) {
            const previous = record.value;
            record.value = next;
            for (const listener of record.listeners) listener(next, previous);
          },
          on(event: string, listener: Listener) {
            if (event !== "change") return;
            record.listeners.add(listener);
            queueMicrotask(() => listener(record.value, undefined));
          },
          removeListener(event: string, listener: Listener) {
            if (event === "change") record.listeners.delete(listener);
          },
        };
        replicants.set(name, record);
        return record.instance;
      };

      const readValue = (name: string) => {
        const record = replicants.get(name);
        return record ? record.value : values[name];
      };

      const completeMessage = (
        kind: "sendMessage" | "sendMessageToBundle",
        args: unknown[],
      ) => {
        const message = String(args[0]);
        const callback = [...args]
          .reverse()
          .find((item): item is (error: Error | null, result?: unknown) => void =>
            typeof item === "function",
          );
        const payloadIndex = kind === "sendMessageToBundle" ? 2 : 1;
        calls.push({
          kind,
          message,
          bundle: kind === "sendMessageToBundle" ? args[1] : undefined,
          payload: args[payloadIndex],
        });

        return new Promise<unknown>((resolve, reject) => {
          if (pending.has(message)) {
            pendingRequests.push({ callback, message, reject, resolve });
            return;
          }
          queueMicrotask(() => {
            const result = Object.prototype.hasOwnProperty.call(messageResults, message)
              ? messageResults[message]
              : [];
            callback?.(null, result);
            resolve(result);
          });
        });
      };

      const nodecg = {
        Replicant: (name: string, options?: { defaultValue?: unknown }) =>
          getReplicant(name, options?.defaultValue),
        readReplicant: (name: string, callback?: (value: unknown) => void) => {
          const value = readValue(name);
          if (callback) queueMicrotask(() => callback(value));
          return Promise.resolve(value);
        },
        sendMessage: (...args: unknown[]) => completeMessage("sendMessage", args),
        sendMessageToBundle: (...args: unknown[]) =>
          completeMessage("sendMessageToBundle", args),
        listenFor: (event: string, listener: Listener) => {
          const eventListeners = listeners.get(event) ?? new Set<Listener>();
          eventListeners.add(listener);
          listeners.set(event, eventListeners);
        },
        unlisten: (event: string, listener?: Listener) => {
          if (listener) listeners.get(event)?.delete(listener);
          else listeners.delete(event);
        },
        socket: {
          emit: (event: string, ...args: unknown[]) => {
            const acknowledge = [...args].reverse().find(
              (item): item is (value: unknown) => void => typeof item === "function",
            );
            calls.push({ kind: "socket.emit", event, payload: args.filter((item) => typeof item !== "function") });
            if (pendingSocketEvents.has(event) && acknowledge) {
              pendingSockets.push({ acknowledge, event });
              return;
            }
            queueMicrotask(() => acknowledge?.(socketAcks[event] ?? { ok: true, result: null }));
          },
        },
        bundleConfig: {},
        config: {},
        bundleName: "dashboard-ui-test",
        version: "test",
        log: {
          debug: () => undefined,
          error: () => undefined,
          info: () => undefined,
          warn: () => undefined,
        },
      };

      const testApi = {
        calls,
        setReplicant: (name: string, value: unknown) => {
          getReplicant(name).value = value;
        },
        emit: (event: string, ...args: unknown[]) => {
          for (const listener of listeners.get(event) ?? []) listener(...args);
        },
        resolve: (message?: string, result: unknown = []) => {
          const request = pendingRequests.find((item) => !message || item.message === message);
          if (!request) return false;
          pendingRequests.splice(pendingRequests.indexOf(request), 1);
          request.callback?.(null, result);
          request.resolve(result);
          return true;
        },
        reject: (message?: string, error: unknown = "Request failed") => {
          const request = pendingRequests.find((item) => !message || item.message === message);
          if (!request) return false;
          pendingRequests.splice(pendingRequests.indexOf(request), 1);
          const failure = error instanceof Error ? error : new Error(String(error));
          request.callback?.(failure);
          if (request.callback) request.resolve([]);
          else request.reject(failure);
          return true;
        },
        resolveSocket: (event?: string, result: unknown = { ok: true, result: null }) => {
          const request = pendingSockets.find((item) => !event || item.event === event);
          if (!request) return false;
          pendingSockets.splice(pendingSockets.indexOf(request), 1);
          request.acknowledge(result);
          return true;
        },
        rejectSocket: (event?: string, error: unknown = "Request failed") => {
          const request = pendingSockets.find((item) => !event || item.event === event);
          if (!request) return false;
          pendingSockets.splice(pendingSockets.indexOf(request), 1);
          request.acknowledge({ ok: false, error: { code: "COMMAND_FAILED", message: String(error) } });
          return true;
        },
      };

      Object.assign(window, { nodecg, NodeCG: function NodeCG() {}, __nodecgTest: testApi });
    },
    {
      messageResults: options.messageResults ?? {},
      pendingMessages: options.pendingMessages ?? [],
      socketAcks: options.socketAcks ?? {},
      socketPendingEvents: options.pendingSocketEvents ?? [],
      values: seed,
    },
  );
};
