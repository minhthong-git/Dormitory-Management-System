import axiosClient from './axiosClient';
import type { ApiResponse, PaginatedResponse, Contract } from '@/types';

export interface CreateContractPayload {
  userId: string;
  roomId: string;
  startDate: string;
  endDate: string;
}

export const contractApi = {
  getAll: (params?: { page?: number; limit?: number; status?: string }) =>
    axiosClient.get<PaginatedResponse<Contract>>('/contracts', { params }),

  getById: (id: string) =>
    axiosClient.get<ApiResponse<Contract>>(`/contracts/${id}`),

  create: (data: CreateContractPayload) =>
    axiosClient.post<ApiResponse<Contract>>('/contracts', data),

  terminate: (id: string) =>
    axiosClient.patch<ApiResponse<Contract>>(`/contracts/${id}/terminate`),
};
