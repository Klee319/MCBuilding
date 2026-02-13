/**
 * Notification Validation Schemas
 *
 * Zod schemas for notification-related API inputs.
 */

import { z } from 'zod';

// ========================================
// Get Notifications Query Schema
// ========================================
export const getNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  includeRead: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
});

export type GetNotificationsQuery = z.infer<typeof getNotificationsQuerySchema>;

// ========================================
// Notification ID Param Schema
// ========================================
export const notificationIdParamSchema = z.object({
  id: z.string().min(1, 'Notification ID is required'),
});

export type NotificationIdParam = z.infer<typeof notificationIdParamSchema>;

// ========================================
// Mark All Read Schema
// ========================================
export const markAllReadSchema = z.object({
  markAll: z.literal(true),
});

export type MarkAllReadInput = z.infer<typeof markAllReadSchema>;
