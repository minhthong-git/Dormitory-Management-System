import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { Request } from 'express';
import { env } from '@/config/env';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];

// ── Storage engine ─────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, env.UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

// ── File filter ────────────────────────────────────────────────
const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Loại file không được hỗ trợ: ${file.mimetype}`));
  }
};

// ── Multer instances ───────────────────────────────────────────

/** Upload một ảnh dưới field "avatar" */
export const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.MAX_FILE_SIZE_BYTES },
}).single('avatar');

/** Upload tối đa 5 file dưới field "files" */
export const uploadMultiple = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.MAX_FILE_SIZE_BYTES },
}).array('files', 5);

/** Upload vào memory (dùng khi cần xử lý buffer trước khi lưu) */
export const uploadMemory = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: env.MAX_FILE_SIZE_BYTES },
}).single('file');
