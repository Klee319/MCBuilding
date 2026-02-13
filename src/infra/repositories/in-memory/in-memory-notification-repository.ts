/**
 * InMemory Notification Repository
 *
 * In-memory implementation of NotificationRepositoryPort for testing and development.
 */

import type { Notification } from '../../../domain/entities/notification.js';
import type {
  NotificationRepositoryPort,
  NotificationQueryOptions,
} from '../../../usecase/ports/repository-ports.js';
import type { PaginatedResult } from '../../../usecase/ports/types.js';
import { PortError } from '../../../usecase/ports/types.js';

export class InMemoryNotificationRepository
  implements NotificationRepositoryPort
{
  private readonly _notifications = new Map<string, Notification>();
  private readonly _userIndex = new Map<string, Set<string>>(); // userId -> notificationIds

  /**
   * Clear all stored notifications (for test reset)
   */
  public clear(): void {
    this._notifications.clear();
    this._userIndex.clear();
  }

  /**
   * Get all stored notifications (for test verification)
   */
  public getAll(): Notification[] {
    return Array.from(this._notifications.values());
  }

  public async findById(id: string): Promise<Notification | null> {
    return this._notifications.get(id) ?? null;
  }

  public async findByUser(
    userId: string,
    options?: NotificationQueryOptions
  ): Promise<PaginatedResult<Notification>> {
    const notificationIds = this._userIndex.get(userId);
    if (!notificationIds) {
      return {
        items: [],
        total: 0,
        page: options?.page ?? 1,
        limit: options?.limit ?? 20,
        hasMore: false,
      };
    }

    let notifications = Array.from(notificationIds)
      .map((id) => this._notifications.get(id))
      .filter((n): n is Notification => n !== undefined);

    // Filter by read status
    if (!options?.includeRead) {
      notifications = notifications.filter((n) => !n.isRead);
    }

    // Sort by creation date (newest first)
    notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Pagination
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const total = notifications.length;
    const start = (page - 1) * limit;
    const items = notifications.slice(start, start + limit);

    return {
      items,
      total,
      page,
      limit,
      hasMore: start + limit < total,
    };
  }

  public async save(notification: Notification): Promise<Notification> {
    // Update user index
    let notificationIds = this._userIndex.get(notification.userId);
    if (!notificationIds) {
      notificationIds = new Set();
      this._userIndex.set(notification.userId, notificationIds);
    }
    notificationIds.add(notification.id);

    // Save notification
    this._notifications.set(notification.id, notification);

    return notification;
  }

  public async markAsRead(id: string): Promise<void> {
    const notification = this._notifications.get(id);
    if (!notification) {
      throw new PortError('NOT_FOUND', `Notification with id ${id} not found`);
    }

    // Create updated notification with isRead = true
    const updatedNotification = {
      ...notification,
      isRead: true,
    } as Notification;

    this._notifications.set(id, updatedNotification);
  }

  public async markAllAsRead(userId: string): Promise<void> {
    const notificationIds = this._userIndex.get(userId);
    if (!notificationIds) {
      return;
    }

    for (const id of notificationIds) {
      const notification = this._notifications.get(id);
      if (notification && !notification.isRead) {
        const updatedNotification = {
          ...notification,
          isRead: true,
        } as Notification;
        this._notifications.set(id, updatedNotification);
      }
    }
  }
}
