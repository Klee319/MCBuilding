import type { UserSummary } from './user';
import type { StructureSummary } from './structure';

export interface PostOutput {
  id: string;
  title: string;
  description: string | null;
  tags: string[];
  requiredMods: string[];
  visibility: 'public' | 'unlisted' | 'private';
  unlistedUrl: string | null;
  structure: StructureSummary;
  author: UserSummary;
  likeCount: number;
  downloadCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PostSummary {
  id: string;
  title: string;
  structure: {
    id: string;
    originalEdition: 'java' | 'bedrock';
    originalVersion: string;
    dimensions: { x: number; y: number; z: number };
  };
  author: UserSummary;
  likeCount: number;
  downloadCount: number;
}

export interface PostFilters {
  keyword?: string;
  edition?: string[];
  version?: string[];
  tag?: string;
  page?: number;
  limit?: number;
  sortBy?: 'popular' | 'newest' | 'downloads';
}

export interface CommentOutput {
  id: string;
  content: string;
  author: UserSummary;
  createdAt: string;
  replies?: CommentOutput[];
}
