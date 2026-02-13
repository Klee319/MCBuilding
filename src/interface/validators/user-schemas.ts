/**
 * User Validation Schemas
 *
 * Zod schemas for user-related API inputs.
 */

import { z } from 'zod';

// ========================================
// Register User Schema
// ========================================
export const registerUserSchema = z.object({
  email: z
    .string()
    .email('有効なメールアドレスを入力してください')
    .max(255, 'メールアドレスは255文字以内で入力してください'),
  password: z
    .string()
    .min(8, 'パスワードは8文字以上で入力してください')
    .max(128, 'パスワードは128文字以内で入力してください'),
  displayName: z
    .string()
    .min(1, '表示名を入力してください')
    .max(50, '表示名は50文字以内で入力してください'),
});

export type RegisterUserInput = z.infer<typeof registerUserSchema>;

// ========================================
// Login Schema
// ========================================
export const loginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ========================================
// Update Profile Schema
// ========================================
export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .min(1, '表示名を入力してください')
    .max(50, '表示名は50文字以内で入力してください')
    .optional(),
  bio: z.string().max(500, '自己紹介は500文字以内で入力してください').optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// ========================================
// Verify Email Schema
// ========================================
export const verifyEmailSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  token: z.string().min(1, '認証トークンを入力してください'),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

// ========================================
// Verify Phone Schema
// ========================================
export const verifyPhoneSchema = z.object({
  code: z.string().min(1, '認証コードを入力してください'),
});

export type VerifyPhoneInput = z.infer<typeof verifyPhoneSchema>;

// ========================================
// User ID Param Schema
// ========================================
export const userIdParamSchema = z.object({
  id: z.string().min(1, 'User ID is required'),
});

export type UserIdParam = z.infer<typeof userIdParamSchema>;
