/**
 * Social Usecases Index
 *
 * Exports all social interaction usecases.
 */

export { LikePost, LikePostError, type LikePostInput } from './like-post.js';
export { UnlikePost, UnlikePostError, type UnlikePostInput } from './unlike-post.js';
export { AddComment, AddCommentError, type AddCommentInput } from './add-comment.js';
export { DeleteComment, DeleteCommentError, type DeleteCommentInput } from './delete-comment.js';
export { FollowUser, FollowUserError, type FollowUserInput } from './follow-user.js';
export { UnfollowUser, UnfollowUserError, type UnfollowUserInput } from './unfollow-user.js';
