/**
 * Script: repairPaidBookingsTickets.ts
 * Sửa chữa các booking đã thanh toán (PAID/CHECKED_IN/COMPLETED) nhưng thiếu ticket
 *
 * Chạy: npm run tickets:repair-paid
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Booking from '../models/booking.model';
import Ticket from '../models/ticket.model';
import Payment from '../models/payment.model';
import Timeslot from '../models/timeslot.model';
import crypto from 'crypto';

// Generate check-in code
function generateCheckInCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'CL-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return code;
}

async function generateUniqueCheckInCode(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = generateCheckInCode();
    const exists = await Ticket.findOne({ checkInCode: code });
    if (!exists) return code;
  }
  return `CL-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

function generateQrToken(bookingCode: string): string {
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `QR-${bookingCode}-${randomPart}`;
}

async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('❌ MONGO_URI không được cấu hình trong .env');
    process.exit(1);
  }

  console.log('🔌 Đang kết nối MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('✅ Đã kết nối MongoDB');

  let totalChecked = 0;
  let ticketsCreated = 0;
  let ticketIdsLinked = 0;
  let checkInCodesAdded = 0;
  let bookingsUpdatedToPaid = 0;

  // 1. Tìm tất cả bookings có trạng thái PAID, CHECKED_IN, COMPLETED
  const paidBookings = await Booking.find({
    bookingStatus: { $in: ['PAID', 'CHECKED_IN', 'COMPLETED'] },
  });

  console.log(`\n📋 Tìm thấy ${paidBookings.length} booking đã thanh toán\n`);

  for (const booking of paidBookings) {
    totalChecked++;

    // Tìm ticket hiện có
    let ticket = booking.ticketId ? await Ticket.findById(booking.ticketId) : null;
    if (!ticket) {
      ticket = await Ticket.findOne({ bookingId: booking._id });
    }

    if (!ticket) {
      // Tạo ticket mới
      const timeslot = await Timeslot.findById(booking.timeslotId);
      ticket = await Ticket.create({
        bookingId: booking._id,
        touristId: booking.touristId,
        workshopId: booking.workshopId,
        timeslotId: booking.timeslotId,
        qrToken: generateQrToken(booking.bookingCode),
        checkInCode: await generateUniqueCheckInCode(),
        status: 'UNUSED',
        expiredAt: timeslot?.endTime || undefined,
      });
      ticketsCreated++;
      console.log(`  🎫 Tạo ticket mới cho booking ${booking.bookingCode} (${booking._id})`);
    }

    // Gắn ticketId vào booking nếu chưa có
    if (!booking.ticketId || booking.ticketId.toString() !== ticket._id!.toString()) {
      booking.ticketId = ticket._id as any;
      await booking.save();
      ticketIdsLinked++;
      console.log(`  🔗 Gắn ticketId ${ticket._id} vào booking ${booking.bookingCode}`);
    }

    // Bổ sung checkInCode nếu thiếu
    if (!ticket.checkInCode) {
      ticket.checkInCode = await generateUniqueCheckInCode();
      await ticket.save();
      checkInCodesAdded++;
      console.log(`  🔑 Bổ sung checkInCode cho ticket ${ticket._id}`);
    }
  }

  // 2. Tìm payment SUCCESS có bookingId nhưng booking vẫn PENDING
  const successPayments = await Payment.find({
    paymentStatus: 'SUCCESS',
    bookingId: { $exists: true, $ne: null },
  });

  for (const payment of successPayments) {
    const booking = await Booking.findById(payment.bookingId);
    if (booking && booking.bookingStatus === 'PENDING') {
      booking.bookingStatus = 'PAID';
      booking.paymentId = payment._id as any;
      await booking.save();
      bookingsUpdatedToPaid++;
      console.log(`  💰 Cập nhật booking ${booking.bookingCode} từ PENDING → PAID (payment ${payment._id} đã SUCCESS)`);

      // Tạo ticket cho booking vừa update
      let ticket = await Ticket.findOne({ bookingId: booking._id });
      if (!ticket) {
        const timeslot = await Timeslot.findById(booking.timeslotId);
        ticket = await Ticket.create({
          bookingId: booking._id,
          touristId: booking.touristId,
          workshopId: booking.workshopId,
          timeslotId: booking.timeslotId,
          qrToken: generateQrToken(booking.bookingCode),
          checkInCode: await generateUniqueCheckInCode(),
          status: 'UNUSED',
          expiredAt: timeslot?.endTime || undefined,
        });
        ticketsCreated++;
        console.log(`  🎫 Tạo ticket mới cho booking ${booking.bookingCode}`);
      }

      if (!booking.ticketId || booking.ticketId.toString() !== ticket._id!.toString()) {
        booking.ticketId = ticket._id as any;
        await booking.save();
        ticketIdsLinked++;
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 KẾT QUẢ REPAIR:');
  console.log(`  • Tổng booking kiểm tra: ${totalChecked + bookingsUpdatedToPaid}`);
  console.log(`  • Booking PENDING → PAID: ${bookingsUpdatedToPaid}`);
  console.log(`  • Ticket tạo mới: ${ticketsCreated}`);
  console.log(`  • Booking gắn lại ticketId: ${ticketIdsLinked}`);
  console.log(`  • Ticket bổ sung checkInCode: ${checkInCodesAdded}`);
  console.log('='.repeat(50));

  await mongoose.disconnect();
  console.log('\n🔌 Đã đóng kết nối MongoDB');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Lỗi chạy script:', err);
  process.exit(1);
});
