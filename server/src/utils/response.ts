import type { Response } from 'express';
import type { ApiResponse, PaginatedResponse } from '@/types';

// Trả về response chuẩn thành công
export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200
): Response => {
  const body: ApiResponse<T> = { success: true, message, data };
  return res.status(statusCode).json(body);
};

// Trả về response lỗi chuẩn
export const sendError = (
  res: Response,
  message: string,
  statusCode = 500,
  errors?: Record<string, string>
): Response => {
  return res.status(statusCode).json({ success: false, message, errors });
};

// Trả về response danh sách có pagination
export const sendPaginated = <T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number,
  message = 'Success'
): Response => {
  const body: PaginatedResponse<T> = {
    success: true,
    message,
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
  return res.status(200).json(body);
};
