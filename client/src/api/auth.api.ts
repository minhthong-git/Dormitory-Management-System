import axiosClient from './axiosClient';
import type { AuthResponse, LoginPayload, RegisterPayload, ApiResponse, User } from '@/types';

export const authApi = {
  login: (payload: LoginPayload) =>
    axiosClient.post<ApiResponse<AuthResponse>>('/auth/login', payload),

  register: (payload: RegisterPayload) =>
    axiosClient.post<ApiResponse<AuthResponse>>('/auth/register', payload),

  logout: () => axiosClient.post<ApiResponse<null>>('/auth/logout'),

  refreshToken: (refreshToken: string) =>
    axiosClient.post<{ accessToken: string }>('/auth/refresh', { refreshToken }),

  getMe: () => axiosClient.get<ApiResponse<User>>('/auth/me'),
};
