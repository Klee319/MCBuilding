/**
 * Domain Layer - Minecraft建築データ共有SNS
 *
 * このレイヤーはビジネスの核心となるエンティティ、値オブジェクト、
 * ドメインサービス、ドメインイベントを定義します。
 *
 * 依存ルール: 外部依存なし（最内層）
 */

// ========================================
// Value Objects
// ========================================
export {
  Visibility,
  InvalidVisibilityError,
  VISIBILITY_VALUES,
  type VisibilityValue,
} from './value-objects/visibility.js';

export {
  Version,
  InvalidVersionFormatError,
  UnsupportedVersionError,
  MIN_SUPPORTED_MAJOR,
  MIN_SUPPORTED_MINOR,
} from './value-objects/version.js';

export {
  Edition,
  InvalidEditionError,
  EDITION_VALUES,
  type EditionValue,
} from './value-objects/edition.js';

export {
  FileFormat,
  InvalidFileFormatError,
  FILE_FORMAT_VALUES,
  type FileFormatValue,
} from './value-objects/file-format.js';

export {
  AccountLevel,
  InvalidAccountLevelError,
  ACCOUNT_LEVEL_VALUES,
  type AccountLevelValue,
} from './value-objects/account-level.js';

export {
  Dimensions,
  InvalidDimensionsError,
  SIZE_CATEGORY_VALUES,
  type SizeCategoryValue,
} from './value-objects/dimensions.js';

export { Email, InvalidEmailError } from './value-objects/email.js';

export {
  UnlistedUrl,
  InvalidUnlistedUrlError,
  ExpiredUnlistedUrlError,
} from './value-objects/unlisted-url.js';

// 未実装の値オブジェクト
// export { Tag } from './value-objects/tag.js'

// ========================================
// Entities
// ========================================
export {
  Structure,
  InvalidStructureError,
  type StructureProps,
} from './entities/structure.js';

export {
  User,
  InvalidUserError,
  type UserProps,
} from './entities/user.js';

// export { Post } from './entities/post.js'
// export { Comment } from './entities/comment.js'
// export { Like } from './entities/like.js'
// export { Follow } from './entities/follow.js'
// export { Notification } from './entities/notification.js'

// ========================================
// Domain Services
// ========================================
export { VisibilityService } from './services/visibility-service.js';
export { VersionCompatibilityService } from './services/version-compatibility-service.js';

// ========================================
// Domain Events
// ========================================
// export { PostCreated } from './events/PostCreated'
// export { PostLiked } from './events/PostLiked'
// export { CommentAdded } from './events/CommentAdded'
// export { UserFollowed } from './events/UserFollowed'
// export { StructureUploaded } from './events/StructureUploaded'
// export { StructureConverted } from './events/StructureConverted'

// ========================================
// Errors
// ========================================
// export { DomainError } from './errors/DomainError'
