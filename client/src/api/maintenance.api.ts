import axiosClient from './axiosClient';
import type { ApiResponse, PaginatedResponse, MaintenanceRequest } from '@/types';

export interface MaintenanceFilters {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  roomId?: string;
  staffId?: string;
}

export interface CreateMaintenancePayload {
  title: string;
  description: string;
  damageSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assetId?: string | null;
}

export const maintenanceApi = {
  getAll: (params?: MaintenanceFilters) =>
    axiosClient.get<PaginatedResponse<MaintenanceRequest>>('/maintenance', { params }),

  getMyRequests: (params?: { page?: number; limit?: number }) =>
    axiosClient.get<PaginatedResponse<MaintenanceRequest>>('/maintenance/my-requests', { params }),

  create: (data: CreateMaintenancePayload) =>
    axiosClient.post<ApiResponse<MaintenanceRequest>>('/maintenance', data),

  assign: (id: string, staffId: string) =>
    axiosClient.patch<ApiResponse<MaintenanceRequest>>(`/maintenance/${id}/assign`, { staffId }),

  updateStatus: (id: string, data: { status: string; notes?: string }) =>
    axiosClient.patch<ApiResponse<MaintenanceRequest>>(`/maintenance/${id}/status`, data),
};
