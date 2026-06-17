import axiosClient from './axiosClient';
import type { ApiResponse, PaginatedResponse, Bed } from '@/types';

export interface BedFilters {
  page?: number;
  limit?: number;
  roomId?: string;
  status?: string;
}

export const bedApi = {
  getAll: (params?: BedFilters) =>
    axiosClient.get<PaginatedResponse<Bed>>('/beds', { params }),

  getById: (id: string) =>
    axiosClient.get<ApiResponse<Bed>>(`/beds/${id}`),

  create: (data: Partial<Bed>) =>
    axiosClient.post<ApiResponse<Bed>>('/beds', data),

  update: (id: string, data: Partial<Bed>) =>
    axiosClient.put<ApiResponse<Bed>>(`/beds/${id}`, data),

  delete: (id: string) =>
    axiosClient.delete<ApiResponse<null>>(`/beds/${id}`),
};
