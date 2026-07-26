/**
 * Script cleanup booking PENDING/PENDING_PAYMENT cũ
 * Chạy: npx ts-node src/scripts/cleanupExpiredPendingBookings.ts
 */
import mongoose from 'mongoose';
import { env } from '../config/env';
import { cleanupLegacyPendingBookings } from '../services/bookingExpiry.service';

async function main() {
  console.log('🔧 Connecting to MongoDB...');
  await mongoose.connect(env.MONGO_URI!);
  console.log('✅ Connected\n');

  const count = await cleanupLegacyPendingBookings();
  console.log(`\n✅ Cleanup complete. Processed ${count} legacy bookings.`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
