import NodeCG from "nodecg/types";
import {
  SeamerAction,
  SeamerExecutionKind,
  SeamerIntegrationProvider,
  SeamerIntegrations,
  SeamerIntegrationStateMap,
  TriggerModule,
  TriggerResultAction,
} from "../src/types/seamer.types";

type StateListener = (
  id: TriggerModule,
  nextState: unknown,
  previousState: unknown
) => void;

// NodeCG Replicant 值是带所有权的 Proxy，跨 Replicant 发布前必须生成纯数据快照。
const snapshot = <T>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T;

export class IntegrationRegistry {
  private readonly providers = new Map<
    TriggerModule,
    SeamerIntegrationProvider<TriggerModule>
  >();
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

  register<T extends TriggerModule>(
    provider: SeamerIntegrationProvider<T>
  ): () => void {
    this.providers.set(
      provider.id,
      provider as SeamerIntegrationProvider<TriggerModule>
    );
    this.integrationsRep.value = {
      ...(this.integrationsRep.value || {}),
      [provider.id]: {
        id: provider.id,
        label: provider.label,
        available: true,
        state: snapshot(provider.initialState),
      },
    };
    this.nodecg.log.info(
      "[Seamer] Integration registered: %s",
      provider.id
    );

    return () => {
      this.providers.delete(provider.id);
      const next = { ...(this.integrationsRep.value || {}) };
      delete next[provider.id];
      this.integrationsRep.value = next;
      this.nodecg.log.info(
        "[Seamer] Integration unregistered: %s",
        provider.id
      );
    };
  }

  update<T extends TriggerModule>(
    id: T,
    state: SeamerIntegrationStateMap[T]
  ): void {
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
    } as SeamerIntegrations;

    this.listeners.forEach((listener) => {
      listener(id, nextState, previousState);
    });
  }

  onStateChange(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async execute(
    id: TriggerModule,
    payload: SeamerAction | TriggerResultAction,
    kind: SeamerExecutionKind
  ): Promise<void> {
    const provider = this.providers.get(id);
    if (!provider) {
      this.nodecg.log.warn(
        "[Seamer] Integration unavailable, action skipped: %s",
        id
      );
      return;
    }

    await provider.execute(payload, kind);
  }
}
