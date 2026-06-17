import { Request } from 'express';

// ── JWT Payload ────────────────────────────────────────────────
export interface JwtPayload {
  sub: string;   // user id
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// ── User Role (phải khớp với giá trị String trong DB) ─────────
export type UserRole = 'STUDENT' | 'STAFF' | 'ADMIN';

// ── Room enums (string literals, không phải Prisma enum) ───────
export type RoomType = 'SINGLE' | 'DOUBLE' | 'QUAD';
export type RoomStatus = 'AVAILABLE' | 'FULL' | 'MAINTENANCE';
export type ContractStatus = 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
export type InvoiceStatus = 'PENDING' | 'PAID' | 'OVERDUE';

// ── API Response ───────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T = unknown> {
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

// ── Extended Express Request (after auth middleware) ───────────
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export * from './dto';

