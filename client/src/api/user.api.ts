import axiosClient from './axiosClient';
import type { ApiResponse, PaginatedResponse, User } from '@/types';

export const userApi = {
  getAll: (params?: { page?: number; limit?: number; role?: string; search?: string }) =>
    axiosClient.get<PaginatedResponse<User>>('/users', { params }),

  getById: (id: string) =>
    axiosClient.get<ApiResponse<User>>(`/users/${id}`),

  update: (id: string, data: { fullName?: string; phone?: string }) =>
    axiosClient.put<ApiResponse<User>>(`/users/${id}`, data),

  delete: (id: string) =>
    axiosClient.delete<ApiResponse<null>>(`/users/${id}`),

  resetPassword: (id: string, newPassword: string) =>
    axiosClient.patch<ApiResponse<null>>(`/users/${id}/password`, { newPassword }),
};
