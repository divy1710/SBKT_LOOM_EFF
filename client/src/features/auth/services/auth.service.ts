import apiClient from '@/lib/axios';
import type { AuthUser, LoginFormData } from '../types/auth.types';
import type { ApiSuccessResponse } from '@/types/index';

interface AuthResponse {
  user: AuthUser;
}

export const authService = {
  async login(data: LoginFormData): Promise<AuthUser> {
    const res = await apiClient.post<ApiSuccessResponse<AuthResponse>>('/auth/login', data);
    return res.data.data.user;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  async me(): Promise<AuthUser> {
    const res = await apiClient.get<ApiSuccessResponse<AuthResponse>>('/auth/me');
    return res.data.data.user;
  },
};
