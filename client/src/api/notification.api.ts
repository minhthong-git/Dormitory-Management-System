import axiosClient from './axiosClient';
import type { ApiResponse, PaginatedResponse } from '@/types';

// ── Notification Types ─────────────────────────────────────────
export interface Notification {
  id: string;
  userId: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  isRead: boolean;
  referenceId?: string;
  referenceType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UnreadCountResponse {
  count: number;
}

// ── API Calls ──────────────────────────────────────────────────
export const notificationApi = {
  // Lấy danh sách thông báo (có phân trang + filter)
  getAll: (params?: { page?: number; limit?: number; isRead?: boolean }) =>
    axiosClient.get<PaginatedResponse<Notification>>('/notifications', { params }),

  // Đếm chưa đọc
  getUnreadCount: () =>
    axiosClient.get<ApiResponse<UnreadCountResponse>>('/notifications/unread-count'),

  // Đánh dấu 1 thông báo đã đọc
  markAsRead: (id: string) =>
    axiosClient.patch<ApiResponse<null>>(`/notifications/${id}/read`),

  // Đánh dấu tất cả đã đọc
  markAllAsRead: () =>
    axiosClient.patch<ApiResponse<null>>('/notifications/read-all'),

  // Xóa 1 thông báo
  delete: (id: string) =>
    axiosClient.delete<ApiResponse<null>>(`/notifications/${id}`),
};
