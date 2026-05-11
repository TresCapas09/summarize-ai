/** Available preset gradient avatars */
export type AvatarId =
  | 'gradient-blue'
  | 'gradient-purple'
  | 'gradient-pink'
  | 'gradient-orange'
  | 'gradient-green'
  | 'gradient-teal';

/** Banner display types */
export type BannerType = 'color' | 'image';

/** User profile metadata */
export interface UserProfile {
  userId: string;
  displayName: string;
  email: string;
  avatar: AvatarId;
  avatarUrl?: string;
  bannerType: BannerType;
  bannerColorStart: string;
  bannerColorEnd: string;
  bannerUrl?: string;
  bannerPosY: number;
  createdAt: string;
}

/** Data that can be updated in a profile */
export interface UpdateProfileData {
  displayName?: string;
  avatar?: AvatarId;
  avatarUrl?: string | null;
  bannerType?: BannerType;
  bannerColorStart?: string;
  bannerColorEnd?: string;
  bannerUrl?: string | null;
  bannerPosY?: number;
}

/** User statistics */
export interface UserStats {
  summariesGenerated: number;
  totalTimeSaved: number; // in minutes
  totalWordsProcessed: number;
  averageCompression: number;
}
