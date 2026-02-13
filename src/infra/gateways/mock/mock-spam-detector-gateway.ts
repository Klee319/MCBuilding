/**
 * Mock Spam Detector Gateway
 *
 * Mock implementation of SpamDetectorPort for testing.
 */

import type { SpamDetectorPort } from '../../../usecase/ports/gateway-ports.js';
import type {
  RateLimitResult,
  ContentCheckResult,
} from '../../../usecase/ports/types.js';

interface RateLimitConfig {
  readonly maxCount: number;
  readonly windowMs: number;
}

interface ActionRecord {
  readonly userId: string;
  readonly action: string;
  readonly timestamp: number;
}

export class MockSpamDetectorGateway implements SpamDetectorPort {
  private readonly _actionRecords: ActionRecord[] = [];
  private readonly _rateLimits = new Map<string, RateLimitConfig>();
  private readonly _blockedContent = new Set<string>();
  private _defaultRateLimit: RateLimitConfig = {
    maxCount: 10,
    windowMs: 60000, // 1 minute
  };

  /**
   * Clear all records (for test reset)
   */
  public clear(): void {
    this._actionRecords.length = 0;
    this._rateLimits.clear();
    this._blockedContent.clear();
  }

  /**
   * Set default rate limit config
   */
  public setDefaultRateLimit(maxCount: number, windowMs: number): void {
    this._defaultRateLimit = { maxCount, windowMs };
  }

  /**
   * Set rate limit for specific action
   */
  public setRateLimitForAction(
    action: string,
    maxCount: number,
    windowMs: number
  ): void {
    this._rateLimits.set(action, { maxCount, windowMs });
  }

  /**
   * Add content that should be blocked
   */
  public addBlockedContent(content: string): void {
    this._blockedContent.add(content.toLowerCase());
  }

  /**
   * Simulate action for testing rate limits
   */
  public recordAction(userId: string, action: string): void {
    this._actionRecords.push({
      userId,
      action,
      timestamp: Date.now(),
    });
  }

  public async checkRateLimit(
    userId: string,
    action: string
  ): Promise<RateLimitResult> {
    const config = this._rateLimits.get(action) ?? this._defaultRateLimit;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Count actions within window
    const currentCount = this._actionRecords.filter(
      (r) =>
        r.userId === userId && r.action === action && r.timestamp >= windowStart
    ).length;

    if (currentCount >= config.maxCount) {
      // Find oldest action in window to calculate retry time
      const oldestInWindow = this._actionRecords
        .filter(
          (r) =>
            r.userId === userId &&
            r.action === action &&
            r.timestamp >= windowStart
        )
        .sort((a, b) => a.timestamp - b.timestamp)[0];

      const retryAfter = oldestInWindow
        ? Math.ceil((oldestInWindow.timestamp + config.windowMs - now) / 1000)
        : Math.ceil(config.windowMs / 1000);

      return {
        allowed: false,
        retryAfter,
        currentCount,
        maxCount: config.maxCount,
      };
    }

    // Record this action
    this._actionRecords.push({
      userId,
      action,
      timestamp: now,
    });

    return {
      allowed: true,
      currentCount: currentCount + 1,
      maxCount: config.maxCount,
    };
  }

  public async checkContent(content: string): Promise<ContentCheckResult> {
    const lowerContent = content.toLowerCase();

    // Check for blocked content
    for (const blocked of this._blockedContent) {
      if (lowerContent.includes(blocked)) {
        return {
          allowed: false,
          reason: 'Content contains prohibited words',
          confidence: 1.0,
          categories: ['prohibited_content'],
        };
      }
    }

    // Simple spam detection patterns
    const spamPatterns = [
      /(.)\1{10,}/, // Repeated characters
      /https?:\/\/[^\s]+/gi, // URLs (simplified)
    ];

    const urlMatches = content.match(/https?:\/\/[^\s]+/gi);
    if (urlMatches && urlMatches.length > 3) {
      return {
        allowed: false,
        reason: 'Content contains too many URLs',
        confidence: 0.8,
        categories: ['spam'],
      };
    }

    for (const pattern of spamPatterns) {
      if (pattern.test(content) && content.length < 20) {
        return {
          allowed: false,
          reason: 'Content appears to be spam',
          confidence: 0.7,
          categories: ['spam'],
        };
      }
    }

    return {
      allowed: true,
      confidence: 0.95,
    };
  }
}
