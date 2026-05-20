import { Request, Response, NextFunction } from 'express';
import { env } from '@/config/env';

// ── AppError class ─────────────────────────────────────────────
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public errors?: Record<string, string>
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

// ── Global error handler middleware ───────────────────────────
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Known operational error
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors && { errors: err.errors }),
    });
    return;
  }

  // Multer errors
  if (err.name === 'MulterError') {
    res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    return;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn' });
    return;
  }

  // Unhandled errors — log only in dev
  if (env.isDev) {
    console.error('[ERROR]', err);
  }

  res.status(500).json({
    success: false,
    message: env.isDev ? err.message : 'Đã xảy ra lỗi phía máy chủ',
  });
};

// ── 404 handler ────────────────────────────────────────────────
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route không tồn tại: ${req.method} ${req.originalUrl}`,
  });
};
