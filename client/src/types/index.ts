// ============================================================
// Core Entity Types
// ============================================================

export type Role = 'STUDENT' | 'STAFF' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  studentId?: string;
  phone?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Room {
  id: string;
  roomNumber: string;
  floor: number;
  capacity: number;
  currentOccupancy: number;
  type: 'SINGLE' | 'DOUBLE' | 'QUAD';
  status: 'AVAILABLE' | 'FULL' | 'MAINTENANCE';
  pricePerMonth: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contract {
  id: string;
  userId: string;
  roomId: string;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
  createdAt: string;
  user?: Pick<User, 'id' | 'fullName' | 'email' | 'studentId'>;
  room?: Pick<Room, 'id' | 'roomNumber' | 'type' | 'floor' | 'pricePerMonth'>;
  invoices?: Invoice[];
}

export interface Invoice {
  id: string;
  contractId: string;
  amount: number;
  dueDate: string;
  paidAt?: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  createdAt: string;
  contract?: Contract;
}

// ============================================================
// Auth Types
// ============================================================

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  studentId?: string;
  phone?: string;
}

// ============================================================
// API Response Wrappers
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string>;
}

// ============================================================
// Payload Types
// ============================================================

export interface UpdateProfilePayload {
  fullName: string;
  phone?: string;
  avatarUrl?: string;
}

export interface ChangePasswordPayload {
  oldPassword?: string;
  newPassword?: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  email: string;
  otp: string;
  newPassword?: string;
}

