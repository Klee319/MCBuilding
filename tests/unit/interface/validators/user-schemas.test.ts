/**
 * User Schemas Unit Tests
 *
 * TDD tests for user-related validation schemas.
 */

import { describe, it, expect } from 'vitest';
import {
  registerUserSchema,
  loginSchema,
  updateProfileSchema,
  verifyEmailSchema,
  verifyPhoneSchema,
  userIdParamSchema,
} from '../../../../src/interface/validators/user-schemas';

// ========================================
// registerUserSchema Tests
// ========================================
describe('registerUserSchema', () => {
  describe('valid input parsing', () => {
    it('should accept valid registration input', () => {
      const input = {
        email: 'test@example.com',
        password: 'password123',
        displayName: 'TestUser',
      };

      const result = registerUserSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
        expect(result.data.password).toBe('password123');
        expect(result.data.displayName).toBe('TestUser');
      }
    });

    it('should accept email with subdomain', () => {
      const input = {
        email: 'user@mail.example.co.jp',
        password: 'securepass',
        displayName: 'User',
      };

      const result = registerUserSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept password with special characters', () => {
      const input = {
        email: 'test@example.com',
        password: 'P@ssw0rd!#$%',
        displayName: 'User',
      };

      const result = registerUserSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept displayName with unicode characters', () => {
      const input = {
        email: 'test@example.com',
        password: 'password123',
        displayName: 'user_name_001',
      };

      const result = registerUserSchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });

  describe('invalid input rejection', () => {
    it('should reject invalid email format', () => {
      const input = {
        email: 'invalid-email',
        password: 'password123',
        displayName: 'User',
      };

      const result = registerUserSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('メールアドレス');
      }
    });

    it('should reject email without domain', () => {
      const input = {
        email: 'user@',
        password: 'password123',
        displayName: 'User',
      };

      const result = registerUserSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject email exceeding 255 characters', () => {
      const longLocalPart = 'a'.repeat(250);
      const input = {
        email: `${longLocalPart}@example.com`,
        password: 'password123',
        displayName: 'User',
      };

      const result = registerUserSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('255文字以内');
      }
    });

    it('should reject password shorter than 8 characters', () => {
      const input = {
        email: 'test@example.com',
        password: 'short',
        displayName: 'User',
      };

      const result = registerUserSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('8文字以上');
      }
    });

    it('should reject password exceeding 128 characters', () => {
      const input = {
        email: 'test@example.com',
        password: 'a'.repeat(129),
        displayName: 'User',
      };

      const result = registerUserSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('128文字以内');
      }
    });

    it('should reject empty displayName', () => {
      const input = {
        email: 'test@example.com',
        password: 'password123',
        displayName: '',
      };

      const result = registerUserSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('表示名を入力');
      }
    });

    it('should reject displayName exceeding 50 characters', () => {
      const input = {
        email: 'test@example.com',
        password: 'password123',
        displayName: 'A'.repeat(51),
      };

      const result = registerUserSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('50文字以内');
      }
    });

    it('should reject missing email', () => {
      const input = {
        password: 'password123',
        displayName: 'User',
      };

      const result = registerUserSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject missing password', () => {
      const input = {
        email: 'test@example.com',
        displayName: 'User',
      };

      const result = registerUserSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject missing displayName', () => {
      const input = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = registerUserSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should accept password with exactly 8 characters', () => {
      const input = {
        email: 'test@example.com',
        password: '12345678',
        displayName: 'User',
      };

      const result = registerUserSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept password with exactly 128 characters', () => {
      const input = {
        email: 'test@example.com',
        password: 'a'.repeat(128),
        displayName: 'User',
      };

      const result = registerUserSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept displayName with exactly 50 characters', () => {
      const input = {
        email: 'test@example.com',
        password: 'password123',
        displayName: 'A'.repeat(50),
      };

      const result = registerUserSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept displayName with single character', () => {
      const input = {
        email: 'test@example.com',
        password: 'password123',
        displayName: 'A',
      };

      const result = registerUserSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept email with exactly 255 characters', () => {
      const localPart = 'a'.repeat(243);
      const input = {
        email: `${localPart}@example.com`, // 243 + 1 + 11 = 255
        password: 'password123',
        displayName: 'User',
      };

      const result = registerUserSchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });
});

// ========================================
// loginSchema Tests
// ========================================
describe('loginSchema', () => {
  describe('valid input parsing', () => {
    it('should accept valid login credentials', () => {
      const input = {
        email: 'user@example.com',
        password: 'mypassword',
      };

      const result = loginSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('user@example.com');
        expect(result.data.password).toBe('mypassword');
      }
    });

    it('should accept any non-empty password', () => {
      const input = {
        email: 'user@example.com',
        password: 'x',
      };

      const result = loginSchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });

  describe('invalid input rejection', () => {
    it('should reject invalid email', () => {
      const input = {
        email: 'not-an-email',
        password: 'password123',
      };

      const result = loginSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('メールアドレス');
      }
    });

    it('should reject empty password', () => {
      const input = {
        email: 'user@example.com',
        password: '',
      };

      const result = loginSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('パスワードを入力');
      }
    });

    it('should reject missing email', () => {
      const input = {
        password: 'password123',
      };

      const result = loginSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject missing password', () => {
      const input = {
        email: 'user@example.com',
      };

      const result = loginSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });
});

// ========================================
// updateProfileSchema Tests
// ========================================
describe('updateProfileSchema', () => {
  describe('valid input parsing', () => {
    it('should accept empty object (all optional)', () => {
      const input = {};

      const result = updateProfileSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept displayName only', () => {
      const input = {
        displayName: 'NewName',
      };

      const result = updateProfileSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.displayName).toBe('NewName');
      }
    });

    it('should accept bio only', () => {
      const input = {
        bio: 'This is my bio',
      };

      const result = updateProfileSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.bio).toBe('This is my bio');
      }
    });

    it('should accept both displayName and bio', () => {
      const input = {
        displayName: 'NewName',
        bio: 'My updated bio',
      };

      const result = updateProfileSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept empty bio string', () => {
      const input = {
        bio: '',
      };

      const result = updateProfileSchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });

  describe('invalid input rejection', () => {
    it('should reject empty displayName when provided', () => {
      const input = {
        displayName: '',
      };

      const result = updateProfileSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('表示名を入力');
      }
    });

    it('should reject displayName exceeding 50 characters', () => {
      const input = {
        displayName: 'A'.repeat(51),
      };

      const result = updateProfileSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('50文字以内');
      }
    });

    it('should reject bio exceeding 500 characters', () => {
      const input = {
        bio: 'A'.repeat(501),
      };

      const result = updateProfileSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('500文字以内');
      }
    });
  });

  describe('edge cases', () => {
    it('should accept displayName with exactly 50 characters', () => {
      const input = {
        displayName: 'A'.repeat(50),
      };

      const result = updateProfileSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept bio with exactly 500 characters', () => {
      const input = {
        bio: 'A'.repeat(500),
      };

      const result = updateProfileSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept bio with unicode/emoji characters', () => {
      const input = {
        bio: 'Hello World!',
      };

      const result = updateProfileSchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });
});

// ========================================
// verifyEmailSchema Tests
// ========================================
describe('verifyEmailSchema', () => {
  describe('valid input parsing', () => {
    it('should accept valid verification input', () => {
      const input = {
        userId: 'user-123',
        token: 'verify-token-abc',
      };

      const result = verifyEmailSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.userId).toBe('user-123');
        expect(result.data.token).toBe('verify-token-abc');
      }
    });

    it('should accept UUID format IDs', () => {
      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        token: 'abcdef123456',
      };

      const result = verifyEmailSchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });

  describe('invalid input rejection', () => {
    it('should reject empty userId', () => {
      const input = {
        userId: '',
        token: 'valid-token',
      };

      const result = verifyEmailSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('User ID is required');
      }
    });

    it('should reject empty token', () => {
      const input = {
        userId: 'user-123',
        token: '',
      };

      const result = verifyEmailSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('認証トークン');
      }
    });

    it('should reject missing userId', () => {
      const input = {
        token: 'valid-token',
      };

      const result = verifyEmailSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject missing token', () => {
      const input = {
        userId: 'user-123',
      };

      const result = verifyEmailSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });
});

// ========================================
// verifyPhoneSchema Tests
// ========================================
describe('verifyPhoneSchema', () => {
  describe('valid input parsing', () => {
    it('should accept valid code', () => {
      const input = {
        code: '123456',
      };

      const result = verifyPhoneSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.code).toBe('123456');
      }
    });

    it('should accept alphanumeric code', () => {
      const input = {
        code: 'ABC123',
      };

      const result = verifyPhoneSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept single character code', () => {
      const input = {
        code: '1',
      };

      const result = verifyPhoneSchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });

  describe('invalid input rejection', () => {
    it('should reject empty code', () => {
      const input = {
        code: '',
      };

      const result = verifyPhoneSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('認証コード');
      }
    });

    it('should reject missing code', () => {
      const input = {};

      const result = verifyPhoneSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });
});

// ========================================
// userIdParamSchema Tests
// ========================================
describe('userIdParamSchema', () => {
  describe('valid input parsing', () => {
    it('should accept valid user ID', () => {
      const input = {
        id: 'user-abc-123',
      };

      const result = userIdParamSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('user-abc-123');
      }
    });

    it('should accept UUID format', () => {
      const input = {
        id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = userIdParamSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept numeric string ID', () => {
      const input = {
        id: '999999',
      };

      const result = userIdParamSchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });

  describe('invalid input rejection', () => {
    it('should reject empty id', () => {
      const input = {
        id: '',
      };

      const result = userIdParamSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('User ID is required');
      }
    });

    it('should reject missing id', () => {
      const input = {};

      const result = userIdParamSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should accept single character ID', () => {
      const input = {
        id: 'x',
      };

      const result = userIdParamSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept ID with special characters', () => {
      const input = {
        id: 'user_123-abc.xyz',
      };

      const result = userIdParamSchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });
});
