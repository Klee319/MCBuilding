/**
 * UnfollowUser Usecase
 *
 * Allows a user to unfollow another user. Idempotent operation.
 */

import type { FollowRepositoryPort } from '../ports/repository-ports.js';

export interface UnfollowUserInput {
  readonly followerId: string;
  readonly followeeId: string;
}

export class UnfollowUserError extends Error {
  public override readonly name = 'UnfollowUserError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, UnfollowUserError.prototype);
  }
}

export class UnfollowUser {
  private readonly _followRepository: FollowRepositoryPort;

  private constructor(followRepository: FollowRepositoryPort) {
    this._followRepository = followRepository;

    Object.freeze(this);
  }

  public static create(followRepository: FollowRepositoryPort): UnfollowUser {
    return new UnfollowUser(followRepository);
  }

  public async execute(input: UnfollowUserInput): Promise<void> {
    this.validateInput(input);

    const { followerId, followeeId } = input;

    // Check if follow exists (idempotent)
    const existingFollow = await this._followRepository.findByFollowerAndFollowee(followerId, followeeId);
    if (!existingFollow) {
      return; // Not following - do nothing
    }

    // Delete the follow
    await this._followRepository.delete(followerId, followeeId);
  }

  private validateInput(input: UnfollowUserInput): void {
    if (!input.followerId || input.followerId.trim().length === 0) {
      throw new UnfollowUserError('followerId cannot be empty');
    }
    if (!input.followeeId || input.followeeId.trim().length === 0) {
      throw new UnfollowUserError('followeeId cannot be empty');
    }
  }
}
