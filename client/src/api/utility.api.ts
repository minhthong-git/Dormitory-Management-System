import axiosClient from './axiosClient';
import type { ApiResponse, PaginatedResponse, UtilityReading } from '@/types';

export interface RoomWithLatestReading {
  id: string;
  roomNumber: string;
  pricePerMonth: number;
  status: string;
  lastReading: {
    electricityEnd: number;
    waterEnd: number;
    billingMonth: string;
  } | null;
}

export const utilityApi = {
  getAll: (params?: { page?: number; limit?: number; roomId?: string }) =>
    axiosClient.get<PaginatedResponse<UtilityReading>>('/utility-readings', { params }),

  getLatest: () =>
    axiosClient.get<ApiResponse<RoomWithLatestReading[]>>('/utility-readings/rooms/latest'),

  create: (data: {
    roomId: string;
    billingMonth: string;
    electricityStart: number;
    electricityEnd: number;
    waterStart: number;
    waterEnd: number;
    electricityRate?: number;
    waterRate?: number;
  }) =>
    axiosClient.post<ApiResponse<{ reading: UtilityReading; invoice: any }>>('/utility-readings', data),
};
