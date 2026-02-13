/**
 * LoginUser Usecase
 *
 * Authenticates a user with email and password, returns JWT tokens.
 */

import type { User } from '../../domain/entities/user.js';
import type { UserCredentialRepositoryPort } from '../ports/repository-ports.js';
import type { PasswordHasherPort, JwtServicePort } from '../ports/gateway-ports.js';

/**
 * Input for LoginUser usecase
 */
export interface LoginUserInput {
  readonly email: string;
  readonly password: string;
}

/**
 * Output for LoginUser usecase
 */
export interface LoginUserOutput {
  readonly user: User;
  readonly accessToken: string;
  readonly refreshToken: string;
}

/**
 * Error codes for LoginUser
 */
export type LoginUserErrorCode = 'INVALID_CREDENTIALS' | 'VALIDATION_ERROR';

/**
 * Custom error for LoginUser usecase
 */
export class LoginUserError extends Error {
  public override readonly name = 'LoginUserError';
  public readonly code: LoginUserErrorCode | undefined;

  constructor(message: string, code?: LoginUserErrorCode) {
    super(message);
    this.code = code;
    Object.setPrototypeOf(this, LoginUserError.prototype);
  }
}

/**
 * LoginUser Usecase
 *
 * Handles user authentication with email and password.
 * Uses constant-time comparison to prevent timing attacks.
 * Returns same error message for both invalid email and password (security).
 */
export class LoginUser {
  private readonly _userCredentialRepository: UserCredentialRepositoryPort;
  private readonly _passwordHasher: PasswordHasherPort;
  private readonly _jwtService: JwtServicePort;

  private constructor(
    userCredentialRepository: UserCredentialRepositoryPort,
    passwordHasher: PasswordHasherPort,
    jwtService: JwtServicePort
  ) {
    this._userCredentialRepository = userCredentialRepository;
    this._passwordHasher = passwordHasher;
    this._jwtService = jwtService;

    Object.freeze(this);
  }

  /**
   * Factory method to create LoginUser usecase
   */
  public static create(
    userCredentialRepository: UserCredentialRepositoryPort,
    passwordHasher: PasswordHasherPort,
    jwtService: JwtServicePort
  ): LoginUser {
    return new LoginUser(userCredentialRepository, passwordHasher, jwtService);
  }

  /**
   * Execute the login usecase
   *
   * @param input - Login credentials
   * @returns User and JWT tokens
   * @throws LoginUserError if validation fails or credentials are invalid
   */
  public async execute(input: LoginUserInput): Promise<LoginUserOutput> {
    // Validate input
    this.validateInput(input);

    // Normalize email
    const normalizedEmail = this.normalizeEmail(input.email);

    // Find user with credentials
    const userWithCredentials = await this._userCredentialRepository.findByEmailWithCredentials(
      normalizedEmail
    );

    // User not found - throw same error as invalid password (security)
    if (!userWithCredentials) {
      throw new LoginUserError('INVALID_CREDENTIALS', 'INVALID_CREDENTIALS');
    }

    // Verify password
    const isPasswordValid = await this._passwordHasher.verify(
      input.password,
      userWithCredentials.passwordHash
    );

    // Invalid password - throw same error as user not found (security)
    if (!isPasswordValid) {
      throw new LoginUserError('INVALID_CREDENTIALS', 'INVALID_CREDENTIALS');
    }

    // Generate tokens
    const [accessToken, refreshToken] = await Promise.all([
      this._jwtService.generateAccessToken({
        userId: userWithCredentials.user.id,
        email: userWithCredentials.user.email.value,
      }),
      this._jwtService.generateRefreshToken({
        userId: userWithCredentials.user.id,
      }),
    ]);

    return {
      user: userWithCredentials.user,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Validate login input
   */
  private validateInput(input: LoginUserInput): void {
    if (!input.email || input.email.trim().length === 0) {
      throw new LoginUserError('email cannot be empty', 'VALIDATION_ERROR');
    }
    if (!input.password || input.password.trim().length === 0) {
      throw new LoginUserError('password cannot be empty', 'VALIDATION_ERROR');
    }
  }

  /**
   * Normalize email: trim whitespace and convert to lowercase
   */
  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
