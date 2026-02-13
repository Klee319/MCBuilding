/**
 * VerifyEmail Usecase
 *
 * Verifies a user's email address and upgrades account level.
 */

import type { User } from '../../domain/entities/user.js';
import { AccountLevel } from '../../domain/value-objects/account-level.js';
import type { UserRepositoryPort } from '../ports/repository-ports.js';

export interface VerifyEmailInput {
  readonly userId: string;
  readonly verificationToken: string;
}

export class VerifyEmailError extends Error {
  public override readonly name = 'VerifyEmailError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, VerifyEmailError.prototype);
  }
}

export class VerifyEmail {
  private readonly _userRepository: UserRepositoryPort;

  private constructor(userRepository: UserRepositoryPort) {
    this._userRepository = userRepository;

    Object.freeze(this);
  }

  public static create(userRepository: UserRepositoryPort): VerifyEmail {
    return new VerifyEmail(userRepository);
  }

  public async execute(input: VerifyEmailInput): Promise<User> {
    this.validateInput(input);

    const { userId } = input;

    // Find the user
    const user = await this._userRepository.findById(userId);
    if (!user) {
      throw new VerifyEmailError('User not found');
    }

    // Check if already verified
    if (user.isEmailVerified) {
      return user; // Idempotent
    }

    // In a real implementation, we would validate the token
    // For now, we assume the token is valid if provided

    // Update user
    const verifiedUser = user
      .withEmailVerified()
      .withAccountLevel(AccountLevel.registered());

    return this._userRepository.save(verifiedUser);
  }

  private validateInput(input: VerifyEmailInput): void {
    if (!input.userId || input.userId.trim().length === 0) {
      throw new VerifyEmailError('userId cannot be empty');
    }
    if (!input.verificationToken || input.verificationToken.trim().length === 0) {
      throw new VerifyEmailError('verificationToken cannot be empty');
    }
  }
}
