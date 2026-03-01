const CONFIG = {
  algo: "pbkdf2",
  hash: "SHA-256",
  iterations: 100000,
  keyLenBytes: 32, // 256 bits
  saltLenBytes: 16
};

// Internal shared helper to extract key derivations
async function deriveKeyBytes(password: string, salt: Uint8Array, iterations: number, hashAlgo: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey", "deriveBits"]
  );

  const key = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: iterations,
      hash: hashAlgo,
    },
    keyMaterial,
    CONFIG.keyLenBytes * 8
  );

  return new Uint8Array(key);
}

function toHex(buffer: Uint8Array): string {
  return Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): Uint8Array {
  const match = hex.match(/.{1,2}/g);
  if (!match) return new Uint8Array(0); // Safe fallback
  return new Uint8Array(match.map(byte => parseInt(byte, 16)));
}

// Constant-time array comparison to prevent timing attacks
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(CONFIG.saltLenBytes));
  const hashBytes = await deriveKeyBytes(password, salt, CONFIG.iterations, CONFIG.hash);

  // New modular format: $algo$i=iterations$salt$hash
  const normalizedHashAlgo = CONFIG.hash.replace("-", "").toLowerCase();
  return `$${CONFIG.algo}-${normalizedHashAlgo}$i=${CONFIG.iterations}$${toHex(salt)}$${toHex(hashBytes)}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // Backwards compatibility for the legacy MVP unversioned format (salt:hash)
  if (storedHash.includes(':') && !storedHash.startsWith('$')) {
    const parts = storedHash.split(':');
    if (parts.length !== 2) return false;

    const salt = fromHex(parts[0]);
    const derived = await deriveKeyBytes(password, salt, 100000, "SHA-256");
    return timingSafeEqual(derived, fromHex(parts[1]));
  }

  // Parse new versioned format safely
  const parts = storedHash.split('$');
  if (parts.length !== 5) return false; // ['', 'pbkdf2-sha256', 'i=100000', 'salt', 'hash']

  const [, algo, iterStr, saltHex, hashHex] = parts;

  const normalizedHashAlgo = CONFIG.hash.replace("-", "").toLowerCase();
  if (algo !== `${CONFIG.algo}-${normalizedHashAlgo}`) {
    return false;
  }

  const iterations = parseInt(iterStr.replace('i=', ''), 10);
  if (isNaN(iterations) || iterations <= 0) return false;

  const salt = fromHex(saltHex);
  const originalHashBytes = fromHex(hashHex);

  // Safe comparison even if parsing failed and yielded empty arrays
  if (salt.length === 0 || originalHashBytes.length === 0) return false;

  const derived = await deriveKeyBytes(password, salt, iterations, CONFIG.hash);

  return timingSafeEqual(derived, originalHashBytes);
}
