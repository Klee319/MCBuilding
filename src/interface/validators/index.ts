/**
 * Validators Index
 *
 * Re-exports all validation schemas.
 */

// Post schemas
export {
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
} from './post-schemas.js';

// Structure schemas
export {
  uploadStructureSchema,
  downloadStructureQuerySchema,
  structureIdParamSchema,
  getRenderDataQuerySchema,
  type UploadStructureInput,
  type DownloadStructureQuery,
  type StructureIdParam,
  type GetRenderDataQuery,
} from './structure-schemas.js';

// User schemas
export {
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
} from './user-schemas.js';

// Social schemas
export {
  createCommentSchema,
  commentIdParamSchema,
  reportContentSchema,
  getCommentsQuerySchema,
  type CreateCommentInput,
  type CommentIdParam,
  type ReportContentInput,
  type GetCommentsQuery,
} from './social-schemas.js';

// Notification schemas
export {
  getNotificationsQuerySchema,
  notificationIdParamSchema,
  markAllReadSchema,
  type GetNotificationsQuery,
  type NotificationIdParam,
  type MarkAllReadInput,
} from './notification-schemas.js';
