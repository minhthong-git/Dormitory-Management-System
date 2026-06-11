import axiosClient from './axiosClient';
import type { ApiResponse, PaginatedResponse, Room } from '@/types';

export interface RoomFilters {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
}

export interface CreateRoomPayload {
  roomNumber: string;
  floor: number;
  capacity: number;
  type: 'SINGLE' | 'DOUBLE' | 'QUAD';
  pricePerMonth: number;
  description?: string;
}

export const roomApi = {
  getAll: (params?: RoomFilters) =>
    axiosClient.get<PaginatedResponse<Room>>('/rooms', { params }),

  getById: (id: string) =>
    axiosClient.get<ApiResponse<Room>>(`/rooms/${id}`),

  create: (data: CreateRoomPayload) =>
    axiosClient.post<ApiResponse<Room>>('/rooms', data),

  update: (id: string, data: Partial<CreateRoomPayload> & { status?: string }) =>
    axiosClient.put<ApiResponse<Room>>(`/rooms/${id}`, data),

  delete: (id: string) =>
    axiosClient.delete<ApiResponse<null>>(`/rooms/${id}`),
};
