import crypto from 'crypto';

/**
 * Deterministically sorts object keys and stringifies JSON for hashing.
 */
export function canonicalizeJson(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    // For arrays, if they are semantically unordered sets, they should be sorted prior to this call
    // by the domain logic. Here we just map their elements deterministically.
    return `[${obj.map(canonicalizeJson).join(',')}]`;
  }

  const keys = Object.keys(obj).sort();
  let result = '{';
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    result += `${JSON.stringify(key)}:${canonicalizeJson(obj[key])}`;
    if (i < keys.length - 1) {
      result += ',';
    }
  }
  result += '}';
  return result;
}

/**
 * Creates a deterministic SHA-256 hash of a JSON-serializable object.
 */
export function hashEvidence(obj: any): string {
  const canonicalString = canonicalizeJson(obj);
  return crypto.createHash('sha256').update(canonicalString).digest('hex');
}
