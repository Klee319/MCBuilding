/**
 * VerifyPhone Usecase
 *
 * Verifies a user's phone number and upgrades account level.
 */

import type { User } from '../../domain/entities/user.js';
import { AccountLevel } from '../../domain/value-objects/account-level.js';
import type { UserRepositoryPort } from '../ports/repository-ports.js';

export interface VerifyPhoneInput {
  readonly userId: string;
  readonly verificationCode: string;
}

export class VerifyPhoneError extends Error {
  public override readonly name = 'VerifyPhoneError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, VerifyPhoneError.prototype);
  }
}

export class VerifyPhone {
  private readonly _userRepository: UserRepositoryPort;

  private constructor(userRepository: UserRepositoryPort) {
    this._userRepository = userRepository;

    Object.freeze(this);
  }

  public static create(userRepository: UserRepositoryPort): VerifyPhone {
    return new VerifyPhone(userRepository);
  }

  public async execute(input: VerifyPhoneInput): Promise<User> {
    this.validateInput(input);

    const { userId } = input;

    // Find the user
    const user = await this._userRepository.findById(userId);
    if (!user) {
      throw new VerifyPhoneError('User not found');
    }

    // Check if already verified
    if (user.isPhoneVerified) {
      return user; // Idempotent
    }

    // In a real implementation, we would validate the code
    // For now, we assume the code is valid if provided

    // Update user
    const verifiedUser = user
      .withPhoneVerified()
      .withAccountLevel(AccountLevel.verified());

    return this._userRepository.save(verifiedUser);
  }

  private validateInput(input: VerifyPhoneInput): void {
    if (!input.userId || input.userId.trim().length === 0) {
      throw new VerifyPhoneError('userId cannot be empty');
    }
    if (!input.verificationCode || input.verificationCode.trim().length === 0) {
      throw new VerifyPhoneError('verificationCode cannot be empty');
    }
  }
}
