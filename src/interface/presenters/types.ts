/**
 * Presenter Types
 *
 * Common types for API responses.
 */

// ========================================
// Success Response
// ========================================
export interface SuccessResponse<T> {
  readonly success: true;
  readonly data: T;
}

// ========================================
// Paginated Response
// ========================================
export interface PaginatedResponse<T> {
  readonly success: true;
  readonly data: readonly T[];
  readonly meta: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly hasMore: boolean;
  };
}

// ========================================
// Error Response
// ========================================
export interface ErrorDetail {
  readonly field: string;
  readonly message: string;
}

export interface ErrorResponse {
  readonly success: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: readonly ErrorDetail[];
  };
}

// ========================================
// API Response Union
// ========================================
export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;
export type PaginatedApiResponse<T> = PaginatedResponse<T> | ErrorResponse;

// ========================================
// Output DTOs
// ========================================
export interface UserSummaryOutput {
  readonly id: string;
  readonly displayName: string;
  readonly accountLevel: string;
  readonly badges: readonly string[];
}

export interface StructureOutput {
  readonly id: string;
  readonly originalFormat: string;
  readonly originalEdition: string;
  readonly originalVersion: string;
  readonly dimensions: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  };
  readonly blockCount: number;
  readonly availableEditions: readonly string[];
  readonly availableVersions: readonly string[];
}

export interface PostOutput {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly tags: readonly string[];
  readonly requiredMods: readonly string[];
  readonly visibility: string;
  readonly unlistedUrl: string | null;
  readonly unlistedExpiry: string | null;
  readonly author: UserSummaryOutput;
  readonly structure: StructureOutput;
  readonly likeCount: number;
  readonly downloadCount: number;
  readonly commentCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PostSummaryOutput {
  readonly id: string;
  readonly title: string;
  readonly thumbnailUrl: string | null;
  readonly author: UserSummaryOutput;
  readonly likeCount: number;
  readonly downloadCount: number;
  readonly createdAt: string;
}

export interface CommentOutput {
  readonly id: string;
  readonly content: string;
  readonly author: UserSummaryOutput;
  readonly parentCommentId: string | null;
  readonly replies: readonly CommentOutput[];
  readonly isDeleted: boolean;
  readonly createdAt: string;
}

export interface UserOutput {
  readonly id: string;
  readonly displayName: string;
  readonly accountLevel: string;
  readonly badges: readonly string[];
  readonly followerCount: number;
  readonly followingCount: number;
  readonly postCount: number;
  readonly createdAt: string;
}

export interface NotificationOutput {
  readonly id: string;
  readonly type: string;
  readonly message: string;
  readonly relatedUserId: string | null;
  readonly relatedPostId: string | null;
  readonly isRead: boolean;
  readonly createdAt: string;
}

export interface DownloadOutput {
  readonly downloadUrl: string;
  readonly edition: string;
  readonly version: string;
}

// Re-export block state types from usecase layer for API output
export type {
  BlockShape as BlockShapeOutput,
  BlockFacing as BlockFacingOutput,
  BlockHalf as BlockHalfOutput,
  StairShape as StairShapeOutput,
  WallHeight as WallHeightOutput,
  BlockConnections as BlockConnectionsOutput,
} from '../../usecase/ports/types.js';

import type {
  BlockShape,
  BlockFacing,
  BlockHalf,
  StairShape,
  BlockConnections,
} from '../../usecase/ports/types.js';

export interface RenderBlockOutput {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly paletteIndex: number;
  readonly shape?: BlockShape;
  readonly facing?: BlockFacing;
  readonly half?: BlockHalf;
  readonly stairShape?: StairShape;
  readonly connections?: BlockConnections;
}

export interface PaletteEntryOutput {
  readonly name: string;
  readonly properties?: Readonly<Record<string, string>>;
}

export interface RenderDataOutput {
  readonly dimensions: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  };
  readonly blocks: readonly RenderBlockOutput[];
  readonly palette: readonly PaletteEntryOutput[];
  readonly lodLevel: string;
}

export interface AuthTokenOutput {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresIn: number;
}
