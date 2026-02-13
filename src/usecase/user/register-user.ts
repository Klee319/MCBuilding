/**
 * RegisterUser Usecase
 *
 * Registers a new user with email verification.
 */

import { User } from '../../domain/entities/user.js';
import { Email } from '../../domain/value-objects/email.js';
import { AccountLevel } from '../../domain/value-objects/account-level.js';
import type { UserRepositoryPort, UserCredentialRepositoryPort } from '../ports/repository-ports.js';
import type { EmailPort, PasswordHasherPort } from '../ports/gateway-ports.js';

export interface RegisterUserInput {
  readonly email: string;
  readonly displayName: string;
  readonly password: string;
}

export class RegisterUserError extends Error {
  public override readonly name = 'RegisterUserError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, RegisterUserError.prototype);
  }
}

export interface RegisterUserDeps {
  readonly userRepository: UserRepositoryPort;
  readonly userCredentialRepository: UserCredentialRepositoryPort;
  readonly passwordHasher: PasswordHasherPort;
  readonly emailPort: EmailPort;
}

export class RegisterUser {
  private readonly _deps: RegisterUserDeps;

  private constructor(deps: RegisterUserDeps) {
    this._deps = deps;
    Object.freeze(this);
  }

  public static create(deps: RegisterUserDeps): RegisterUser {
    return new RegisterUser(deps);
  }

  public async execute(input: RegisterUserInput): Promise<User> {
    this.validateInput(input);

    const { email, displayName, password } = input;

    // Check if email already exists
    const existingUser = await this._deps.userRepository.findByEmail(email);
    if (existingUser) {
      throw new RegisterUserError('Email already registered');
    }

    // Hash the password
    const passwordHash = await this._deps.passwordHasher.hash(password);

    // Create the user
    const now = new Date();
    const userId = this.generateUserId();
    const user = User.create({
      id: userId,
      displayName,
      email: Email.create(email),
      accountLevel: AccountLevel.guest(),
      isEmailVerified: false,
      isPhoneVerified: false,
      linkedSns: [],
      pinnedPostIds: [],
      followerCount: 0,
      followingCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    // Save the user
    const savedUser = await this._deps.userRepository.save(user);

    // Save credentials
    await this._deps.userCredentialRepository.saveCredentials(userId, passwordHash);

    // Send verification email
    const verificationToken = this.generateVerificationToken();
    await this._deps.emailPort.sendVerificationEmail(email, verificationToken);

    return savedUser;
  }

  private validateInput(input: RegisterUserInput): void {
    if (!input.email || input.email.trim().length === 0) {
      throw new RegisterUserError('email cannot be empty');
    }
    if (!input.displayName || input.displayName.trim().length === 0) {
      throw new RegisterUserError('displayName cannot be empty');
    }
    if (!input.password || input.password.length < 8) {
      throw new RegisterUserError('password must be at least 8 characters');
    }
  }

  private generateUserId(): string {
    return `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateVerificationToken(): string {
    return `verify-${Date.now()}-${Math.random().toString(36).substr(2, 16)}`;
  }
}
