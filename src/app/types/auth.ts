import type { AvatarId, UpdateProfileData, BannerType } from './profile';

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatar: AvatarId;
  avatarUrl?: string;
  bannerType: BannerType;
  bannerColorStart: string;
  bannerColorEnd: string;
  bannerUrl?: string;
  bannerPosY: number;
  createdAt: string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
  uploadAvatar: (file: File) => Promise<string>;
  uploadBanner: (file: File) => Promise<string>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
}
