import { createHash } from "node:crypto";
import type { SecretManager } from "../src/_leaf-core/security/secret-manager";

const NAMESPACE = "obs-control";

export interface OBSConnectionSecretInput {
  id: string;
  name?: string;
  host: string;
  port: string;
  password?: string;
  clearPassword?: boolean;
}

export interface OBSPublicConnectionSettings {
  id: string;
  name?: string;
  host: string;
  port: string;
  passwordConfigured: boolean;
}

export interface OBSStreamSecretInput {
  server: string;
  key?: string;
  useAuth: boolean;
  username?: string;
  password?: string;
  clearKey?: boolean;
  clearPassword?: boolean;
}

export interface OBSPublicStreamSettings {
  server: string;
  useAuth: boolean;
  username: string;
  keyConfigured: boolean;
  passwordConfigured: boolean;
}

export interface OBSResolvedStreamSettings {
  server: string;
  key: string;
  useAuth: boolean;
  username: string;
  password: string;
}

const secretKey = (id: string, purpose: string): string => {
  const digest = createHash("sha256").update(id).digest("hex").slice(0, 24);
  return `${purpose}-${digest}`;
};

export class OBSSecretSettings {
  constructor(private readonly manager: SecretManager | null) {}

  async prepareConnection(input: OBSConnectionSecretInput): Promise<{
    publicSettings: OBSPublicConnectionSettings;
    password: string | undefined;
  }> {
    const key = secretKey(input.id, "connection-password");
    if (input.clearPassword) {
      await this.requireManager().delete(NAMESPACE, key);
    } else if (input.password && input.password.length > 0) {
      await this.requireManager().set(NAMESPACE, key, input.password);
    }
    const password = (await this.manager?.get(NAMESPACE, key)) ?? undefined;
    return {
      publicSettings: {
        id: input.id,
        name: input.name,
        host: input.host,
        port: input.port,
        passwordConfigured: Boolean(password),
      },
      password,
    };
  }

  async prepareStream(
    id: string,
    input: OBSStreamSecretInput
  ): Promise<{
    publicSettings: OBSPublicStreamSettings;
    resolvedSettings: OBSResolvedStreamSettings;
  }> {
    const streamKey = secretKey(id, "stream-key");
    const passwordKey = secretKey(id, "stream-password");
    if (input.clearKey) {
      await this.requireManager().delete(NAMESPACE, streamKey);
    } else if (input.key && input.key.length > 0) {
      await this.requireManager().set(NAMESPACE, streamKey, input.key);
    }
    if (input.clearPassword) {
      await this.requireManager().delete(NAMESPACE, passwordKey);
    } else if (input.password && input.password.length > 0) {
      await this.requireManager().set(NAMESPACE, passwordKey, input.password);
    }

    const key = (await this.manager?.get(NAMESPACE, streamKey)) ?? "";
    const password =
      (await this.manager?.get(NAMESPACE, passwordKey)) ?? "";
    const username = input.username ?? "";
    return {
      publicSettings: {
        server: input.server,
        useAuth: input.useAuth,
        username,
        keyConfigured: key.length > 0,
        passwordConfigured: password.length > 0,
      },
      resolvedSettings: {
        server: input.server,
        key,
        useAuth: input.useAuth,
        username,
        password,
      },
    };
  }

  async deleteConnection(id: string): Promise<void> {
    if (!this.manager) return;
    const manager = this.manager;
    await Promise.all([
      manager.delete(NAMESPACE, secretKey(id, "connection-password")),
      manager.delete(NAMESPACE, secretKey(id, "stream-key")),
      manager.delete(NAMESPACE, secretKey(id, "stream-password")),
    ]);
  }

  async captureStream(
    id: string,
    input: Required<
      Pick<
        OBSStreamSecretInput,
        "server" | "key" | "useAuth" | "username" | "password"
      >
    >
  ): Promise<OBSPublicStreamSettings> {
    if (!this.manager && input.key.length === 0 && input.password.length === 0) {
      return {
        server: input.server,
        useAuth: input.useAuth,
        username: input.username,
        keyConfigured: false,
        passwordConfigured: false,
      };
    }
    const prepared = await this.prepareStream(id, {
      ...input,
      clearKey: input.key.length === 0,
      clearPassword: input.password.length === 0,
    });
    return prepared.publicSettings;
  }

  private requireManager(): SecretManager {
    if (!this.manager) {
      throw new Error(
        "Secret storage is unavailable; configure LEAFSEAMER_SECRET_MASTER_KEY"
      );
    }
    return this.manager;
  }
}
