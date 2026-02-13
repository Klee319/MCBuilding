/**
 * Interface Layer - Minecraft建築データ共有SNS
 *
 * このレイヤーは外部世界との境界を担当します。
 * REST API、Webページ、3Dレンダラーからの入力を受け取り、
 * Usecaseレイヤに委譲します。
 *
 * 依存ルール: Usecase層、Domain層（読み取り専用）
 */

// ========================================
// Controllers
// ========================================
export {
  PostController,
  StructureController,
  UserController,
  SocialController,
  NotificationController,
  BaseController,
  type PostControllerDeps,
  type StructureControllerDeps,
  type UserControllerDeps,
  type SocialControllerDeps,
  type NotificationControllerDeps,
  type HttpContext,
  type HttpResponse,
  type ControllerMethod,
  type AuthRequirement,
  type RouteDefinition,
} from './controllers/index.js';

// ========================================
// Presenters
// ========================================
export {
  PostPresenter,
  StructurePresenter,
  UserPresenter,
  CommentPresenter,
  NotificationPresenter,
  ErrorPresenter,
  ErrorCode,
  errorCodeToStatus,
  type PostWithRelations,
  type CommentWithAuthor,
  type ErrorCodeType,
  type SuccessResponse,
  type PaginatedResponse,
  type ErrorResponse,
  type ErrorDetail,
  type ApiResponse,
  type PaginatedApiResponse,
  type UserSummaryOutput,
  type UserOutput,
  type StructureOutput,
  type PostOutput,
  type PostSummaryOutput,
  type CommentOutput,
  type NotificationOutput,
  type DownloadOutput,
  type RenderDataOutput,
  type AuthTokenOutput,
} from './presenters/index.js';

// ========================================
// Validators (zod schemas)
// ========================================
export {
  // Post schemas
  createPostSchema,
  updatePostSchema,
  postQuerySchema,
  postIdParamSchema,
  unlistedTokenParamSchema,
  type CreatePostInput,
  type UpdatePostInput,
  type PostQueryInput,
  type PostIdParam,
  type UnlistedTokenParam,
  // Structure schemas
  uploadStructureSchema,
  downloadStructureQuerySchema,
  structureIdParamSchema,
  getRenderDataQuerySchema,
  type UploadStructureInput,
  type DownloadStructureQuery,
  type StructureIdParam,
  type GetRenderDataQuery,
  // User schemas
  registerUserSchema,
  loginSchema,
  updateProfileSchema,
  verifyEmailSchema,
  verifyPhoneSchema,
  userIdParamSchema,
  type RegisterUserInput,
  type LoginInput,
  type UpdateProfileInput,
  type VerifyEmailInput,
  type VerifyPhoneInput,
  type UserIdParam,
  // Social schemas
  createCommentSchema,
  commentIdParamSchema,
  reportContentSchema,
  getCommentsQuerySchema,
  type CreateCommentInput,
  type CommentIdParam,
  type ReportContentInput,
  type GetCommentsQuery,
  // Notification schemas
  getNotificationsQuerySchema,
  notificationIdParamSchema,
  markAllReadSchema,
  type GetNotificationsQuery,
  type NotificationIdParam,
  type MarkAllReadInput,
} from './validators/index.js';

// ========================================
// 3D Renderers (Client-side) - TODO
// ========================================
// export { WebGLRenderer } from './renderers/WebGLRenderer.js'
// export { ResourcePackLoader } from './renderers/ResourcePackLoader.js'
// export { LODManager } from './renderers/LODManager.js'

// ========================================
// Routes - TODO (Framework-specific)
// ========================================
// export { postRoutes } from './routes/postRoutes.js'
// export { structureRoutes } from './routes/structureRoutes.js'
// export { userRoutes } from './routes/userRoutes.js'
// export { socialRoutes } from './routes/socialRoutes.js'
// export { notificationRoutes } from './routes/notificationRoutes.js'
// export { embedRoutes } from './routes/embedRoutes.js'
