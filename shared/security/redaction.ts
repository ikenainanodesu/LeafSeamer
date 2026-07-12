const SENSITIVE_KEY = /(password|passwd|secret|token|api[-_]?key|stream[-_]?key|private[-_]?key|credential)/i;

export const redactString = (value: string): string =>
  value
    .replace(/(Bearer)\s+[A-Za-z0-9._~+/=-]+/gi, "$1 [REDACTED]")
    .replace(
      /(https?:\/\/)[^\s/@:]+:[^\s/@]+@/gi,
      "$1[REDACTED]@"
    )
    .replace(
      /-----BEGIN [^-]+ PRIVATE KEY-----[\s\S]*?-----END [^-]+ PRIVATE KEY-----/gi,
      "[REDACTED PRIVATE KEY]"
    )
    .replace(
      /\b(password|passwd|secret|token|api[-_]?key|stream[-_]?key)=([^\s&]+)/gi,
      "$1=[REDACTED]"
    );

export const redactValue = (value: unknown, key = ""): unknown => {
  if (SENSITIVE_KEY.test(key)) return "[REDACTED]";
  if (typeof value === "string") return redactString(value);
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([childKey, child]) => [
        childKey,
        redactValue(child, childKey),
      ])
    );
  }
  return value;
};
