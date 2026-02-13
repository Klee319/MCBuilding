/**
 * Controller Types
 *
 * Framework-agnostic types for controllers.
 */

import type { ApiResponse, PaginatedApiResponse, ErrorResponse } from '../presenters/types.js';

// ========================================
// HTTP Context
// ========================================
export interface HttpContext {
  readonly params: Record<string, string>;
  readonly query: Record<string, string | string[] | undefined>;
  readonly body: unknown;
  readonly file?: {
    readonly buffer: Buffer;
    readonly originalname: string;
    readonly mimetype: string;
    readonly size: number;
  };
  readonly user?: {
    readonly id: string;
  };
}

// ========================================
// HTTP Response
// ========================================
export interface HttpResponse<T = unknown> {
  readonly status: number;
  readonly body: ApiResponse<T> | PaginatedApiResponse<T>;
}

// ========================================
// Controller Method
// ========================================
export type ControllerMethod<T = unknown> = (
  ctx: HttpContext
) => Promise<HttpResponse<T>>;

// ========================================
// Authentication Requirement
// ========================================
export interface AuthRequirement {
  readonly required: boolean;
  readonly ownerOnly?: boolean;
}

// ========================================
// Route Definition
// ========================================
export interface RouteDefinition {
  readonly method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  readonly path: string;
  readonly handler: string;
  readonly auth: AuthRequirement;
  readonly description: string;
}

// ========================================
// Base Controller
// ========================================
export abstract class BaseController {
  protected createResponse<T>(status: number, body: ApiResponse<T>): HttpResponse<T> {
    return { status, body };
  }

  protected createPaginatedResponse<T>(
    status: number,
    body: PaginatedApiResponse<T>
  ): HttpResponse<T> {
    return { status, body };
  }

  protected createErrorResponse(status: number, body: ErrorResponse): HttpResponse<never> {
    return { status, body };
  }
}
