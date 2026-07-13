import { mkdirSync } from "node:fs";
import path from "node:path";
import { redactValue } from "../src/_leaf-core/security/redaction";

type SQLiteValue = string | number | null;

interface SQLiteStatement {
  run(...values: SQLiteValue[]): unknown;
  all(...values: SQLiteValue[]): unknown[];
}

interface SQLiteDatabase {
  exec(sql: string): void;
  prepare(sql: string): SQLiteStatement;
  close(): void;
}

interface SQLiteDatabaseConstructor {
  new (filename: string): SQLiteDatabase;
}

export interface AuditInput {
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

export interface AuditRecord extends AuditInput {
  id: number;
}

export interface AuditQuery {
  command?: string;
  from?: number;
  to?: number;
  limit?: number;
}

interface AuditRow {
  id: number;
  timestamp: number;
  correlation_id: string;
  command: string;
  subject: string;
  roles_json: string;
  target: string | null;
  ok: number;
  error_code: string | null;
  payload_json: string;
}

export class SQLiteAuditStore {
  private readonly database: SQLiteDatabase;

  constructor(filename: string) {
    if (filename !== ":memory:") {
      mkdirSync(path.dirname(filename), { recursive: true });
    }
    const { DatabaseSync } = require("node:sqlite") as {
      DatabaseSync: SQLiteDatabaseConstructor;
    };
    this.database = new DatabaseSync(filename);
    this.database.exec("PRAGMA journal_mode = WAL");
    this.database.exec("PRAGMA synchronous = NORMAL");
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS audit_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        correlation_id TEXT NOT NULL,
        command TEXT NOT NULL,
        subject TEXT NOT NULL,
        roles_json TEXT NOT NULL,
        target TEXT,
        ok INTEGER NOT NULL,
        error_code TEXT,
        payload_json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_audit_timestamp
        ON audit_events(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_command
        ON audit_events(command, timestamp DESC);
    `);
  }

  append(input: AuditInput): void {
    this.database
      .prepare(`
        INSERT INTO audit_events (
          timestamp, correlation_id, command, subject, roles_json,
          target, ok, error_code, payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        input.timestamp,
        input.correlationId,
        input.command,
        input.subject,
        JSON.stringify(input.roles),
        input.target,
        input.ok ? 1 : 0,
        input.errorCode,
        JSON.stringify(redactValue(input.payload))
      );
  }

  query(query: AuditQuery = {}): AuditRecord[] {
    const command = query.command ?? null;
    const from = query.from ?? null;
    const to = query.to ?? null;
    const limit = Math.max(1, Math.min(query.limit ?? 100, 1000));
    const rows = this.database
      .prepare(`
        SELECT id, timestamp, correlation_id, command, subject, roles_json,
               target, ok, error_code, payload_json
        FROM audit_events
        WHERE (? IS NULL OR command = ?)
          AND (? IS NULL OR timestamp >= ?)
          AND (? IS NULL OR timestamp <= ?)
        ORDER BY timestamp DESC, id DESC
        LIMIT ?
      `)
      .all(command, command, from, from, to, to, limit) as unknown as AuditRow[];

    return rows.map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      correlationId: row.correlation_id,
      command: row.command,
      subject: row.subject,
      roles: JSON.parse(row.roles_json) as string[],
      target: row.target,
      ok: row.ok === 1,
      errorCode: row.error_code,
      payload: JSON.parse(row.payload_json) as unknown,
    }));
  }

  close(): void {
    this.database.close();
  }
}
