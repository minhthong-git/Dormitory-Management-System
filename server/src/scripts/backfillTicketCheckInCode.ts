import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import crypto from 'crypto';
import { env } from '../config/env';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCheckInCode(): string {
  let code = 'CL-';
  for (let i = 0; i < 6; i++) {
    code += CHARS.charAt(crypto.randomInt(0, CHARS.length));
  }
  return code;
}

async function main() {
  if (!env.MONGO_URI) {
    console.error('❌ Missing MONGO_URI in environment.');
    process.exit(1);
  }

  await mongoose.connect(env.MONGO_URI);
  console.log('✅ MongoDB connected successfully.\n');

  const db = mongoose.connection.db!;
  const ticketsColl = db.collection('tickets');

  // Find tickets missing checkInCode
  const ticketsToFix = await ticketsColl.find({
    $or: [
      { checkInCode: { $exists: false } },
      { checkInCode: null },
      { checkInCode: '' },
    ],
  }).toArray();

  console.log(`🔍 Found ${ticketsToFix.length} tickets without checkInCode.\n`);

  if (ticketsToFix.length === 0) {
    console.log('✅ All tickets already have checkInCode. Nothing to do.');
    await mongoose.disconnect();
    return;
  }

  // Collect existing codes to avoid duplicates
  const existingCodes = new Set<string>();
  const allTickets = await ticketsColl.find({ checkInCode: { $exists: true, $nin: [null, ''] } }).toArray();
  for (const t of allTickets) {
    if (t.checkInCode) existingCodes.add(t.checkInCode);
  }

  let updated = 0;
  for (const ticket of ticketsToFix) {
    let code: string;
    let retries = 0;
    do {
      code = generateCheckInCode();
      retries++;
    } while (existingCodes.has(code) && retries < 20);

    existingCodes.add(code);

    await ticketsColl.updateOne(
      { _id: ticket._id },
      { $set: { checkInCode: code } }
    );
    console.log(`  ✅ Ticket ${ticket._id} → checkInCode: ${code}`);
    updated++;
  }

  console.log(`\n🎉 Backfill completed! Updated ${updated} tickets.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
