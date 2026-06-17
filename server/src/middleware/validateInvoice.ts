import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/middleware/errorHandler';

// Helper to run validations and throw on error
export const validateResult = (req: Request, _res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMap: Record<string, string> = {};
    errors.array().forEach((err: any) => {
      errorMap[err.path || err.param] = err.msg;
    });
    next(new AppError('Dữ liệu đầu vào không hợp lệ', 400, errorMap));
    return;
  }
  next();
};

export const validateCreateInvoice = [
  body('roomId')
    .notEmpty()
    .withMessage('Mã phòng không được để trống')
    .isString()
    .withMessage('Mã phòng phải là chuỗi ký tự'),
  body('contractId')
    .optional()
    .isString()
    .withMessage('Mã hợp đồng phải là chuỗi ký tự'),
  body('billingMonth')
    .notEmpty()
    .withMessage('Tháng hóa đơn không được để trống')
    .isInt({ min: 1, max: 12 })
    .withMessage('Tháng hóa đơn phải từ 1 đến 12'),
  body('billingYear')
    .notEmpty()
    .withMessage('Năm hóa đơn không được để trống')
    .isInt({ min: 2000, max: 2100 })
    .withMessage('Năm hóa đơn không hợp lệ'),
  body('roomFee')
    .notEmpty()
    .withMessage('Tiền phòng không được để trống')
    .isFloat({ min: 0 })
    .withMessage('Tiền phòng phải là số lớn hơn hoặc bằng 0'),
  body('electricityFee')
    .notEmpty()
    .withMessage('Tiền điện không được để trống')
    .isFloat({ min: 0 })
    .withMessage('Tiền điện phải là số lớn hơn hoặc bằng 0'),
  body('waterFee')
    .notEmpty()
    .withMessage('Tiền nước không được để trống')
    .isFloat({ min: 0 })
    .withMessage('Tiền nước phải là số lớn hơn hoặc bằng 0'),
  body('serviceFee')
    .notEmpty()
    .withMessage('Phí dịch vụ không được để trống')
    .isFloat({ min: 0 })
    .withMessage('Phí dịch vụ phải là số lớn hơn hoặc bằng 0'),
  body('totalAmount')
    .notEmpty()
    .withMessage('Tổng tiền không được để trống')
    .isFloat({ min: 0 })
    .withMessage('Tổng tiền phải là số lớn hơn hoặc bằng 0'),
  body('paymentStatus')
    .optional()
    .isIn(['UNPAID', 'PARTIAL', 'PAID', 'OVERDUE'])
    .withMessage('Trạng thái thanh toán không hợp lệ'),
  body('dueDate')
    .notEmpty()
    .withMessage('Hạn thanh toán không được để trống')
    .isISO8601()
    .withMessage('Hạn thanh toán phải là định dạng ngày hợp lệ'),
  validateResult,
];

export const validateUpdateInvoice = [
  param('id')
    .notEmpty()
    .withMessage('Mã hóa đơn không được để trống')
    .isString()
    .withMessage('Mã hóa đơn phải là chuỗi ký tự'),
  body('roomId')
    .optional()
    .isString()
    .withMessage('Mã phòng phải là chuỗi ký tự'),
  body('contractId')
    .optional()
    .isString()
    .withMessage('Mã hợp đồng phải là chuỗi ký tự'),
  body('billingMonth')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage('Tháng hóa đơn phải từ 1 đến 12'),
  body('billingYear')
    .optional()
    .isInt({ min: 2000, max: 2100 })
    .withMessage('Năm hóa đơn không hợp lệ'),
  body('roomFee')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Tiền phòng phải là số lớn hơn hoặc bằng 0'),
  body('electricityFee')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Tiền điện phải là số lớn hơn hoặc bằng 0'),
  body('waterFee')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Tiền nước phải là số lớn hơn hoặc bằng 0'),
  body('serviceFee')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Phí dịch vụ phải là số lớn hơn hoặc bằng 0'),
  body('totalAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Tổng tiền phải là số lớn hơn hoặc bằng 0'),
  body('paymentStatus')
    .optional()
    .isIn(['UNPAID', 'PARTIAL', 'PAID', 'OVERDUE'])
    .withMessage('Trạng thái thanh toán không hợp lệ'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Hạn thanh toán phải là định dạng ngày hợp lệ'),
  body('paidDate')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('Ngày thanh toán phải là định dạng ngày hợp lệ'),
  validateResult,
];

export const validateInvoiceQueries = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page phải là số nguyên dương'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit phải từ 1 đến 100'),
  query('status')
    .optional()
    .isIn(['UNPAID', 'PARTIAL', 'PAID', 'OVERDUE'])
    .withMessage('Trạng thái không hợp lệ'),
  query('roomId')
    .optional()
    .isString()
    .withMessage('Mã phòng phải là chuỗi ký tự'),
  query('billingMonth')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage('Tháng phải từ 1 đến 12'),
  query('billingYear')
    .optional()
    .isInt({ min: 2000, max: 2100 })
    .withMessage('Năm không hợp lệ'),
  validateResult,
];
