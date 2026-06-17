import { body, param, query } from 'express-validator';
import { validateResult } from './validateInvoice';

export const validateCreateUtility = [
  body('roomId')
    .notEmpty()
    .withMessage('Mã phòng không được để trống')
    .isString()
    .withMessage('Mã phòng phải là chuỗi ký tự'),
  body('billingMonth')
    .notEmpty()
    .withMessage('Tháng ghi điện nước không được để trống')
    .isInt({ min: 1, max: 12 })
    .withMessage('Tháng ghi điện nước phải từ 1 đến 12'),
  body('billingYear')
    .notEmpty()
    .withMessage('Năm ghi điện nước không được để trống')
    .isInt({ min: 2000, max: 2100 })
    .withMessage('Năm ghi điện nước không hợp lệ'),
  body('previousElectric')
    .notEmpty()
    .withMessage('Chỉ số điện cũ không được để trống')
    .isFloat({ min: 0 })
    .withMessage('Chỉ số điện cũ phải là số lớn hơn hoặc bằng 0'),
  body('currentElectric')
    .notEmpty()
    .withMessage('Chỉ số điện mới không được để trống')
    .isFloat({ min: 0 })
    .withMessage('Chỉ số điện mới phải là số lớn hơn hoặc bằng 0'),
  body('previousWater')
    .notEmpty()
    .withMessage('Chỉ số nước cũ không được để trống')
    .isFloat({ min: 0 })
    .withMessage('Chỉ số nước cũ phải là số lớn hơn hoặc bằng 0'),
  body('currentWater')
    .notEmpty()
    .withMessage('Chỉ số nước mới không được để trống')
    .isFloat({ min: 0 })
    .withMessage('Chỉ số nước mới phải là số lớn hơn hoặc bằng 0'),
  body('electricPrice')
    .notEmpty()
    .withMessage('Đơn giá điện không được để trống')
    .isFloat({ min: 0 })
    .withMessage('Đơn giá điện phải là số lớn hơn hoặc bằng 0'),
  body('waterPrice')
    .notEmpty()
    .withMessage('Đơn giá nước không được để trống')
    .isFloat({ min: 0 })
    .withMessage('Đơn giá nước phải là số lớn hơn hoặc bằng 0'),
  body('serviceFee')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Phí dịch vụ phải là số lớn hơn hoặc bằng 0'),
  validateResult,
];

export const validateUpdateUtility = [
  param('id')
    .notEmpty()
    .withMessage('Mã ghi điện nước không được để trống')
    .isString()
    .withMessage('Mã ghi điện nước phải là chuỗi ký tự'),
  body('roomId')
    .optional()
    .isString()
    .withMessage('Mã phòng phải là chuỗi ký tự'),
  body('billingMonth')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage('Tháng ghi điện nước phải từ 1 đến 12'),
  body('billingYear')
    .optional()
    .isInt({ min: 2000, max: 2100 })
    .withMessage('Năm ghi điện nước không hợp lệ'),
  body('previousElectric')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Chỉ số điện cũ phải là số lớn hơn hoặc bằng 0'),
  body('currentElectric')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Chỉ số điện mới phải là số lớn hơn hoặc bằng 0'),
  body('previousWater')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Chỉ số nước cũ phải là số lớn hơn hoặc bằng 0'),
  body('currentWater')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Chỉ số nước mới phải là số lớn hơn hoặc bằng 0'),
  body('electricPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Đơn giá điện phải là số lớn hơn hoặc bằng 0'),
  body('waterPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Đơn giá nước phải là số lớn hơn hoặc bằng 0'),
  validateResult,
];

export const validateCalculateUtility = [
  body('roomFee')
    .notEmpty()
    .withMessage('Tiền phòng không được để trống')
    .isFloat({ min: 0 })
    .withMessage('Tiền phòng phải là số lớn hơn hoặc bằng 0'),
  body('previousElectric')
    .notEmpty()
    .withMessage('Chỉ số điện cũ không được để trống')
    .isFloat({ min: 0 })
    .withMessage('Chỉ số điện cũ phải là số lớn hơn hoặc bằng 0'),
  body('currentElectric')
    .notEmpty()
    .withMessage('Chỉ số điện mới không được để trống')
    .isFloat({ min: 0 })
    .withMessage('Chỉ số điện mới phải là số lớn hơn hoặc bằng 0'),
  body('previousWater')
    .notEmpty()
    .withMessage('Chỉ số nước cũ không được để trống')
    .isFloat({ min: 0 })
    .withMessage('Chỉ số nước cũ phải là số lớn hơn hoặc bằng 0'),
  body('currentWater')
    .notEmpty()
    .withMessage('Chỉ số nước mới không được để trống')
    .isFloat({ min: 0 })
    .withMessage('Chỉ số nước mới phải là số lớn hơn hoặc bằng 0'),
  body('electricPrice')
    .notEmpty()
    .withMessage('Đơn giá điện không được để trống')
    .isFloat({ min: 0 })
    .withMessage('Đơn giá điện phải là số lớn hơn hoặc bằng 0'),
  body('waterPrice')
    .notEmpty()
    .withMessage('Đơn giá nước không được để trống')
    .isFloat({ min: 0 })
    .withMessage('Đơn giá nước phải là số lớn hơn hoặc bằng 0'),
  body('serviceFee')
    .notEmpty()
    .withMessage('Phí dịch vụ không được để trống')
    .isFloat({ min: 0 })
    .withMessage('Phí dịch vụ phải là số lớn hơn hoặc bằng 0'),
  validateResult,
];

export const validateUtilityQueries = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page phải là số nguyên dương'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit phải từ 1 đến 100'),
  query('roomId')
    .optional()
    .isString()
    .withMessage('Mã phòng phải là chuỗi ký tự'),
  validateResult,
];
