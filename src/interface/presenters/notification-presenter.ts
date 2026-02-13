/**
 * Notification Presenter
 *
 * Formats notification entities for API responses.
 */

import type { Notification } from '../../domain/entities/notification.js';
import type {
  SuccessResponse,
  PaginatedResponse,
  NotificationOutput,
} from './types.js';

export class NotificationPresenter {
  private constructor() {
    // Static methods only
  }

  /**
   * Format a notification for output
   */
  public static toOutput(notification: Notification): NotificationOutput {
    return {
      id: notification.id,
      type: notification.type, // type is already a string literal
      message: this.generateMessage(notification),
      relatedUserId: notification.actorId,
      relatedPostId: notification.targetId,
      isRead: notification.isRead,
      createdAt: notification.createdAt.toISOString(),
    };
  }

  /**
   * Generate a human-readable message for the notification
   */
  private static generateMessage(notification: Notification): string {
    switch (notification.type) {
      case 'like':
        return 'あなたの投稿にいいねがつきました';
      case 'comment':
        return 'あなたの投稿にコメントがつきました';
      case 'follow':
        return '新しいフォロワーがいます';
      case 'mention':
        return 'あなたがメンションされました';
      default:
        return '新しい通知があります';
    }
  }

  /**
   * Format a single notification response
   */
  public static format(
    notification: Notification
  ): SuccessResponse<NotificationOutput> {
    return {
      success: true,
      data: this.toOutput(notification),
    };
  }

  /**
   * Format a paginated notifications response
   */
  public static formatPaginated(
    notifications: readonly Notification[],
    page: number,
    limit: number,
    total: number
  ): PaginatedResponse<NotificationOutput> {
    return {
      success: true,
      data: notifications.map((n) => this.toOutput(n)),
      meta: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
    };
  }
}
