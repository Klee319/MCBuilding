/**
 * User Controller
 *
 * Handles user-related HTTP requests.
 */

import { ZodError } from 'zod';
import { BaseController, type HttpContext, type HttpResponse } from './types.js';
import {
  registerUserSchema,
  loginSchema,
  verifyEmailSchema,
  verifyPhoneSchema,
  userIdParamSchema,
} from '../validators/index.js';
import {
  UserPresenter,
  ErrorPresenter,
  type UserOutput,
} from '../presenters/index.js';

// Usecase imports
import type { RegisterUser } from '../../usecase/user/register-user.js';
import type { LoginUser, LoginUserError } from '../../usecase/user/login-user.js';
import type { VerifyEmail } from '../../usecase/user/verify-email.js';
import type { VerifyPhone } from '../../usecase/user/verify-phone.js';

// Repository imports
import type { UserRepositoryPort } from '../../usecase/ports/repository-ports.js';

/**
 * Login response output type
 */
export interface LoginOutput {
  readonly user: UserOutput;
  readonly accessToken: string;
  readonly refreshToken: string;
}

export interface UserControllerDeps {
  readonly registerUser: RegisterUser;
  readonly loginUser: LoginUser;
  readonly verifyEmail: VerifyEmail;
  readonly verifyPhone: VerifyPhone;
  readonly userRepository: UserRepositoryPort;
}

export class UserController extends BaseController {
  private readonly _deps: UserControllerDeps;

  private constructor(deps: UserControllerDeps) {
    super();
    this._deps = deps;
    Object.freeze(this);
  }

  public static create(deps: UserControllerDeps): UserController {
    return new UserController(deps);
  }

  /**
   * POST /api/v1/users/register - Register new user
   */
  public async register(ctx: HttpContext): Promise<HttpResponse<UserOutput>> {
    try {
      const input = registerUserSchema.parse(ctx.body);

      const user = await this._deps.registerUser.execute({
        email: input.email,
        displayName: input.displayName,
        password: input.password,
      });

      return this.createResponse(201, UserPresenter.format(user));
    } catch (error) {
      if (error instanceof ZodError) {
        return this.createErrorResponse(400, ErrorPresenter.fromZodError(error));
      }
      if (error instanceof Error) {
        if (error.message.includes('already') || error.message.includes('Email already registered')) {
          return this.createErrorResponse(409, ErrorPresenter.conflict(error.message));
        }
        return this.createErrorResponse(400, ErrorPresenter.fromUsecaseError(error));
      }
      return this.createErrorResponse(500, ErrorPresenter.internal());
    }
  }

  /**
   * POST /api/v1/users/login - User login
   */
  public async login(ctx: HttpContext): Promise<HttpResponse<LoginOutput>> {
    try {
      const input = loginSchema.parse(ctx.body);

      const result = await this._deps.loginUser.execute({
        email: input.email,
        password: input.password,
      });

      const loginOutput: LoginOutput = {
        user: UserPresenter.toOutput(result.user),
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      };

      return this.createResponse(200, {
        success: true as const,
        data: loginOutput,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return this.createErrorResponse(400, ErrorPresenter.fromZodError(error));
      }
      if (error instanceof Error) {
        // Check for invalid credentials error
        const isInvalidCredentials =
          error.message === 'INVALID_CREDENTIALS' ||
          (error as LoginUserError).code === 'INVALID_CREDENTIALS';
        if (isInvalidCredentials) {
          return this.createErrorResponse(401, ErrorPresenter.invalidCredentials());
        }
        // Validation error
        if ((error as LoginUserError).code === 'VALIDATION_ERROR') {
          return this.createErrorResponse(400, ErrorPresenter.fromUsecaseError(error));
        }
        return this.createErrorResponse(400, ErrorPresenter.fromUsecaseError(error));
      }
      return this.createErrorResponse(500, ErrorPresenter.internal());
    }
  }

  /**
   * POST /api/v1/users/verify-email - Verify email
   */
  public async verifyEmail(ctx: HttpContext): Promise<HttpResponse<UserOutput>> {
    try {
      const input = verifyEmailSchema.parse(ctx.body);

      const user = await this._deps.verifyEmail.execute({
        userId: input.userId,
        verificationToken: input.token,
      });

      return this.createResponse(200, UserPresenter.format(user));
    } catch (error) {
      if (error instanceof ZodError) {
        return this.createErrorResponse(400, ErrorPresenter.fromZodError(error));
      }
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return this.createErrorResponse(404, ErrorPresenter.notFound('ユーザー'));
        }
        return this.createErrorResponse(400, ErrorPresenter.fromUsecaseError(error));
      }
      return this.createErrorResponse(500, ErrorPresenter.internal());
    }
  }

  /**
   * POST /api/v1/users/verify-phone - Verify phone
   */
  public async verifyPhone(ctx: HttpContext): Promise<HttpResponse<UserOutput>> {
    try {
      if (!ctx.user) {
        return this.createErrorResponse(401, ErrorPresenter.unauthorized());
      }

      const input = verifyPhoneSchema.parse(ctx.body);

      const user = await this._deps.verifyPhone.execute({
        userId: ctx.user.id,
        verificationCode: input.code,
      });

      return this.createResponse(200, UserPresenter.format(user));
    } catch (error) {
      if (error instanceof ZodError) {
        return this.createErrorResponse(400, ErrorPresenter.fromZodError(error));
      }
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return this.createErrorResponse(404, ErrorPresenter.notFound('ユーザー'));
        }
        return this.createErrorResponse(400, ErrorPresenter.fromUsecaseError(error));
      }
      return this.createErrorResponse(500, ErrorPresenter.internal());
    }
  }

  /**
   * GET /api/v1/users/me - Get current user
   */
  public async getMe(ctx: HttpContext): Promise<HttpResponse<UserOutput>> {
    try {
      if (!ctx.user) {
        return this.createErrorResponse(401, ErrorPresenter.unauthorized());
      }

      const user = await this._deps.userRepository.findById(ctx.user.id);
      if (!user) {
        return this.createErrorResponse(404, ErrorPresenter.notFound('ユーザー'));
      }

      return this.createResponse(200, UserPresenter.format(user));
    } catch (error) {
      return this.createErrorResponse(500, ErrorPresenter.internal());
    }
  }

  /**
   * GET /api/v1/users/:id - Get user profile
   */
  public async getById(ctx: HttpContext): Promise<HttpResponse<UserOutput>> {
    try {
      const params = userIdParamSchema.parse(ctx.params);

      const user = await this._deps.userRepository.findById(params.id);
      if (!user) {
        return this.createErrorResponse(404, ErrorPresenter.notFound('ユーザー'));
      }

      return this.createResponse(200, UserPresenter.format(user));
    } catch (error) {
      if (error instanceof ZodError) {
        return this.createErrorResponse(400, ErrorPresenter.fromZodError(error));
      }
      return this.createErrorResponse(500, ErrorPresenter.internal());
    }
  }
}
