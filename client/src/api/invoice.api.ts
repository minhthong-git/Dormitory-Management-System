import axiosClient from './axiosClient';
import type { ApiResponse, PaginatedResponse, Invoice } from '@/types';

export interface RevenueStatItem {
  month: string;
  rentPaid: number;
  utilityPaid: number;
  rentPending: number;
  utilityPending: number;
  totalUnpaid: number;
}

export interface RevenueSummary {
  totalCollected: number;
  totalPending: number;
  totalOverdue: number;
}

export const invoiceApi = {
  getAll: (params?: { page?: number; limit?: number; status?: string; search?: string; billingMonth?: string }) =>
    axiosClient.get<PaginatedResponse<Invoice>>('/invoices', { params }),

  getById: (id: string) =>
    axiosClient.get<ApiResponse<Invoice>>(`/invoices/${id}`),

  create: (data: { contractId: string; amount: number; dueDate: string }) =>
    axiosClient.post<ApiResponse<Invoice>>('/invoices', data),

  pay: (id: string) =>
    axiosClient.patch<ApiResponse<Invoice>>(`/invoices/${id}/pay`),

  batchCreate: (data: { amount: number; dueDate: string }) =>
    axiosClient.post<ApiResponse<{ count: number }>>('/invoices/batch', data),

  delete: (id: string) =>
    axiosClient.delete<ApiResponse<null>>(`/invoices/${id}`),

  getRevenueStats: () =>
    axiosClient.get<ApiResponse<{ revenueStats: RevenueStatItem[]; summary: RevenueSummary }>>('/invoices/revenue/stats'),
};
