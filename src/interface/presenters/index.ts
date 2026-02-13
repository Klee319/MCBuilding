/**
 * Presenters Index
 *
 * Re-exports all presenters.
 */

// Types
export type {
  SuccessResponse,
  PaginatedResponse,
  ErrorResponse,
  ErrorDetail,
  ApiResponse,
  PaginatedApiResponse,
  UserSummaryOutput,
  UserOutput,
  StructureOutput,
  PostOutput,
  PostSummaryOutput,
  CommentOutput,
  NotificationOutput,
  DownloadOutput,
  RenderDataOutput,
  AuthTokenOutput,
} from './types.js';

// Error Presenter
export {
  ErrorPresenter,
  ErrorCode,
  errorCodeToStatus,
  type ErrorCodeType,
} from './error-presenter.js';

// Entity Presenters
export { UserPresenter } from './user-presenter.js';
export { StructurePresenter } from './structure-presenter.js';
export { PostPresenter, type PostWithRelations } from './post-presenter.js';
export { CommentPresenter, type CommentWithAuthor } from './comment-presenter.js';
export { NotificationPresenter } from './notification-presenter.js';
