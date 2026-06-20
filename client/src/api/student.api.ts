import axiosClient from './axiosClient';
import type { ApiResponse, PaginatedResponse, Student } from '@/types';

export interface StudentFilters {
  page?: number;
  limit?: number;
  fullName?: string;
  name?: string;
  studentCode?: string;
  status?: string;
}

export const studentApi = {
  getAll: (params?: StudentFilters) =>
    axiosClient.get<PaginatedResponse<Student>>('/students', { params }),

  getById: (id: string) =>
    axiosClient.get<ApiResponse<Student>>(`/students/${id}`),

  create: (data: Partial<Student>) =>
    axiosClient.post<ApiResponse<Student>>('/students', data),

  update: (id: string, data: Partial<Student>) =>
    axiosClient.put<ApiResponse<Student>>(`/students/${id}`, data),

  delete: (id: string) =>
    axiosClient.delete<ApiResponse<null>>(`/students/${id}`),
};
