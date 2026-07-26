/**
 * normalizeStatuses.ts
 * Script quét toàn bộ MongoDB collections và chuyển đổi status cũ (lowercase/mixed)
 * sang status chuẩn UPPERCASE.
 *
 * Chạy: npm run statuses:normalize
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || '';

interface NormalizeRule {
  collection: string;
  field: string;
  mapping: Record<string, string>;
}

const rules: NormalizeRule[] = [
  {
    collection: 'users',
    field: 'status',
    mapping: {
      active: 'ACTIVE',
      pending: 'PENDING',
      blocked: 'BLOCKED',
      inactive: 'BLOCKED',
      disabled: 'BLOCKED',
    },
  },
  {
    collection: 'users',
    field: 'role',
    mapping: {
      admin: 'ADMIN',
      host: 'HOST',
      tour_guide: 'TOUR_GUIDE',
      tourist: 'TOURIST',
      guide: 'TOUR_GUIDE',
    },
  },
  {
    collection: 'hostapplications',
    field: 'status',
    mapping: {
      pending: 'PENDING',
      approved: 'APPROVED',
      rejected: 'REJECTED',
    },
  },
  {
    collection: 'workshops',
    field: 'status',
    mapping: {
      draft: 'DRAFT',
      active: 'ACTIVE',
      hidden: 'HIDDEN',
      deleted: 'DELETED',
    },
  },
  {
    collection: 'timeslots',
    field: 'status',
    mapping: {
      available: 'AVAILABLE',
      full: 'FULL',
      ongoing: 'ONGOING',
      completed: 'COMPLETED',
      cancelled: 'CANCELLED',
    },
  },
  {
    collection: 'bookings',
    field: 'bookingStatus',
    mapping: {
      pending: 'PENDING',
      paid: 'PAID',
      booked: 'PAID',
      cancelled: 'CANCELLED',
      canceled: 'CANCELLED',
      checked_in: 'CHECKED_IN',
      checkedin: 'CHECKED_IN',
      completed: 'COMPLETED',
      refunded: 'REFUNDED',
    },
  },
  {
    collection: 'tickets',
    field: 'status',
    mapping: {
      unused: 'UNUSED',
      used: 'USED',
      expired: 'EXPIRED',
      cancelled: 'CANCELLED',
      canceled: 'CANCELLED',
    },
  },
  {
    collection: 'payments',
    field: 'paymentStatus',
    mapping: {
      pending: 'PENDING',
      success: 'SUCCESS',
      paid: 'SUCCESS',
      failed: 'FAILED',
      cancelled: 'CANCELLED',
      canceled: 'CANCELLED',
      refunded: 'REFUNDED',
    },
  },
  {
    collection: 'orders',
    field: 'orderStatus',
    mapping: {
      pending: 'PENDING',
      confirmed: 'CONFIRMED',
      packing: 'PACKING',
      shipping: 'SHIPPING',
      completed: 'COMPLETED',
      cancelled: 'CANCELLED',
      canceled: 'CANCELLED',
      refunded: 'REFUNDED',
    },
  },
  {
    collection: 'products',
    field: 'status',
    mapping: {
      active: 'ACTIVE',
      hidden: 'HIDDEN',
      out_of_stock: 'OUT_OF_STOCK',
      deleted: 'DELETED',
    },
  },
  {
    collection: 'reviews',
    field: 'status',
    mapping: {
      visible: 'VISIBLE',
      hidden: 'HIDDEN',
    },
  },
];

async function normalizeStatuses() {
  if (!MONGO_URI) {
    console.error('❌ MONGO_URI not set in .env');
    process.exit(1);
  }

  console.log('🔗 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected\n');

  const db = mongoose.connection.db!;
  let totalFixed = 0;

  for (const rule of rules) {
    const collection = db.collection(rule.collection);
    const lowercaseValues = Object.keys(rule.mapping);

    // Find documents with lowercase/mixed status values
    const query = { [rule.field]: { $in: lowercaseValues } };
    const docs = await collection.find(query).toArray();

    if (docs.length === 0) {
      console.log(`✅ ${rule.collection}.${rule.field} — Tất cả đã chuẩn`);
      continue;
    }

    console.log(`⚠️  ${rule.collection}.${rule.field} — Tìm thấy ${docs.length} document cần sửa`);

    for (const doc of docs) {
      const oldValue = doc[rule.field];
      const newValue = rule.mapping[oldValue];
      if (newValue) {
        await collection.updateOne(
          { _id: doc._id },
          { $set: { [rule.field]: newValue } }
        );
        console.log(`   📝 ${doc._id}: "${oldValue}" → "${newValue}"`);
        totalFixed++;
      }
    }
  }

  console.log(`\n🏁 Hoàn tất! Đã sửa ${totalFixed} document.`);
  await mongoose.disconnect();
  process.exit(0);
}

normalizeStatuses().catch((err) => {
  console.error('❌ Lỗi:', err);
  process.exit(1);
});
