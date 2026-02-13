/**
 * FollowUser Usecase
 *
 * Allows a user to follow another user. Idempotent operation.
 */

import { Follow } from '../../domain/entities/follow.js';
import type { FollowRepositoryPort, UserRepositoryPort } from '../ports/repository-ports.js';
import type { NotificationPort } from '../ports/gateway-ports.js';

export interface FollowUserInput {
  readonly followerId: string;
  readonly followeeId: string;
}

export class FollowUserError extends Error {
  public override readonly name = 'FollowUserError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, FollowUserError.prototype);
  }
}

export class FollowUser {
  private readonly _followRepository: FollowRepositoryPort;
  private readonly _userRepository: UserRepositoryPort;
  private readonly _notificationPort: NotificationPort;

  private constructor(
    followRepository: FollowRepositoryPort,
    userRepository: UserRepositoryPort,
    notificationPort: NotificationPort
  ) {
    this._followRepository = followRepository;
    this._userRepository = userRepository;
    this._notificationPort = notificationPort;

    Object.freeze(this);
  }

  public static create(
    followRepository: FollowRepositoryPort,
    userRepository: UserRepositoryPort,
    notificationPort: NotificationPort
  ): FollowUser {
    return new FollowUser(followRepository, userRepository, notificationPort);
  }

  public async execute(input: FollowUserInput): Promise<void> {
    this.validateInput(input);

    const { followerId, followeeId } = input;

    // Cannot follow yourself
    if (followerId === followeeId) {
      throw new FollowUserError('Cannot follow yourself');
    }

    // Check if followee exists
    const followee = await this._userRepository.findById(followeeId);
    if (!followee) {
      throw new FollowUserError('User not found');
    }

    // Check if already following (idempotent)
    const existingFollow = await this._followRepository.findByFollowerAndFollowee(followerId, followeeId);
    if (existingFollow) {
      return; // Already following
    }

    // Create the follow
    const follow = Follow.create({
      id: this.generateFollowId(followerId, followeeId),
      followerId,
      followeeId,
      createdAt: new Date(),
    });

    await this._followRepository.save(follow);

    // Send notification to followee
    await this._notificationPort.notify(followeeId, {
      type: 'follow',
      title: 'New follower',
      body: 'Someone started following you',
      actionUrl: `/users/${followerId}`,
      metadata: { followerId },
    });
  }

  private validateInput(input: FollowUserInput): void {
    if (!input.followerId || input.followerId.trim().length === 0) {
      throw new FollowUserError('followerId cannot be empty');
    }
    if (!input.followeeId || input.followeeId.trim().length === 0) {
      throw new FollowUserError('followeeId cannot be empty');
    }
  }

  private generateFollowId(followerId: string, followeeId: string): string {
    return `follow-${followerId}-${followeeId}-${Date.now()}`;
  }
}
