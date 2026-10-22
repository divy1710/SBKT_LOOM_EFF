import apiClient from '@/lib/axios';
import type { AuthUser, LoginFormData } from '../types/auth.types';
import type { ApiSuccessResponse } from '@/types/index';

interface AuthResponse {
  user: AuthUser;
  token?: string;
}

export const authService = {
  async login(data: LoginFormData): Promise<AuthUser> {
    const res = await apiClient.post<ApiSuccessResponse<AuthResponse>>('/auth/login', data);
    if (res.data.data.token) {
      localStorage.setItem('sbkt_token', res.data.data.token);
    }
    return res.data.data.user;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      localStorage.removeItem('sbkt_token');
    }
  },

  async me(): Promise<AuthUser> {
    const res = await apiClient.get<ApiSuccessResponse<AuthResponse>>('/auth/me');
    return res.data.data.user;
  },
};
