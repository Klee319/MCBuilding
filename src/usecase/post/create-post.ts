/**
 * CreatePost Usecase
 *
 * Creates a new post with an associated structure.
 */

import { Post } from '../../domain/entities/post.js';
import { Tag } from '../../domain/value-objects/tag.js';
import { Visibility } from '../../domain/value-objects/visibility.js';
import { UnlistedUrl } from '../../domain/value-objects/unlisted-url.js';
import type { PostRepositoryPort, StructureRepositoryPort, UserRepositoryPort } from '../ports/repository-ports.js';

export interface CreatePostInput {
  readonly title: string;
  readonly description?: string;
  readonly tags?: readonly string[];
  readonly visibility: 'public' | 'private' | 'unlisted';
  readonly structureId: string;
  readonly authorId: string;
  readonly requiredMods?: readonly string[];
  readonly unlistedExpiry?: Date;
}

export class CreatePostError extends Error {
  public override readonly name = 'CreatePostError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, CreatePostError.prototype);
  }
}

export class CreatePost {
  private readonly _postRepository: PostRepositoryPort;
  private readonly _structureRepository: StructureRepositoryPort;
  private readonly _userRepository: UserRepositoryPort;

  private constructor(
    postRepository: PostRepositoryPort,
    structureRepository: StructureRepositoryPort,
    userRepository: UserRepositoryPort
  ) {
    this._postRepository = postRepository;
    this._structureRepository = structureRepository;
    this._userRepository = userRepository;

    Object.freeze(this);
  }

  public static create(
    postRepository: PostRepositoryPort,
    structureRepository: StructureRepositoryPort,
    userRepository: UserRepositoryPort
  ): CreatePost {
    return new CreatePost(postRepository, structureRepository, userRepository);
  }

  public async execute(input: CreatePostInput): Promise<Post> {
    this.validateInput(input);

    const { title, description, tags, visibility, structureId, authorId, requiredMods, unlistedExpiry } = input;

    // Verify author exists
    const author = await this._userRepository.findById(authorId);
    if (!author) {
      throw new CreatePostError('Author not found');
    }

    // Verify structure exists
    const structure = await this._structureRepository.findById(structureId);
    if (!structure) {
      throw new CreatePostError('Structure not found');
    }

    // Create visibility value object
    const visibilityVO = this.createVisibility(visibility);

    // Create unlisted URL if needed
    const unlistedUrl = visibilityVO.isUnlisted()
      ? UnlistedUrl.generate(unlistedExpiry ?? null)
      : null;

    // Create tags
    const tagVOs = (tags ?? []).map(t => Tag.create(t));

    // Create the post
    const now = new Date();
    const post = Post.create({
      id: this.generatePostId(),
      authorId,
      structureId,
      title,
      description: description ?? '',
      tags: tagVOs,
      visibility: visibilityVO,
      unlistedUrl,
      requiredMods: requiredMods ?? [],
      likeCount: 0,
      downloadCount: 0,
      commentCount: 0,
      isPinned: false,
      createdAt: now,
      updatedAt: now,
    });

    return this._postRepository.save(post);
  }

  private validateInput(input: CreatePostInput): void {
    if (!input.title || input.title.trim().length === 0) {
      throw new CreatePostError('title cannot be empty');
    }
    if (!input.structureId || input.structureId.trim().length === 0) {
      throw new CreatePostError('structureId cannot be empty');
    }
    if (!input.authorId || input.authorId.trim().length === 0) {
      throw new CreatePostError('authorId cannot be empty');
    }
  }

  private createVisibility(value: 'public' | 'private' | 'unlisted'): Visibility {
    switch (value) {
      case 'public':
        return Visibility.public();
      case 'private':
        return Visibility.private();
      case 'unlisted':
        return Visibility.unlisted();
    }
  }

  private generatePostId(): string {
    return `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
