import type {
  CommandAck,
  CommandEnvelope,
} from "../integration/types";
import { redactValue } from "./redaction";

export interface CommandRegistration<TPayload, TResult> {
  command: string;
  roles: string[];
  validate: (payload: TPayload) => string[];
  resolveTarget?: (payload: TPayload) => string;
  allowedTargets?: string[];
  isTargetAllowed?: (target: string, payload: TPayload) => boolean;
  handler: (payload: TPayload, envelope: CommandEnvelope<TPayload>) => Promise<TResult>;
}

export interface CommandAuditEvent {
  timestamp: number;
  correlationId: string;
  command: string;
  subject: string;
  roles: string[];
  target: string | null;
  ok: boolean;
  errorCode: string | null;
  payload: unknown;
}

type AnyRegistration = CommandRegistration<any, any>;

export class CommandGateway {
  private readonly registrations = new Map<string, AnyRegistration>();

  constructor(
    private readonly writeAudit: (
      event: CommandAuditEvent
    ) => void | Promise<void> = () => undefined
  ) {}

  register<TPayload, TResult>(
    registration: CommandRegistration<TPayload, TResult>
  ): () => void {
    if (this.registrations.has(registration.command)) {
      throw new Error(`Command already registered: ${registration.command}`);
    }
    this.registrations.set(registration.command, registration);
    return () => this.registrations.delete(registration.command);
  }

  async execute<TPayload, TResult>(
    envelope: CommandEnvelope<TPayload>
  ): Promise<CommandAck<TResult>> {
    const registration = this.registrations.get(envelope.command) as
      | CommandRegistration<TPayload, TResult>
      | undefined;
    if (!registration) {
      return this.reject(envelope, "UNKNOWN_COMMAND", "Command is not registered");
    }
    if (
      registration.roles.length > 0 &&
      !registration.roles.some((role) => envelope.identity.roles.includes(role))
    ) {
      return this.reject(envelope, "FORBIDDEN", "Identity lacks required role");
    }

    const validationErrors = registration.validate(envelope.payload);
    if (validationErrors.length > 0) {
      return this.reject(
        envelope,
        "INVALID_PAYLOAD",
        validationErrors.join("; ")
      );
    }

    const target = registration.resolveTarget?.(envelope.payload) ?? null;
    if (
      target !== null &&
      ((registration.allowedTargets &&
        !registration.allowedTargets.includes(target)) ||
        (registration.isTargetAllowed &&
          !registration.isTargetAllowed(target, envelope.payload)))
    ) {
      return this.reject(
        envelope,
        "TARGET_NOT_ALLOWED",
        "Target is not in the allowlist",
        target
      );
    }

    try {
      const result = await registration.handler(envelope.payload, envelope);
      await this.audit(envelope, true, null, target);
      return { correlationId: envelope.correlationId, ok: true, result };
    } catch (error) {
      return this.reject(
        envelope,
        "EXECUTION_FAILED",
        error instanceof Error ? error.message : String(error),
        target
      );
    }
  }

  private async reject<T>(
    envelope: CommandEnvelope<T>,
    code: string,
    message: string,
    target: string | null = null
  ): Promise<CommandAck<never>> {
    await this.audit(envelope, false, code, target);
    return {
      correlationId: envelope.correlationId,
      ok: false,
      error: { code, message },
    };
  }

  private async audit<T>(
    envelope: CommandEnvelope<T>,
    ok: boolean,
    errorCode: string | null,
    target: string | null
  ): Promise<void> {
    await this.writeAudit({
      timestamp: Date.now(),
      correlationId: envelope.correlationId,
      command: envelope.command,
      subject: envelope.identity.subject,
      roles: [...envelope.identity.roles],
      target,
      ok,
      errorCode,
      payload: redactValue(envelope.payload),
    });
  }
}
