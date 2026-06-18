import axiosClient from './axiosClient';
import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  ApiResponse,
  User,
  UpdateProfilePayload,
  ChangePasswordPayload,
  ForgotPasswordPayload,
  ResetPasswordPayload
} from '@/types';

export const authApi = {
  login: (payload: LoginPayload) =>
    axiosClient.post<ApiResponse<AuthResponse>>('/auth/login', payload),

  register: (payload: RegisterPayload) =>
    axiosClient.post<ApiResponse<{ email: string }>>('/auth/register', payload),

  verifyEmail: (payload: { email: string; otp: string }) =>
    axiosClient.post<ApiResponse<null>>('/auth/verify-email', payload),

  logout: () => axiosClient.post<ApiResponse<null>>('/auth/logout'),

  refreshToken: (refreshToken: string) =>
    axiosClient.post<{ accessToken: string }>('/auth/refresh', { refreshToken }),

  getMe: () => axiosClient.get<ApiResponse<User>>('/auth/me'),

  updateProfile: (payload: UpdateProfilePayload) =>
    axiosClient.put<ApiResponse<User>>('/auth/me', payload),

  changePassword: (payload: ChangePasswordPayload) =>
    axiosClient.patch<ApiResponse<null>>('/auth/me/password', payload),

  forgotPassword: (payload: ForgotPasswordPayload) =>
    axiosClient.post<ApiResponse<null>>('/auth/forgot-password', payload),

  resetPassword: (payload: ResetPasswordPayload) =>
    axiosClient.post<ApiResponse<null>>('/auth/reset-password', payload),
};

