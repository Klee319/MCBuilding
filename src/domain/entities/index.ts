/**
 * Domain Entities
 *
 * Entities represent business objects with identity.
 * They have a unique identifier and lifecycle.
 */

export {
  Structure,
  InvalidStructureError,
  type StructureProps,
} from './structure.js';

export {
  User,
  InvalidUserError,
  type UserProps,
} from './user.js';

export {
  Comment,
  InvalidCommentError,
  type CommentProps,
} from './comment.js';

export {
  Like,
  InvalidLikeError,
  type LikeProps,
} from './like.js';

export {
  Follow,
  InvalidFollowError,
  type FollowProps,
} from './follow.js';

export {
  Notification,
  InvalidNotificationError,
  type NotificationProps,
  type NotificationType,
} from './notification.js';

export {
  Post,
  InvalidPostError,
  type PostProps,
} from './post.js';
