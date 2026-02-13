/**
 * Mock Email Gateway
 *
 * Mock implementation of EmailPort for testing.
 */

import type { EmailPort } from '../../../usecase/ports/gateway-ports.js';

export interface SentEmail {
  readonly to: string;
  readonly type: 'verification' | 'password_reset';
  readonly token: string;
  readonly sentAt: Date;
}

export class MockEmailGateway implements EmailPort {
  private readonly _sentEmails: SentEmail[] = [];
  private _shouldFail = false;

  /**
   * Clear all sent emails (for test reset)
   */
  public clear(): void {
    this._sentEmails.length = 0;
    this._shouldFail = false;
  }

  /**
   * Get all sent emails (for test verification)
   */
  public getSentEmails(): readonly SentEmail[] {
    return this._sentEmails;
  }

  /**
   * Set whether the gateway should fail (for error testing)
   */
  public setShouldFail(shouldFail: boolean): void {
    this._shouldFail = shouldFail;
  }

  public async sendVerificationEmail(
    email: string,
    verificationToken: string
  ): Promise<void> {
    if (this._shouldFail) {
      throw new Error('Failed to send email');
    }

    this._sentEmails.push({
      to: email,
      type: 'verification',
      token: verificationToken,
      sentAt: new Date(),
    });
  }

  public async sendPasswordResetEmail(
    email: string,
    resetToken: string
  ): Promise<void> {
    if (this._shouldFail) {
      throw new Error('Failed to send email');
    }

    this._sentEmails.push({
      to: email,
      type: 'password_reset',
      token: resetToken,
      sentAt: new Date(),
    });
  }
}
