/**
 * Usecase Layer - Minecraft建築データ共有SNS
 *
 * このレイヤーはアプリケーション固有のビジネスロジックを実装します。
 * ユースケースの実行、入出力DTOの変換、Portの定義を担当します。
 *
 * 依存ルール: Domain層のみ
 */

// ========================================
// UseCases - Structure
// ========================================
export {
  UploadStructure,
  UploadStructureError,
  type UploadStructureInput,
  DownloadStructure,
  DownloadStructureError,
  type DownloadStructureInput,
  type DownloadStructureOutput,
  GetRenderData,
  GetRenderDataError,
  type GetRenderDataInput,
} from './structure/index.js';

// ========================================
// UseCases - Post
// ========================================
export {
  CreatePost,
  CreatePostError,
  type CreatePostInput,
  SearchPosts,
  SearchPostsError,
  type SearchPostsInput,
  GetPostDetail,
  GetPostDetailError,
  type GetPostDetailInput,
  UpdatePost,
  UpdatePostError,
  type UpdatePostInput,
  DeletePost,
  DeletePostError,
  type DeletePostInput,
} from './post/index.js';

// ========================================
// UseCases - User
// ========================================
export {
  RegisterUser,
  RegisterUserError,
  type RegisterUserInput,
  VerifyEmail,
  VerifyEmailError,
  type VerifyEmailInput,
  VerifyPhone,
  VerifyPhoneError,
  type VerifyPhoneInput,
} from './user/index.js';

// ========================================
// UseCases - Social
// ========================================
export {
  LikePost,
  LikePostError,
  type LikePostInput,
  UnlikePost,
  UnlikePostError,
  type UnlikePostInput,
  AddComment,
  AddCommentError,
  type AddCommentInput,
  DeleteComment,
  DeleteCommentError,
  type DeleteCommentInput,
  FollowUser,
  FollowUserError,
  type FollowUserInput,
  UnfollowUser,
  UnfollowUserError,
  type UnfollowUserInput,
} from './social/index.js';

// ========================================
// UseCases - Notification
// ========================================
export {
  GetNotifications,
  GetNotificationsError,
  type GetNotificationsInput,
  MarkNotificationRead,
  MarkNotificationReadError,
  type MarkNotificationReadInput,
} from './notification/index.js';

// ========================================
// Ports (Interfaces)
// ========================================
export type {
  // Repository Ports
  StructureRepositoryPort,
  PostRepositoryPort,
  UserRepositoryPort,
  CommentRepositoryPort,
  LikeRepositoryPort,
  FollowRepositoryPort,
  NotificationRepositoryPort,
  NotificationQueryOptions,
  // Gateway Ports
  StructureConverterPort,
  RendererDataPort,
  NotificationPort,
  EmailPort,
  SmsPort,
  SpamDetectorPort,
  // Common Types
  PaginatedResult,
  PostQuery,
  PostSortBy,
  CreatedWithin,
  StructureData,
  StructureMetadata,
  ConvertedBlock,
  ConversionResult,
  LodLevel,
  RenderData,
  TextureAtlas,
  NotificationType,
  NotificationPayload,
  BulkNotificationResult,
  RateLimitResult,
  ContentCheckResult,
  PortErrorCode,
} from './ports/index.js';

export { PortError } from './ports/index.js';
