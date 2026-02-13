/**
 * Notification Controller
 *
 * Handles notification-related HTTP requests.
 */

import { ZodError } from 'zod';
import { BaseController, type HttpContext, type HttpResponse } from './types.js';
import {
  getNotificationsQuerySchema,
  notificationIdParamSchema,
} from '../validators/index.js';
import {
  NotificationPresenter,
  ErrorPresenter,
  type NotificationOutput,
} from '../presenters/index.js';

// Usecase imports
import type { GetNotifications } from '../../usecase/notification/get-notifications.js';
import type { MarkNotificationRead } from '../../usecase/notification/mark-notification-read.js';

export interface NotificationControllerDeps {
  readonly getNotifications: GetNotifications;
  readonly markNotificationRead: MarkNotificationRead;
}

export class NotificationController extends BaseController {
  private readonly _deps: NotificationControllerDeps;

  private constructor(deps: NotificationControllerDeps) {
    super();
    this._deps = deps;
    Object.freeze(this);
  }

  public static create(deps: NotificationControllerDeps): NotificationController {
    return new NotificationController(deps);
  }

  /**
   * GET /api/v1/notifications - Get notifications
   */
  public async getNotifications(ctx: HttpContext): Promise<HttpResponse<NotificationOutput>> {
    try {
      if (!ctx.user) {
        return this.createErrorResponse(401, ErrorPresenter.unauthorized());
      }

      const query = getNotificationsQuerySchema.parse(ctx.query);

      const result = await this._deps.getNotifications.execute({
        userId: ctx.user.id,
        page: query.page,
        limit: query.limit,
        includeRead: query.includeRead,
      });

      return this.createPaginatedResponse(
        200,
        NotificationPresenter.formatPaginated(
          result.items,
          result.page,
          result.limit,
          result.total
        )
      );
    } catch (error) {
      if (error instanceof ZodError) {
        return this.createErrorResponse(400, ErrorPresenter.fromZodError(error));
      }
      return this.createErrorResponse(500, ErrorPresenter.internal());
    }
  }

  /**
   * PATCH /api/v1/notifications/:id/read - Mark notification as read
   */
  public async markAsRead(ctx: HttpContext): Promise<HttpResponse<{ read: boolean }>> {
    try {
      if (!ctx.user) {
        return this.createErrorResponse(401, ErrorPresenter.unauthorized());
      }

      const params = notificationIdParamSchema.parse(ctx.params);

      await this._deps.markNotificationRead.execute({
        notificationId: params.id,
        userId: ctx.user.id,
      });

      return this.createResponse(200, { success: true, data: { read: true } });
    } catch (error) {
      if (error instanceof ZodError) {
        return this.createErrorResponse(400, ErrorPresenter.fromZodError(error));
      }
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return this.createErrorResponse(404, ErrorPresenter.notFound('通知'));
        }
        if (error.message.includes('Not authorized') || error.message.includes('not owner')) {
          return this.createErrorResponse(403, ErrorPresenter.forbidden());
        }
        return this.createErrorResponse(400, ErrorPresenter.fromUsecaseError(error));
      }
      return this.createErrorResponse(500, ErrorPresenter.internal());
    }
  }
}
