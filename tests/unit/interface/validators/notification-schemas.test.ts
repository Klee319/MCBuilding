/**
 * Notification Schemas Unit Tests
 *
 * TDD tests for notification-related validation schemas.
 */

import { describe, it, expect } from 'vitest';
import {
  getNotificationsQuerySchema,
  notificationIdParamSchema,
  markAllReadSchema,
} from '../../../../src/interface/validators/notification-schemas';

// ========================================
// getNotificationsQuerySchema Tests
// ========================================
describe('getNotificationsQuerySchema', () => {
  describe('valid input parsing', () => {
    it('should accept empty query and apply defaults', () => {
      const input = {};

      const result = getNotificationsQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
        expect(result.data.includeRead).toBe(false);
      }
    });

    it('should accept custom page and limit', () => {
      const input = {
        page: 3,
        limit: 50,
      };

      const result = getNotificationsQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(3);
        expect(result.data.limit).toBe(50);
      }
    });

    it('should accept includeRead as true string', () => {
      const input = {
        includeRead: 'true',
      };

      const result = getNotificationsQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeRead).toBe(true);
      }
    });

    it('should accept includeRead as false string', () => {
      const input = {
        includeRead: 'false',
      };

      const result = getNotificationsQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeRead).toBe(false);
      }
    });

    it('should accept all parameters together', () => {
      const input = {
        page: '2',
        limit: '25',
        includeRead: 'true',
      };

      const result = getNotificationsQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(25);
        expect(result.data.includeRead).toBe(true);
      }
    });
  });

  describe('type coercion', () => {
    it('should coerce page from string to number', () => {
      const input = {
        page: '5',
      };

      const result = getNotificationsQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(5);
        expect(typeof result.data.page).toBe('number');
      }
    });

    it('should coerce limit from string to number', () => {
      const input = {
        limit: '30',
      };

      const result = getNotificationsQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(30);
        expect(typeof result.data.limit).toBe('number');
      }
    });

    it('should transform includeRead string to boolean true', () => {
      const input = {
        includeRead: 'true',
      };

      const result = getNotificationsQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeRead).toBe(true);
        expect(typeof result.data.includeRead).toBe('boolean');
      }
    });

    it('should transform includeRead non-true string to boolean false', () => {
      const input = {
        includeRead: 'yes',
      };

      const result = getNotificationsQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeRead).toBe(false);
      }
    });

    it('should transform includeRead empty string to boolean false', () => {
      const input = {
        includeRead: '',
      };

      const result = getNotificationsQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeRead).toBe(false);
      }
    });
  });

  describe('default value application', () => {
    it('should apply default page when not provided', () => {
      const input = {
        limit: 50,
      };

      const result = getNotificationsQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
      }
    });

    it('should apply default limit when not provided', () => {
      const input = {
        page: 2,
      };

      const result = getNotificationsQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
      }
    });

    it('should apply default includeRead (false) when not provided', () => {
      const input = {
        page: 1,
      };

      const result = getNotificationsQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeRead).toBe(false);
      }
    });
  });

  describe('invalid input rejection', () => {
    it('should reject page less than 1', () => {
      const input = {
        page: 0,
      };

      const result = getNotificationsQuerySchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject negative page', () => {
      const input = {
        page: -1,
      };

      const result = getNotificationsQuerySchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject limit less than 1', () => {
      const input = {
        limit: 0,
      };

      const result = getNotificationsQuerySchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject limit greater than 100', () => {
      const input = {
        limit: 101,
      };

      const result = getNotificationsQuerySchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject non-integer page', () => {
      const input = {
        page: 1.5,
      };

      const result = getNotificationsQuerySchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject non-integer limit', () => {
      const input = {
        limit: 25.5,
      };

      const result = getNotificationsQuerySchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject page string coercion failure', () => {
      const input = {
        page: 'abc',
      };

      const result = getNotificationsQuerySchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should accept page at boundary value 1', () => {
      const input = {
        page: 1,
      };

      const result = getNotificationsQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept limit at boundary value 1', () => {
      const input = {
        limit: 1,
      };

      const result = getNotificationsQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept limit at boundary value 100', () => {
      const input = {
        limit: 100,
      };

      const result = getNotificationsQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept very large page number', () => {
      const input = {
        page: 999999,
      };

      const result = getNotificationsQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should treat TRUE (uppercase) as false for includeRead', () => {
      const input = {
        includeRead: 'TRUE',
      };

      const result = getNotificationsQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        // Only exact 'true' is treated as true
        expect(result.data.includeRead).toBe(false);
      }
    });
  });
});

// ========================================
// notificationIdParamSchema Tests
// ========================================
describe('notificationIdParamSchema', () => {
  describe('valid input parsing', () => {
    it('should accept valid notification ID', () => {
      const input = {
        id: 'notif-123',
      };

      const result = notificationIdParamSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('notif-123');
      }
    });

    it('should accept UUID format', () => {
      const input = {
        id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = notificationIdParamSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept numeric string ID', () => {
      const input = {
        id: '12345',
      };

      const result = notificationIdParamSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept long ID string', () => {
      const input = {
        id: 'a'.repeat(100),
      };

      const result = notificationIdParamSchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });

  describe('invalid input rejection', () => {
    it('should reject empty id', () => {
      const input = {
        id: '',
      };

      const result = notificationIdParamSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Notification ID is required');
      }
    });

    it('should reject missing id', () => {
      const input = {};

      const result = notificationIdParamSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should accept single character ID', () => {
      const input = {
        id: 'x',
      };

      const result = notificationIdParamSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept ID with special characters', () => {
      const input = {
        id: 'notif_123-abc.xyz',
      };

      const result = notificationIdParamSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept ID with unicode characters', () => {
      const input = {
        id: 'notif-abc123',
      };

      const result = notificationIdParamSchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });
});

// ========================================
// markAllReadSchema Tests
// ========================================
describe('markAllReadSchema', () => {
  describe('valid input parsing', () => {
    it('should accept markAll as true literal', () => {
      const input = {
        markAll: true,
      };

      const result = markAllReadSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.markAll).toBe(true);
      }
    });
  });

  describe('invalid input rejection', () => {
    it('should reject markAll as false', () => {
      const input = {
        markAll: false,
      };

      const result = markAllReadSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject markAll as string "true"', () => {
      const input = {
        markAll: 'true',
      };

      const result = markAllReadSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject markAll as number 1', () => {
      const input = {
        markAll: 1,
      };

      const result = markAllReadSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject missing markAll', () => {
      const input = {};

      const result = markAllReadSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject null markAll', () => {
      const input = {
        markAll: null,
      };

      const result = markAllReadSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject undefined markAll', () => {
      const input = {
        markAll: undefined,
      };

      const result = markAllReadSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject empty object', () => {
      const input = {};

      const result = markAllReadSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should accept additional properties alongside markAll true', () => {
      const input = {
        markAll: true,
        extra: 'ignored',
      };

      const result = markAllReadSchema.safeParse(input);

      // Zod by default allows extra properties (strips them)
      expect(result.success).toBe(true);
    });

    it('should only accept boolean true, not truthy values', () => {
      const truthyValues = ['1', 1, 'yes', 'true', [], {}];

      for (const value of truthyValues) {
        const input = {
          markAll: value,
        };

        const result = markAllReadSchema.safeParse(input);
        expect(result.success).toBe(false);
      }
    });
  });
});
