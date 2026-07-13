// 此文件由 scripts/sync-bundle-core.ts 生成，请勿手工修改。
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

interface EncryptedSecret {
  version: 1;
  algorithm: "aes-256-gcm";
  iv: string;
  tag: string;
  ciphertext: string;
}

export interface SecretStorage {
  read(namespace: string, key: string): Promise<string | null>;
  write(namespace: string, key: string, value: string): Promise<void>;
  delete(namespace: string, key: string): Promise<void>;
}

export const SECRET_MASTER_KEY_ENV = "LEAFSEAMER_SECRET_MASTER_KEY";

export const decodeSecretMasterKey = (encoded: string): Buffer => {
  const value = encoded.trim();
  const isHex = /^[a-f0-9]{64}$/i.test(value);
  const isBase64 = /^[A-Za-z0-9+/]{43}=?$/.test(value);
  if (!isHex && !isBase64) {
    throw new Error(
      `${SECRET_MASTER_KEY_ENV} must use canonical base64 or hexadecimal encoding`
    );
  }
  const key = Buffer.from(value, isHex ? "hex" : "base64");
  if (
    !isHex &&
    key.toString("base64").replace(/=+$/, "") !== value.replace(/=+$/, "")
  ) {
    throw new Error(`${SECRET_MASTER_KEY_ENV} contains invalid base64 data`);
  }
  if (key.length !== 32) {
    throw new Error(
      `${SECRET_MASTER_KEY_ENV} must encode exactly 32 bytes as base64 or hexadecimal`
    );
  }
  return key;
};

const validateSegment = (value: string): void => {
  if (!/^[a-zA-Z0-9._-]+$/.test(value)) {
    throw new Error(`Invalid secret path segment: ${value}`);
  }
};

export class MemorySecretStorage implements SecretStorage {
  private readonly values = new Map<string, string>();

  async read(namespace: string, key: string): Promise<string | null> {
    return this.values.get(`${namespace}:${key}`) ?? null;
  }

  async write(namespace: string, key: string, value: string): Promise<void> {
    this.values.set(`${namespace}:${key}`, value);
  }

  async delete(namespace: string, key: string): Promise<void> {
    this.values.delete(`${namespace}:${key}`);
  }
}

export class FileSecretStorage implements SecretStorage {
  constructor(private readonly rootDirectory: string) {}

  async read(namespace: string, key: string): Promise<string | null> {
    const filePath = this.resolve(namespace, key);
    try {
      return await fs.readFile(filePath, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async write(namespace: string, key: string, value: string): Promise<void> {
    const filePath = this.resolve(namespace, key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, value, { encoding: "utf8", mode: 0o600 });
  }

  async delete(namespace: string, key: string): Promise<void> {
    const filePath = this.resolve(namespace, key);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  private resolve(namespace: string, key: string): string {
    validateSegment(namespace);
    validateSegment(key);
    return path.join(this.rootDirectory, namespace, `${key}.encrypted-secret.json`);
  }
}

export class SecretManager {
  constructor(
    private readonly masterKey: Buffer,
    private readonly storage: SecretStorage
  ) {
    if (masterKey.length !== 32) {
      throw new Error("Secret master key must contain exactly 32 bytes");
    }
  }

  async set(namespace: string, key: string, value: string): Promise<void> {
    validateSegment(namespace);
    validateSegment(key);
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.masterKey, iv);
    const ciphertext = Buffer.concat([
      cipher.update(value, "utf8"),
      cipher.final(),
    ]);
    const payload: EncryptedSecret = {
      version: 1,
      algorithm: "aes-256-gcm",
      iv: iv.toString("base64"),
      tag: cipher.getAuthTag().toString("base64"),
      ciphertext: ciphertext.toString("base64"),
    };
    await this.storage.write(namespace, key, JSON.stringify(payload));
  }

  async get(namespace: string, key: string): Promise<string | null> {
    validateSegment(namespace);
    validateSegment(key);
    const stored = await this.storage.read(namespace, key);
    if (!stored) return null;
    const payload = JSON.parse(stored) as EncryptedSecret;
    if (payload.version !== 1 || payload.algorithm !== "aes-256-gcm") {
      throw new Error("Unsupported encrypted secret format");
    }
    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.masterKey,
      Buffer.from(payload.iv, "base64")
    );
    decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(payload.ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");
  }

  async delete(namespace: string, key: string): Promise<void> {
    validateSegment(namespace);
    validateSegment(key);
    await this.storage.delete(namespace, key);
  }
}

export const createSecretManagerFromEnvironment = (
  rootDirectory: string,
  environment: NodeJS.ProcessEnv = process.env
): SecretManager | null => {
  const encodedKey = environment[SECRET_MASTER_KEY_ENV];
  if (!encodedKey) return null;
  return new SecretManager(
    decodeSecretMasterKey(encodedKey),
    new FileSecretStorage(rootDirectory)
  );
};
