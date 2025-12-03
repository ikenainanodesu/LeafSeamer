export function getCurrentTimestamp(): number {
  return Date.now();
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

export function isExpired(timestamp: number, expiryDays: number): boolean {
  const now = Date.now();
  const diff = now - timestamp;
  const days = diff / (1000 * 60 * 60 * 24);
  return days > expiryDays;
}
