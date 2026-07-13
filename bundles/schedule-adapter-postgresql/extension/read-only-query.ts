interface ReadOnlyQueryResult<T> {
  rows: T[];
}

export interface ReadOnlyQueryClient {
  query(query: string): Promise<ReadOnlyQueryResult<unknown>>;
  release(): void;
}

export interface ReadOnlyQueryPool {
  connect(): Promise<ReadOnlyQueryClient>;
}

export const validateReadOnlyScheduleQuery = (query: string): string | null => {
  const normalized = query.trim();
  if (!/^select\b/i.test(normalized)) {
    return "Query must start with SELECT";
  }
  if (
    normalized.includes(";") ||
    /--|\/\*/.test(normalized) ||
    /\binto\b/i.test(normalized) ||
    /\bfor\s+(update|no\s+key\s+update|share|key\s+share)\b/i.test(
      normalized
    )
  ) {
    return "Query contains a writable, locking, commented, or multi-statement construct";
  }
  return null;
};

export const executeReadOnlyScheduleQuery = async <T>(
  pool: ReadOnlyQueryPool,
  query: string,
  statementTimeoutMs: number
): Promise<T[]> => {
  const validationError = validateReadOnlyScheduleQuery(query);
  if (validationError) throw new Error(validationError);
  const timeout = Math.max(1_000, Math.min(statementTimeoutMs, 60_000));
  const client = await pool.connect();
  try {
    await client.query("BEGIN TRANSACTION READ ONLY");
    await client.query(`SET LOCAL statement_timeout = ${timeout}`);
    const result = await client.query(query);
    await client.query("COMMIT");
    return result.rows as T[];
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
};
