/**
 * InMemory User Repository
 *
 * In-memory implementation of UserRepositoryPort for testing and development.
 */

import type { User } from '../../../domain/entities/user.js';
import type { UserRepositoryPort } from '../../../usecase/ports/repository-ports.js';
import { PortError } from '../../../usecase/ports/types.js';

export class InMemoryUserRepository implements UserRepositoryPort {
  private readonly _users = new Map<string, User>();
  private readonly _emailIndex = new Map<string, string>(); // email -> id

  /**
   * Clear all stored users (for test reset)
   */
  public clear(): void {
    this._users.clear();
    this._emailIndex.clear();
  }

  /**
   * Get all stored users (for test verification)
   */
  public getAll(): User[] {
    return Array.from(this._users.values());
  }

  public async findById(id: string): Promise<User | null> {
    return this._users.get(id) ?? null;
  }

  public async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.toLowerCase();
    const userId = this._emailIndex.get(normalizedEmail);
    if (!userId) {
      return null;
    }
    return this._users.get(userId) ?? null;
  }

  public async save(user: User): Promise<User> {
    const normalizedEmail = user.email.value.toLowerCase();

    // Check for duplicate email (excluding self)
    const existingUserId = this._emailIndex.get(normalizedEmail);
    if (existingUserId && existingUserId !== user.id) {
      throw new PortError('DUPLICATE_EMAIL', `Email ${user.email.value} already exists`);
    }

    // Remove old email index if user exists and email changed
    const existingUser = this._users.get(user.id);
    if (existingUser) {
      const oldEmail = existingUser.email.value.toLowerCase();
      if (oldEmail !== normalizedEmail) {
        this._emailIndex.delete(oldEmail);
      }
    }

    // Save user and update index
    this._users.set(user.id, user);
    this._emailIndex.set(normalizedEmail, user.id);

    return user;
  }

  public async delete(id: string): Promise<void> {
    const user = this._users.get(id);
    if (!user) {
      throw new PortError('NOT_FOUND', `User with id ${id} not found`);
    }

    this._emailIndex.delete(user.email.value.toLowerCase());
    this._users.delete(id);
  }
}
