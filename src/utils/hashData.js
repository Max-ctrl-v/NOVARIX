import { createHash } from 'crypto';

// SHA-256 Hash für Datenintegrität (GoBD)
export function hashData(data) {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  return createHash('sha256').update(str).digest('hex');
}
