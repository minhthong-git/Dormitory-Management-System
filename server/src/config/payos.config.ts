import { PayOS } from '@payos/node';
import { env } from './env';

// ── PayOS Singleton Instance ───────────────────────────────────
// Khởi tạo PayOS SDK. Nếu chưa cấu hình, các method sẽ throw error.
const payos = new PayOS({
  clientId: env.PAYOS_CLIENT_ID,
  apiKey: env.PAYOS_API_KEY,
  checksumKey: env.PAYOS_CHECKSUM_KEY,
});

export default payos;
