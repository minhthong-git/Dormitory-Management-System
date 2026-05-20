import axiosClient from './axiosClient';
import type { ApiResponse, PaginatedResponse, Invoice } from '@/types';

export const invoiceApi = {
  getAll: (params?: { page?: number; limit?: number; status?: string }) =>
    axiosClient.get<PaginatedResponse<Invoice>>('/invoices', { params }),

  create: (data: { contractId: string; amount: number; dueDate: string }) =>
    axiosClient.post<ApiResponse<Invoice>>('/invoices', data),

  pay: (id: string) =>
    axiosClient.patch<ApiResponse<Invoice>>(`/invoices/${id}/pay`),

  batchCreate: (data: { amount: number; dueDate: string }) =>
    axiosClient.post<ApiResponse<{ count: number }>>('/invoices/batch', data),
};
