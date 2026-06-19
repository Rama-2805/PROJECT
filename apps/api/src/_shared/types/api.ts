/* ─── API Response Types ────────────────────────────────────────── */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthTokens extends ApiResponse {
  data: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export interface UserProfile {
  id: string;
  institutionId: string;
  fullName: string;
  email: string;
  profileImage: string | null;
  isActive: boolean;
  lastLogin: string | null;
  roles: string[];
  institution: {
    id: string;
    name: string;
    slug: string;
    plan: string;
  };
  createdAt: string;
}

export interface AuthUserResponse {
  user: UserProfile;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}
