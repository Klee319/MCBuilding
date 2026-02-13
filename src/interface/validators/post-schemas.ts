/**
 * Post Validation Schemas
 *
 * Zod schemas for post-related API inputs.
 */

import { z } from 'zod';

// ========================================
// Create Post Schema
// ========================================
export const createPostSchema = z.object({
  structureId: z.string().min(1, 'structureId cannot be empty'),
  title: z
    .string()
    .min(1, 'タイトルを入力してください')
    .max(50, 'タイトルは50文字以内で入力してください'),
  description: z
    .string()
    .max(2000, '説明文は2000文字以内で入力してください')
    .optional(),
  tags: z
    .array(z.string().min(1).max(30))
    .max(10, 'タグは10個以内で指定してください')
    .optional(),
  visibility: z.enum(['public', 'private', 'unlisted']),
  unlistedExpiry: z.string().datetime().optional().nullable(),
  requiredMods: z.array(z.string()).optional(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;

// ========================================
// Update Post Schema
// ========================================
export const updatePostSchema = z.object({
  title: z
    .string()
    .min(1, 'タイトルを入力してください')
    .max(50, 'タイトルは50文字以内で入力してください')
    .optional(),
  description: z
    .string()
    .max(2000, '説明文は2000文字以内で入力してください')
    .optional(),
  visibility: z.enum(['public', 'private', 'unlisted']).optional(),
  unlistedExpiry: z.string().datetime().optional().nullable(),
});

export type UpdatePostInput = z.infer<typeof updatePostSchema>;

// ========================================
// Post Query Schema
// ========================================
export const postQuerySchema = z.object({
  keyword: z.string().optional(),
  edition: z
    .string()
    .transform((val) => val.split(',').filter((s) => s.length > 0))
    .pipe(z.array(z.enum(['java', 'bedrock'])))
    .optional(),
  sizeCategory: z
    .string()
    .transform((val) => val.split(',').filter((s) => s.length > 0))
    .pipe(z.array(z.enum(['small', 'medium', 'large', 'xlarge'])))
    .optional(),
  hasRequiredMods: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  authorId: z.string().optional(),
  sortBy: z.enum(['popular', 'newest', 'downloads']).default('popular'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PostQueryInput = z.infer<typeof postQuerySchema>;

// ========================================
// Post ID Param Schema
// ========================================
export const postIdParamSchema = z.object({
  id: z.string().min(1, 'Post ID is required'),
});

export type PostIdParam = z.infer<typeof postIdParamSchema>;

// ========================================
// Unlisted Token Param Schema
// ========================================
export const unlistedTokenParamSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export type UnlistedTokenParam = z.infer<typeof unlistedTokenParamSchema>;
