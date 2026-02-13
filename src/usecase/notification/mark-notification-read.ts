/**
 * MarkNotificationRead Usecase
 *
 * Marks a notification as read.
 */

import type { NotificationRepositoryPort } from '../ports/repository-ports.js';

export interface MarkNotificationReadInput {
  readonly notificationId: string;
  readonly userId: string;
}

export class MarkNotificationReadError extends Error {
  public override readonly name = 'MarkNotificationReadError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, MarkNotificationReadError.prototype);
  }
}

export class MarkNotificationRead {
  private readonly _notificationRepository: NotificationRepositoryPort;

  private constructor(notificationRepository: NotificationRepositoryPort) {
    this._notificationRepository = notificationRepository;

    Object.freeze(this);
  }

  public static create(notificationRepository: NotificationRepositoryPort): MarkNotificationRead {
    return new MarkNotificationRead(notificationRepository);
  }

  public async execute(input: MarkNotificationReadInput): Promise<void> {
    this.validateInput(input);

    const { notificationId, userId } = input;

    // Find the notification
    const notification = await this._notificationRepository.findById(notificationId);
    if (!notification) {
      throw new MarkNotificationReadError('Notification not found');
    }

    // Check ownership
    if (notification.userId !== userId) {
      throw new MarkNotificationReadError('Not authorized to access this notification');
    }

    // Mark as read (idempotent)
    if (!notification.isRead) {
      await this._notificationRepository.markAsRead(notificationId);
    }
  }

  private validateInput(input: MarkNotificationReadInput): void {
    if (!input.notificationId || input.notificationId.trim().length === 0) {
      throw new MarkNotificationReadError('notificationId cannot be empty');
    }
    if (!input.userId || input.userId.trim().length === 0) {
      throw new MarkNotificationReadError('userId cannot be empty');
    }
  }
}
