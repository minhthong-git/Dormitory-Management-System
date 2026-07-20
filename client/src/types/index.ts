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
  student?: {
    gender?: string;
    status?: string;
    faculty?: string;
    major?: string;
    course?: string;
    dateOfBirth?: string;
  };
}

export interface Student {
  id: string;
  userId?: string;
  studentCode: string;
  fullName: string;
  gender: string;
  dateOfBirth?: string;
  phone?: string;
  email: string;
  faculty?: string;
  major?: string;
  course?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Room {
  id: string;
  roomNumber: string;
  floor: number;
  capacity: number;
  currentOccupancy: number;
  type: 'SMALL' | 'STANDARD' | 'LARGE';
  genderType: 'MALE' | 'FEMALE' | 'MIXED';
  status: 'AVAILABLE' | 'FULL' | 'MAINTENANCE';
  pricePerMonth: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
  building?: { name: string };
  beds?: Bed[];
}

export interface Bed {
  id: string;
  roomId: string;
  bedNumber: number;
  bedType: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED';
  room?: Room;
  contracts?: Contract[];
}

export interface Contract {
  id: string;
  studentId: string;
  bedId: string;
  startDate: string;
  endDate: string;
  price: number;
  deposit: number;
  monthlyFee: number;
  status: 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'PENDING' | 'AWAITING_PAYMENT' | 'REJECTED';
  renewalStatus: 'NONE' | 'PRIORITY' | 'EXPIRED_PRIORITY' | 'RENEWED';
  createdAt: string;
  updatedAt: string;
  student?: Student;
  bed?: Bed;
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
  gender?: string;
  dateOfBirth?: string;
  major?: string;
  faculty?: string;
  course?: string;
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

// ============================================================
// Asset & Maintenance Types
// ============================================================

export interface Asset {
  id: string;
  name: string;
  code: string;
  type: string;
  status: 'GOOD' | 'DAMAGED' | 'REPAIRING' | 'REPLACED' | string;
  description?: string;
  roomId: string;
  createdAt: string;
  updatedAt: string;
  room?: {
    roomNumber: string;
    building?: { name: string };
  };
}

export interface MaintenanceRequest {
  id: string;
  roomId: string;
  assetId?: string;
  studentId: string;
  title: string;
  description: string;
  status: 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  staffId?: string;
  notes?: string;
  resolvedAt?: string;
  rating?: number;
  feedback?: string;
  createdAt: string;
  updatedAt: string;
  room?: { roomNumber: string };
  asset?: { name: string; code: string };
  student?: { fullName: string; phone?: string };
  staff?: { fullName: string; phone?: string };
}

export interface UtilityReading {
  id: string;
  roomId: string;
  billingMonth: number;
  billingYear: number;
  previousElectric: number;
  currentElectric: number;
  electricUsed: number;
  previousWater: number;
  currentWater: number;
  waterUsed: number;
  electricPrice: number;
  waterPrice: number;
  createdAt: string;
  updatedAt: string;
  room?: Room;
}

export interface PaymentTransaction {
  id: string;
  invoiceId: string;
  userId: string;
  provider: string;
  providerTransactionId?: string;
  orderCode: number;
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'EXPIRED';
  paymentUrl?: string;
  checkoutUrl?: string;
  qrCode?: string;
  expiredAt?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

