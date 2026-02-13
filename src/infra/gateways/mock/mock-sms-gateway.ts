/**
 * Mock SMS Gateway
 *
 * Mock implementation of SmsPort for testing.
 */

import type { SmsPort } from '../../../usecase/ports/gateway-ports.js';
import { PortError } from '../../../usecase/ports/types.js';

export interface SentSms {
  readonly phoneNumber: string;
  readonly code: string;
  readonly sentAt: Date;
}

export class MockSmsGateway implements SmsPort {
  private readonly _sentMessages: SentSms[] = [];
  private _shouldFail = false;
  private _shouldFailValidation = false;

  /**
   * Clear all sent messages (for test reset)
   */
  public clear(): void {
    this._sentMessages.length = 0;
    this._shouldFail = false;
    this._shouldFailValidation = false;
  }

  /**
   * Get all sent messages (for test verification)
   */
  public getSentMessages(): readonly SentSms[] {
    return this._sentMessages;
  }

  /**
   * Set whether the gateway should fail (for error testing)
   */
  public setShouldFail(shouldFail: boolean): void {
    this._shouldFail = shouldFail;
  }

  /**
   * Set whether phone validation should fail (for error testing)
   */
  public setShouldFailValidation(shouldFail: boolean): void {
    this._shouldFailValidation = shouldFail;
  }

  public async sendVerificationCode(
    phoneNumber: string,
    code: string
  ): Promise<void> {
    // Validate phone number format (E.164)
    if (this._shouldFailValidation || !phoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
      throw new PortError(
        'INVALID_PHONE_NUMBER',
        `Invalid phone number format: ${phoneNumber}`
      );
    }

    if (this._shouldFail) {
      throw new PortError('SEND_FAILED', 'Failed to send SMS');
    }

    this._sentMessages.push({
      phoneNumber,
      code,
      sentAt: new Date(),
    });
  }
}
