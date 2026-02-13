/**
 * InMemory User Credential Repository
 *
 * In-memory implementation of UserCredentialRepositoryPort for testing and development.
 * Stores user credentials separately from user data for security.
 */

import type { User } from '../../../domain/entities/user.js';
import type { UserRepositoryPort } from '../../../usecase/ports/repository-ports.js';
import type {
  UserCredentialRepositoryPort,
  UserWithCredentials,
} from '../../../usecase/ports/repository-ports.js';

/**
 * Internal storage for user with credentials
 */
interface StoredCredentials {
  readonly user: User;
  readonly passwordHash: string;
}

export class InMemoryUserCredentialRepository implements UserCredentialRepositoryPort {
  private readonly _credentials = new Map<string, StoredCredentials>(); // email (lowercase) -> credentials
  private readonly _userIdIndex = new Map<string, string>(); // userId -> email (lowercase)
  private readonly _passwordHashes = new Map<string, string>(); // userId -> passwordHash
  private _userRepository: UserRepositoryPort | null = null;

  /**
   * Set the user repository reference (for lookups)
   */
  public setUserRepository(userRepository: UserRepositoryPort): void {
    this._userRepository = userRepository;
  }

  /**
   * Clear all stored credentials (for test reset)
   */
  public clear(): void {
    this._credentials.clear();
    this._userIdIndex.clear();
    this._passwordHashes.clear();
  }

  /**
   * Find a user with credentials by email address
   *
   * @param email - Email address (case-insensitive)
   * @returns User with password hash if found, null otherwise
   */
  public async findByEmailWithCredentials(email: string): Promise<UserWithCredentials | null> {
    const normalizedEmail = email.toLowerCase();
    const stored = this._credentials.get(normalizedEmail);

    if (stored) {
      return {
        user: stored.user,
        passwordHash: stored.passwordHash,
      };
    }

    // Try to look up via user repository
    if (this._userRepository) {
      const user = await this._userRepository.findByEmail(email);
      if (user) {
        const passwordHash = this._passwordHashes.get(user.id);
        if (passwordHash) {
          return {
            user,
            passwordHash,
          };
        }
      }
    }

    return null;
  }

  /**
   * Save credentials for a user
   *
   * @param userId - User ID
   * @param passwordHash - Hashed password
   */
  public async saveCredentials(userId: string, passwordHash: string): Promise<void> {
    this._passwordHashes.set(userId, passwordHash);
  }

  /**
   * Save a user with credentials
   *
   * This is an additional method not in the port interface,
   * used for setting up test data.
   *
   * @param user - User entity to save
   * @param passwordHash - Hashed password
   */
  public async saveWithCredentials(user: User, passwordHash: string): Promise<void> {
    const normalizedEmail = user.email.value.toLowerCase();

    // Remove old email index if user exists and email changed
    const oldEmail = this._userIdIndex.get(user.id);
    if (oldEmail && oldEmail !== normalizedEmail) {
      this._credentials.delete(oldEmail);
    }

    // Save credentials and update indexes
    this._credentials.set(normalizedEmail, {
      user,
      passwordHash,
    });
    this._userIdIndex.set(user.id, normalizedEmail);
    this._passwordHashes.set(user.id, passwordHash);
  }

  /**
   * Update user data while preserving password hash
   *
   * @param user - Updated user entity
   */
  public async updateUser(user: User): Promise<void> {
    const normalizedEmail = user.email.value.toLowerCase();
    const existing = this._credentials.get(normalizedEmail);

    if (existing) {
      this._credentials.set(normalizedEmail, {
        user,
        passwordHash: existing.passwordHash,
      });
    }
  }

  /**
   * Get all stored credentials (for test verification)
   */
  public getAll(): UserWithCredentials[] {
    return Array.from(this._credentials.values()).map((stored) => ({
      user: stored.user,
      passwordHash: stored.passwordHash,
    }));
  }
}
