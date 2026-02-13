/**
 * Social Validation Schemas
 *
 * Zod schemas for social-related API inputs (likes, comments, follows).
 */

import { z } from 'zod';

// ========================================
// Create Comment Schema
// ========================================
export const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, 'コメントを入力してください')
    .max(1000, 'コメントは1000文字以内で入力してください'),
  parentCommentId: z.string().nullable().optional(),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;

// ========================================
// Comment ID Param Schema
// ========================================
export const commentIdParamSchema = z.object({
  id: z.string().min(1, 'Comment ID is required'),
});

export type CommentIdParam = z.infer<typeof commentIdParamSchema>;

// ========================================
// Report Content Schema
// ========================================
export const reportContentSchema = z.object({
  targetType: z.enum(['post', 'comment', 'user'], {
    errorMap: () => ({ message: '報告対象は post, comment, user のいずれかを指定してください' }),
  }),
  targetId: z.string().min(1, '報告対象IDを指定してください'),
  reason: z.enum(
    ['spam', 'harassment', 'inappropriate', 'copyright', 'other'],
    {
      errorMap: () => ({ message: '有効な報告理由を選択してください' }),
    }
  ),
  details: z.string().max(1000, '詳細は1000文字以内で入力してください').optional(),
});

export type ReportContentInput = z.infer<typeof reportContentSchema>;

// ========================================
// Get Comments Query Schema
// ========================================
export const getCommentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type GetCommentsQuery = z.infer<typeof getCommentsQuerySchema>;
