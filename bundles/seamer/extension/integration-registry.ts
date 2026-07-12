import NodeCG from "nodecg/types";
import { validateCapabilityManifest } from "../../../shared/integration/schema";
import type { CapabilityManifest } from "../../../shared/integration/types";
import type {
  DynamicSeamerIntegrationProvider,
  SeamerAction,
  SeamerExecutionKind,
  SeamerIntegrationProvider,
  SeamerIntegrations,
  TriggerModule,
  TriggerResultAction,
} from "../src/types/seamer.types";

type StateListener = (
  id: string,
  nextState: unknown,
  previousState: unknown
) => void;

interface RegisteredProvider extends DynamicSeamerIntegrationProvider {
  executeLegacy?: (
    payload: SeamerAction | TriggerResultAction,
    kind: SeamerExecutionKind
  ) => void | Promise<void>;
}

// NodeCG Replicant 值是带所有权的 Proxy，跨 Replicant 发布前必须生成纯数据快照。
const snapshot = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const createLegacyManifest = (
  id: TriggerModule,
  label: string
): CapabilityManifest => ({
  integrationId: id,
  displayName: label,
  apiVersion: "1.0.0",
  triggers: [],
  actions: [],
});

const normalizeProvider = (
  provider: SeamerIntegrationProvider
): RegisteredProvider => {
  if ("manifest" in provider) {
    return provider;
  }

  return {
    manifest: createLegacyManifest(provider.id, provider.label),
    initialState: provider.initialState,
    evaluateTrigger: () => false,
    executeAction: async () => undefined,
    executeLegacy: provider.execute,
  };
};

export class IntegrationRegistry {
  private readonly providers = new Map<string, RegisteredProvider>();
  private readonly integrationsRep: NodeCG.ServerReplicant<SeamerIntegrations>;
  private readonly listeners = new Set<StateListener>();

  constructor(private readonly nodecg: NodeCG.ServerAPI) {
    this.integrationsRep = nodecg.Replicant<SeamerIntegrations>(
      "seamerIntegrations",
      {
        defaultValue: {},
        persistent: false,
      }
    );
  }

  register(providerInput: SeamerIntegrationProvider): () => void {
    const provider = normalizeProvider(providerInput);
    const errors = validateCapabilityManifest(provider.manifest);
    if (errors.length > 0) {
      throw new Error(
        `Invalid integration manifest ${provider.manifest.integrationId}: ${errors.join("; ")}`
      );
    }

    const id = provider.manifest.integrationId;
    if (this.providers.has(id)) {
      throw new Error(`Integration already registered: ${id}`);
    }

    this.providers.set(id, provider);
    this.integrationsRep.value = {
      ...(this.integrationsRep.value || {}),
      [id]: {
        id,
        label: provider.manifest.displayName,
        available: true,
        state: snapshot(provider.initialState),
        manifest: snapshot(provider.manifest),
      },
    };
    this.nodecg.log.info("[Seamer] Integration registered: %s", id);

    return () => {
      this.providers.delete(id);
      const next = { ...(this.integrationsRep.value || {}) };
      delete next[id];
      this.integrationsRep.value = next;
      this.nodecg.log.info("[Seamer] Integration unregistered: %s", id);
    };
  }

  update(id: string, state: unknown): void {
    const current = this.integrationsRep.value?.[id];
    if (!current) {
      return;
    }

    const previousState = snapshot(current.state);
    const nextState = snapshot(state);
    this.integrationsRep.value = {
      ...(this.integrationsRep.value || {}),
      [id]: {
        ...current,
        state: nextState,
      },
    };

    this.listeners.forEach((listener) => {
      listener(id, nextState, previousState);
    });
  }

  onStateChange(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  evaluateTrigger(
    integrationId: string,
    capabilityId: string,
    parameters: Record<string, unknown>,
    nextState: unknown,
    previousState: unknown
  ): boolean {
    const provider = this.providers.get(integrationId);
    if (!provider) {
      return false;
    }

    return provider.evaluateTrigger(
      capabilityId,
      parameters,
      nextState,
      previousState
    );
  }

  async executeCapability(
    integrationId: string,
    capabilityId: string,
    parameters: Record<string, unknown>
  ): Promise<void> {
    const provider = this.providers.get(integrationId);
    if (!provider) {
      throw new Error(`Integration unavailable: ${integrationId}`);
    }

    await provider.executeAction(capabilityId, parameters);
  }

  async execute(
    id: TriggerModule,
    payload: SeamerAction | TriggerResultAction,
    kind: SeamerExecutionKind
  ): Promise<void> {
    const provider = this.providers.get(id);
    if (!provider?.executeLegacy) {
      this.nodecg.log.warn(
        "[Seamer] Legacy integration unavailable, action skipped: %s",
        id
      );
      return;
    }

    await provider.executeLegacy(payload, kind);
  }
}
