/**
 * Dependency Injection Container
 *
 * Assembles all dependencies for the application.
 */

// Repositories
import {
  InMemoryUserRepository,
  InMemoryStructureRepository,
  InMemoryPostRepository,
  InMemoryCommentRepository,
  InMemoryLikeRepository,
  InMemoryFollowRepository,
  InMemoryNotificationRepository,
  InMemoryUserCredentialRepository,
} from '../repositories/in-memory/index.js';

// Security Adapters
import { PasswordHasherAdapter } from '../security/password-hasher-adapter.js';
import { JwtServiceAdapter } from '../security/jwt-service-adapter.js';

// Mock Gateways
import {
  MockEmailGateway,
  MockSmsGateway,
  MockNotificationGateway,
  MockSpamDetectorGateway,
  MockStructureConverterGateway,
  MockRendererDataGateway,
} from '../gateways/mock/index.js';

// Usecases
import { RegisterUser } from '../../usecase/user/register-user.js';
import { LoginUser } from '../../usecase/user/login-user.js';
import { VerifyEmail } from '../../usecase/user/verify-email.js';
import { VerifyPhone } from '../../usecase/user/verify-phone.js';

import { CreatePost } from '../../usecase/post/create-post.js';
import { UpdatePost } from '../../usecase/post/update-post.js';
import { DeletePost } from '../../usecase/post/delete-post.js';
import { SearchPosts } from '../../usecase/post/search-posts.js';
import { GetPostDetail } from '../../usecase/post/get-post-detail.js';

import { UploadStructure } from '../../usecase/structure/upload-structure.js';
import { DownloadStructure } from '../../usecase/structure/download-structure.js';
import { GetRenderData } from '../../usecase/structure/get-render-data.js';

import { LikePost } from '../../usecase/social/like-post.js';
import { UnlikePost } from '../../usecase/social/unlike-post.js';
import { AddComment } from '../../usecase/social/add-comment.js';
import { DeleteComment } from '../../usecase/social/delete-comment.js';
import { FollowUser } from '../../usecase/social/follow-user.js';
import { UnfollowUser } from '../../usecase/social/unfollow-user.js';

import { GetNotifications } from '../../usecase/notification/get-notifications.js';
import { MarkNotificationRead } from '../../usecase/notification/mark-notification-read.js';

// Controllers
import { PostController } from '../../interface/controllers/post-controller.js';
import { UserController } from '../../interface/controllers/user-controller.js';
import { StructureController } from '../../interface/controllers/structure-controller.js';
import { SocialController } from '../../interface/controllers/social-controller.js';
import { NotificationController } from '../../interface/controllers/notification-controller.js';

// HTTP
import type { AppDependencies } from '../http/app.js';
import type { JwtService } from '../http/middleware/auth-middleware.js';

/**
 * Container configuration
 */
export interface ContainerConfig {
  readonly jwtSecret?: string;
  readonly jwtExpiresInSeconds?: number;
  readonly refreshTokenExpiresInSeconds?: number;
  readonly useMockJwt?: boolean;
}

/**
 * Input for creating a user with credentials (for testing)
 */
export interface CreateUserWithCredentialsInput {
  readonly displayName: string;
  readonly email: string;
  readonly password: string;
}

/**
 * Container with all dependencies
 */
export interface Container {
  readonly repositories: {
    readonly user: InMemoryUserRepository;
    readonly userCredential: InMemoryUserCredentialRepository;
    readonly structure: InMemoryStructureRepository;
    readonly post: InMemoryPostRepository;
    readonly comment: InMemoryCommentRepository;
    readonly like: InMemoryLikeRepository;
    readonly follow: InMemoryFollowRepository;
    readonly notification: InMemoryNotificationRepository;
  };
  readonly gateways: {
    readonly email: MockEmailGateway;
    readonly sms: MockSmsGateway;
    readonly notification: MockNotificationGateway;
    readonly spamDetector: MockSpamDetectorGateway;
    readonly structureConverter: MockStructureConverterGateway;
    readonly rendererData: MockRendererDataGateway;
    readonly passwordHasher: PasswordHasherAdapter;
  };
  readonly appDependencies: AppDependencies;
  /**
   * Helper function to create a user with credentials for testing
   */
  readonly createUserWithCredentials: (input: CreateUserWithCredentialsInput) => Promise<void>;
}

// Domain imports for user creation helper
import { User } from '../../domain/entities/user.js';
import { Email } from '../../domain/value-objects/email.js';
import { AccountLevel } from '../../domain/value-objects/account-level.js';

/**
 * Development mode flag
 */
const IS_DEV = process.env.NODE_ENV !== 'production';

/**
 * Development user (must match auth-middleware.ts DEV_USER)
 */
const DEV_USER_ID = 'dev-user-001';
const DEV_USER_EMAIL = 'dev@example.com';
const DEV_USER_DISPLAY_NAME = 'Dev User';

/**
 * Create the dependency injection container
 */
export function createContainer(config: ContainerConfig = {}): Container {
  // Create repositories
  const userRepository = new InMemoryUserRepository();
  const userCredentialRepository = new InMemoryUserCredentialRepository();

  // In development mode, create dev user
  if (IS_DEV) {
    const devUser = User.create({
      id: DEV_USER_ID,
      displayName: DEV_USER_DISPLAY_NAME,
      email: Email.create(DEV_USER_EMAIL),
      accountLevel: AccountLevel.registered(),
      isEmailVerified: true,
      isPhoneVerified: false,
      linkedSns: [],
      pinnedPostIds: [],
      followerCount: 0,
      followingCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    // Intentionally using void to suppress the promise (sync initialization)
    void userRepository.save(devUser);
    console.log('[Dev] Created dev user:', DEV_USER_ID);
  }

  // Link credential repository to user repository for lookups
  userCredentialRepository.setUserRepository(userRepository);
  const structureRepository = new InMemoryStructureRepository();
  const postRepository = new InMemoryPostRepository();
  const commentRepository = new InMemoryCommentRepository();
  const likeRepository = new InMemoryLikeRepository();
  const followRepository = new InMemoryFollowRepository();
  const notificationRepository = new InMemoryNotificationRepository();

  // Create gateways
  const emailGateway = new MockEmailGateway();
  const smsGateway = new MockSmsGateway();
  const notificationGateway = new MockNotificationGateway();
  const spamDetectorGateway = new MockSpamDetectorGateway();
  const structureConverterGateway = new MockStructureConverterGateway();
  const rendererDataGateway = new MockRendererDataGateway();

  // Create password hasher
  const passwordHasher = new PasswordHasherAdapter();

  // JWT configuration - use the same secrets for both services
  const jwtSecret = config.jwtSecret ?? 'development-jwt-secret-key-32chars';
  const jwtExpiresIn = config.jwtExpiresInSeconds ?? 3600;
  const refreshExpiresIn = config.refreshTokenExpiresInSeconds ?? 604800;

  // Create JWT service port (for login usecase)
  const jwtServicePort = new JwtServiceAdapter({
    accessTokenSecret: jwtSecret,
    refreshTokenSecret: jwtSecret + '-refresh',
    accessTokenExpiresInSeconds: jwtExpiresIn,
    refreshTokenExpiresInSeconds: refreshExpiresIn,
  });

  // Create middleware JWT service
  // For mock mode (testing), accept test-token-{userId} format
  // For production, wrap jwtServicePort to ensure consistent verification
  const jwtService: JwtService = config.useMockJwt
    ? {
        async verify(token: string) {
          if (token.startsWith('test-token-')) {
            const userId = token.substring('test-token-'.length);
            return {
              sub: userId,
              email: `${userId}@test.com`,
              iat: Math.floor(Date.now() / 1000),
              exp: Math.floor(Date.now() / 1000) + 3600,
            };
          }
          return null;
        },
        async sign(payload: { sub: string; email: string }) {
          return `test-token-${payload.sub}`;
        },
      }
    : {
        async verify(token: string) {
          try {
            const decoded = await jwtServicePort.verifyAccessToken(token);
            return {
              sub: decoded.userId,
              email: decoded.email ?? '',
              iat: decoded.iat,
              exp: decoded.exp,
            };
          } catch {
            return null;
          }
        },
        async sign(payload: { sub: string; email: string }) {
          return jwtServicePort.generateAccessToken({
            userId: payload.sub,
            email: payload.email,
          });
        },
      };

  // Create usecases with positional arguments
  const registerUser = RegisterUser.create({
    userRepository,
    userCredentialRepository,
    passwordHasher,
    emailPort: emailGateway,
  });
  const loginUser = LoginUser.create(userCredentialRepository, passwordHasher, jwtServicePort);
  const verifyEmail = VerifyEmail.create(userRepository);
  const verifyPhone = VerifyPhone.create(userRepository);

  const createPost = CreatePost.create(postRepository, structureRepository, userRepository);
  const updatePost = UpdatePost.create(postRepository);
  const deletePost = DeletePost.create(postRepository, structureRepository);
  const searchPosts = SearchPosts.create(postRepository);
  const getPostDetail = GetPostDetail.create(postRepository);

  const uploadStructure = UploadStructure.create(
    structureRepository,
    structureConverterGateway
  );
  const downloadStructure = DownloadStructure.create(
    structureRepository,
    postRepository,
    userRepository,
    structureConverterGateway
  );
  const getRenderData = GetRenderData.create(
    structureRepository,
    rendererDataGateway
  );

  const likePost = LikePost.create(
    likeRepository,
    postRepository,
    notificationGateway
  );
  const unlikePost = UnlikePost.create(likeRepository, postRepository);
  const addComment = AddComment.create(
    commentRepository,
    postRepository,
    notificationGateway,
    spamDetectorGateway
  );
  const deleteComment = DeleteComment.create(commentRepository, postRepository);
  const followUser = FollowUser.create(
    followRepository,
    userRepository,
    notificationGateway
  );
  const unfollowUser = UnfollowUser.create(followRepository);

  const getNotifications = GetNotifications.create(notificationRepository);
  const markNotificationRead = MarkNotificationRead.create(notificationRepository);

  // Create controllers
  const postController = PostController.create({
    createPost,
    updatePost,
    deletePost,
    searchPosts,
    getPostDetail,
    userRepository,
    structureRepository,
  });

  const userController = UserController.create({
    registerUser,
    loginUser,
    verifyEmail,
    verifyPhone,
    userRepository,
  });

  const structureController = StructureController.create({
    uploadStructure,
    downloadStructure,
    getRenderData,
  });

  const socialController = SocialController.create({
    likePost,
    unlikePost,
    addComment,
    deleteComment,
    followUser,
    unfollowUser,
    userRepository,
    commentRepository,
  });

  const notificationController = NotificationController.create({
    getNotifications,
    markNotificationRead,
  });

  // Helper function to create user with credentials for testing
  let userIdCounter = 0;
  const createUserWithCredentials = async (input: CreateUserWithCredentialsInput): Promise<void> => {
    userIdCounter++;
    const now = new Date();
    const userId = `user-cred-${userIdCounter}`;

    const user = User.create({
      id: userId,
      displayName: input.displayName,
      email: Email.create(input.email),
      accountLevel: AccountLevel.registered(),
      isEmailVerified: true,
      isPhoneVerified: false,
      linkedSns: [],
      pinnedPostIds: [],
      followerCount: 0,
      followingCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    // Save to both repositories
    await userRepository.save(user);
    const hashedPassword = await passwordHasher.hash(input.password);
    await userCredentialRepository.saveWithCredentials(user, hashedPassword);
  };

  return {
    repositories: {
      user: userRepository,
      userCredential: userCredentialRepository,
      structure: structureRepository,
      post: postRepository,
      comment: commentRepository,
      like: likeRepository,
      follow: followRepository,
      notification: notificationRepository,
    },
    gateways: {
      email: emailGateway,
      sms: smsGateway,
      notification: notificationGateway,
      spamDetector: spamDetectorGateway,
      structureConverter: structureConverterGateway,
      rendererData: rendererDataGateway,
      passwordHasher,
    },
    appDependencies: {
      jwtService,
      postController,
      userController,
      structureController,
      socialController,
      notificationController,
    },
    createUserWithCredentials,
  };
}
