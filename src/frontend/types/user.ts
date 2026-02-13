export interface UserOutput {
  id: string;
  email: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  postCount: number;
  followerCount: number;
  followingCount: number;
  createdAt: string;
}

export interface UserSummary {
  id: string;
  displayName: string;
  avatarUrl?: string;
}
