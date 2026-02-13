/**
 * Mock Notification Gateway
 *
 * Mock implementation of NotificationPort for testing.
 */

import type { NotificationPort } from '../../../usecase/ports/gateway-ports.js';
import type {
  NotificationPayload,
  BulkNotificationResult,
} from '../../../usecase/ports/types.js';
import { PortError } from '../../../usecase/ports/types.js';

export interface SentNotification {
  readonly userId: string;
  readonly payload: NotificationPayload;
  readonly sentAt: Date;
}

export class MockNotificationGateway implements NotificationPort {
  private readonly _sentNotifications: SentNotification[] = [];
  private _shouldFail = false;
  private readonly _failingUserIds = new Set<string>();

  /**
   * Clear all sent notifications (for test reset)
   */
  public clear(): void {
    this._sentNotifications.length = 0;
    this._shouldFail = false;
    this._failingUserIds.clear();
  }

  /**
   * Get all sent notifications (for test verification)
   */
  public getSentNotifications(): readonly SentNotification[] {
    return this._sentNotifications;
  }

  /**
   * Set whether the gateway should fail (for error testing)
   */
  public setShouldFail(shouldFail: boolean): void {
    this._shouldFail = shouldFail;
  }

  /**
   * Set specific user IDs that should fail (for partial failure testing)
   */
  public setFailingUserIds(userIds: string[]): void {
    this._failingUserIds.clear();
    for (const id of userIds) {
      this._failingUserIds.add(id);
    }
  }

  public async notify(
    userId: string,
    payload: NotificationPayload
  ): Promise<void> {
    if (this._shouldFail || this._failingUserIds.has(userId)) {
      throw new PortError('SEND_FAILED', `Failed to send notification to ${userId}`);
    }

    this._sentNotifications.push({
      userId,
      payload,
      sentAt: new Date(),
    });
  }

  public async notifyBulk(
    userIds: string[],
    payload: NotificationPayload
  ): Promise<BulkNotificationResult> {
    const failedUserIds: string[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const userId of userIds) {
      if (this._shouldFail || this._failingUserIds.has(userId)) {
        failedUserIds.push(userId);
        failureCount++;
      } else {
        this._sentNotifications.push({
          userId,
          payload,
          sentAt: new Date(),
        });
        successCount++;
      }
    }

    return {
      successCount,
      failureCount,
      failedUserIds,
    };
  }
}
