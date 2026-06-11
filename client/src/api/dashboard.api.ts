import axiosClient from './axiosClient';
import type { ApiResponse } from '@/types';

// ── Response types ─────────────────────────────────────────────

export interface AdminDashboardStats {
  role: 'ADMIN';
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  totalStudents: number;
  activeContracts: number;
  pendingInvoices: number;
  overdueInvoices: number;
  monthlyRevenue: number;
}

export interface StudentDashboardStats {
  role: 'STUDENT';
  activeContract: {
    id: string;
    status: string;
    startDate: string;
    endDate: string;
    room: {
      roomNumber: string;
      type: string;
      floor: number;
      pricePerMonth: number;
    } | null;
  } | null;
  myRoom: {
    roomNumber: string;
    type: string;
    floor: number;
    pricePerMonth: number;
  } | null;
  contractStatus: string | null;
  pendingInvoices: number;
  overdueInvoices: number;
}

export type DashboardStats = AdminDashboardStats | StudentDashboardStats;

// ── API ────────────────────────────────────────────────────────
export const dashboardApi = {
  getStats: () =>
    axiosClient.get<ApiResponse<DashboardStats>>('/dashboard/stats'),
};
