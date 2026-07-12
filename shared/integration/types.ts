export type ParameterType = "string" | "number" | "boolean" | "enum";

export interface CapabilityParameter {
  id: string;
  displayName: string;
  type: ParameterType;
  required?: boolean;
  options?: string[];
  defaultValue?: string | number | boolean;
}

export interface CapabilityDefinition {
  id: string;
  displayName: string;
  description?: string;
  parameters: CapabilityParameter[];
}

export interface CapabilityManifest {
  integrationId: string;
  displayName: string;
  apiVersion: string;
  triggers: CapabilityDefinition[];
  actions: CapabilityDefinition[];
}

export interface CapabilityReference {
  integrationId: string;
  capabilityId: string;
  parameters: Record<string, unknown>;
}

export interface CommandIdentity {
  subject: string;
  roles: string[];
}

export interface CommandEnvelope<T = unknown> {
  version: "1";
  command: string;
  correlationId: string;
  identity: CommandIdentity;
  payload: T;
}

export interface EventEnvelope<T = unknown> {
  version: "1";
  event: string;
  eventId: string;
  occurredAt: number;
  source: string;
  payload: T;
}

export interface CommandAck<T = unknown> {
  correlationId: string;
  ok: boolean;
  result?: T;
  error?: {
    code: string;
    message: string;
  };
}
