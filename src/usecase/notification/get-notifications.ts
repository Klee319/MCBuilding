/**
 * GetNotifications Usecase
 *
 * Gets paginated notifications for a user.
 */

import type { Notification } from '../../domain/entities/notification.js';
import type { NotificationRepositoryPort } from '../ports/repository-ports.js';
import type { PaginatedResult } from '../ports/types.js';

export interface GetNotificationsInput {
  readonly userId: string;
  readonly page?: number;
  readonly limit?: number;
  readonly includeRead?: boolean;
}

export class GetNotificationsError extends Error {
  public override readonly name = 'GetNotificationsError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, GetNotificationsError.prototype);
  }
}

export class GetNotifications {
  private readonly _notificationRepository: NotificationRepositoryPort;

  private constructor(notificationRepository: NotificationRepositoryPort) {
    this._notificationRepository = notificationRepository;

    Object.freeze(this);
  }

  public static create(notificationRepository: NotificationRepositoryPort): GetNotifications {
    return new GetNotifications(notificationRepository);
  }

  public async execute(input: GetNotificationsInput): Promise<PaginatedResult<Notification>> {
    this.validateInput(input);

    const { userId, page, limit, includeRead } = input;

    return this._notificationRepository.findByUser(userId, {
      page: page ?? 1,
      limit: Math.min(limit ?? 20, 100),
      includeRead: includeRead ?? false,
    });
  }

  private validateInput(input: GetNotificationsInput): void {
    if (!input.userId || input.userId.trim().length === 0) {
      throw new GetNotificationsError('userId cannot be empty');
    }
  }
}
