import axiosClient from './axiosClient';
import type { ApiResponse, PaginatedResponse, Contract } from '@/types';

export interface CreateContractPayload {
  studentId: string;
  bedId: string;
  startDate: string;
  endDate: string;
  price?: number;
  deposit?: number;
  monthlyFee?: number;
}

export interface TransferBedPayload {
  studentId: string;
  newBedId: string;
  reason?: string;
}

export const contractApi = {
  getAll: (params?: { page?: number; limit?: number; status?: string }) =>
    axiosClient.get<PaginatedResponse<Contract>>('/contracts', { params }),

  getById: (id: string) =>
    axiosClient.get<ApiResponse<Contract>>(`/contracts/${id}`),

  create: (data: CreateContractPayload) =>
    axiosClient.post<ApiResponse<Contract>>('/contracts', data),

  book: (data: { bedId: string; startDate?: string; endDate?: string }) =>
    axiosClient.post<ApiResponse<Contract>>('/contracts/book', data),

  approve: (id: string) =>
    axiosClient.patch<ApiResponse<Contract>>(`/contracts/${id}/approve`),

  reject: (id: string) =>
    axiosClient.patch<ApiResponse<Contract>>(`/contracts/${id}/reject`),

  terminate: (id: string) =>
    axiosClient.patch<ApiResponse<Contract>>(`/contracts/${id}/terminate`),

  checkIn: (data: { studentId: string; bedId: string }) =>
    axiosClient.post<ApiResponse<Contract>>('/contracts/check-in', data),

  checkOut: (data: { contractId: string }) =>
    axiosClient.post<ApiResponse<Contract>>('/contracts/check-out', data),

  transfer: (data: TransferBedPayload) =>
    axiosClient.post<ApiResponse<Contract>>('/contracts/transfer', data),

  update: (id: string, payload: Partial<CreateContractPayload>) =>
    axiosClient.put<ApiResponse<Contract>>(`/contracts/${id}`, payload),

  extend: (id: string, endDate: string) =>
    axiosClient.patch<ApiResponse<Contract>>(`/contracts/${id}/extend`, { endDate }),

  delete: (id: string) =>
    axiosClient.delete<ApiResponse<null>>(`/contracts/${id}`),
};
export default contractApi;
