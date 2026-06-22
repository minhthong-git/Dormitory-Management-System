import axiosClient from './axiosClient';
import type { ApiResponse, PaginatedResponse, Asset } from '@/types';

export interface AssetFilters {
  page?: number;
  limit?: number;
  roomId?: string;
  status?: string;
  type?: string;
  search?: string;
}

export interface CreateAssetPayload {
  name: string;
  code: string;
  type: string;
  status?: string;
  description?: string;
  roomId: string;
}

export const assetApi = {
  getAll: (params?: AssetFilters) =>
    axiosClient.get<PaginatedResponse<Asset>>('/assets', { params }),

  getMyRoomAssets: () =>
    axiosClient.get<ApiResponse<Asset[]>>('/assets/my-room'),

  getById: (id: string) =>
    axiosClient.get<ApiResponse<Asset>>(`/assets/${id}`),

  create: (data: CreateAssetPayload) =>
    axiosClient.post<ApiResponse<Asset>>('/assets', data),

  update: (id: string, data: Partial<CreateAssetPayload> & { status?: string }) =>
    axiosClient.put<ApiResponse<Asset>>(`/assets/${id}`, data),

  delete: (id: string) =>
    axiosClient.delete<ApiResponse<null>>(`/assets/${id}`),
};
