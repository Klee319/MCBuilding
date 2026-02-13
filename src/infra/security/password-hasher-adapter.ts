/**
 * PasswordHasherAdapter
 *
 * Implements PasswordHasherPort using bcrypt-like hashing.
 * Uses Node.js crypto module for a simple but secure implementation.
 */

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { PasswordHasherPort } from '../../usecase/ports/gateway-ports.js';

/**
 * Password hasher using scrypt algorithm
 *
 * Scrypt is recommended for password hashing as it's memory-hard,
 * making it resistant to hardware-based attacks.
 */
export class PasswordHasherAdapter implements PasswordHasherPort {
  private readonly _saltLength: number;
  private readonly _keyLength: number;
  private readonly _scryptCost: number;
  private readonly _blockSize: number;
  private readonly _parallelization: number;

  constructor(options?: {
    saltLength?: number;
    keyLength?: number;
    scryptCost?: number;
    blockSize?: number;
    parallelization?: number;
  }) {
    this._saltLength = options?.saltLength ?? 16;
    this._keyLength = options?.keyLength ?? 64;
    this._scryptCost = options?.scryptCost ?? 16384; // N = 2^14
    this._blockSize = options?.blockSize ?? 8; // r
    this._parallelization = options?.parallelization ?? 1; // p

    Object.freeze(this);
  }

  /**
   * Hash a plain text password
   *
   * Format: $scrypt$N$r$p$salt$hash (base64 encoded)
   *
   * @param password - Plain text password to hash
   * @returns Hashed password string
   */
  public async hash(password: string): Promise<string> {
    const salt = randomBytes(this._saltLength);

    const derivedKey = scryptSync(password, salt, this._keyLength, {
      N: this._scryptCost,
      r: this._blockSize,
      p: this._parallelization,
    });

    // Format: $scrypt$N$r$p$salt$hash
    const params = `${this._scryptCost}$${this._blockSize}$${this._parallelization}`;
    const saltB64 = salt.toString('base64');
    const hashB64 = derivedKey.toString('base64');

    return `$scrypt$${params}$${saltB64}$${hashB64}`;
  }

  /**
   * Verify a password against a hash
   *
   * Uses constant-time comparison to prevent timing attacks.
   *
   * @param password - Plain text password to verify
   * @param hash - Stored password hash
   * @returns True if password matches, false otherwise
   */
  public async verify(password: string, hash: string): Promise<boolean> {
    try {
      // Parse hash format: $scrypt$N$r$p$salt$hash
      const parts = hash.split('$');
      if (parts.length !== 7 || parts[1] !== 'scrypt') {
        return false;
      }

      const [, , costStr, blockSizeStr, parallelizationStr, saltB64, hashB64] = parts;

      const cost = parseInt(costStr, 10);
      const blockSize = parseInt(blockSizeStr, 10);
      const parallelization = parseInt(parallelizationStr, 10);

      if (isNaN(cost) || isNaN(blockSize) || isNaN(parallelization)) {
        return false;
      }

      const salt = Buffer.from(saltB64, 'base64');
      const storedHash = Buffer.from(hashB64, 'base64');

      const derivedKey = scryptSync(password, salt, storedHash.length, {
        N: cost,
        r: blockSize,
        p: parallelization,
      });

      // Constant-time comparison to prevent timing attacks
      return timingSafeEqual(derivedKey, storedHash);
    } catch {
      // Any parsing or crypto error means invalid hash
      return false;
    }
  }
}
