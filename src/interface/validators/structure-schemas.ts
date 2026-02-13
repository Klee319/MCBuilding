/**
 * Structure Validation Schemas
 *
 * Zod schemas for structure-related API inputs.
 */

import { z } from 'zod';

// Version pattern: 1.12+
const versionPattern = /^1\.(1[2-9]|[2-9]\d)(\.\d+)?$/;

// ========================================
// Upload Structure Schema
// ========================================
export const uploadStructureSchema = z.object({
  originalEdition: z.enum(['java', 'bedrock'], {
    errorMap: () => ({ message: 'エディションは java または bedrock を指定してください' }),
  }),
  originalVersion: z
    .string()
    .regex(versionPattern, '1.12以上のバージョンを指定してください'),
});

export type UploadStructureInput = z.infer<typeof uploadStructureSchema>;

// ========================================
// Download Structure Query Schema
// ========================================
export const downloadStructureQuerySchema = z.object({
  edition: z.enum(['java', 'bedrock'], {
    errorMap: () => ({ message: 'エディションは java または bedrock を指定してください' }),
  }),
  version: z
    .string()
    .regex(versionPattern, '1.12以上のバージョンを指定してください'),
});

export type DownloadStructureQuery = z.infer<typeof downloadStructureQuerySchema>;

// ========================================
// Structure ID Param Schema
// ========================================
export const structureIdParamSchema = z.object({
  id: z.string().min(1, 'Structure ID is required'),
});

export type StructureIdParam = z.infer<typeof structureIdParamSchema>;

// ========================================
// Get Render Data Query Schema
// ========================================
export const getRenderDataQuerySchema = z.object({
  lodLevel: z.enum(['full', 'high', 'medium', 'low', 'preview']).optional(),
});

export type GetRenderDataQuery = z.infer<typeof getRenderDataQuerySchema>;
