import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding database...');

  // Hash default password: "Password123"
  const hashedPassword = await bcrypt.hash('Password123', 12);

  // 1. Create System Admin
  const adminEmail = 'admin@dormitory.com';
  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        fullName: 'Quản trị viên Hệ thống',
        role: 'ADMIN',
      },
    });
    console.log(`✅ Created Admin: ${admin.email}`);
  } else {
    console.log('ℹ️ Admin already exists.');
  }

  // 2. Create Student
  const studentEmail = 'student@dormitory.com';
  let student = await prisma.user.findUnique({ where: { email: studentEmail } });
  if (!student) {
    student = await prisma.user.create({
      data: {
        email: studentEmail,
        password: hashedPassword,
        fullName: 'Nguyễn Văn A',
        role: 'STUDENT',
        studentId: 'SV123456',
        phone: '0987654321',
      },
    });
    console.log(`✅ Created Student: ${student.email}`);
  } else {
    console.log('ℹ️ Student already exists.');
  }

  // 3. Tạo tòa nhà mẫu
  const existingBuilding = await prisma.building.findUnique({
    where: { name: 'Tòa A' },
  });

  let buildingA: any;
  if (!existingBuilding) {
    buildingA = await prisma.building.create({
      data: {
        name: 'Tòa A',
        genderType: 'MIXED',
        description: 'Tòa nhà dành cho cả nam và nữ.',
      },
    });
    console.log(`✅ Đã tạo tòa nhà: ${buildingA.name}`);
  } else {
    buildingA = existingBuilding;
    console.log('ℹ️ Tòa nhà Tòa A đã tồn tại.');
  }

  // 4. Create Room P101
  const roomNumber = 'P101';
  let room = await prisma.room.findUnique({ where: { roomNumber } });
  if (!room) {
    room = await prisma.room.create({
      data: {
        roomNumber,
        floor: 1,
        capacity: 4,
        type: 'QUAD',
        status: 'FULL',
        pricePerMonth: 1200000,
        description: 'Phòng 4 người tầng 1, đầy đủ tiện nghi.',
        buildingId: buildingA.id,
      },
    });
    console.log(`✅ Created Room: ${room.roomNumber}`);
  } else {
    console.log('ℹ️ Room P101 already exists.');
  }

  // 4. Create Active Contract for the student in P101
  let contract = await prisma.contract.findFirst({
    where: { userId: student.id, roomId: room.id },
  });
  if (!contract) {
    contract = await prisma.contract.create({
      data: {
        userId: student.id,
        roomId: room.id,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        status: 'ACTIVE',
      },
    });
    console.log(`✅ Created Active Contract for Room ${room.roomNumber}`);
  } else {
    console.log('ℹ️ Contract already exists.');
  }

  // Clear existing invoices and utility readings to refresh seed
  await prisma.invoice.deleteMany({ where: { roomId: room.id } });
  await prisma.utilityReading.deleteMany({ where: { roomId: room.id } });

  // 5. Create Mock Utility Readings
  // Month 4/2026
  await prisma.utilityReading.create({
    data: {
      roomId: room.id,
      billingMonth: 4,
      billingYear: 2026,
      previousElectric: 1000,
      currentElectric: 1120,
      electricUsed: 120,
      previousWater: 400,
      currentWater: 412,
      waterUsed: 12,
      electricPrice: 3500,
      waterPrice: 15000,
    },
  });

  // Month 5/2026
  await prisma.utilityReading.create({
    data: {
      roomId: room.id,
      billingMonth: 5,
      billingYear: 2026,
      previousElectric: 1120,
      currentElectric: 1260,
      electricUsed: 140,
      previousWater: 412,
      currentWater: 428,
      waterUsed: 16,
      electricPrice: 3500,
      waterPrice: 15000,
    },
  });
  console.log('✅ Created Mock Utility Readings for months April and May');

  // 6. Create Mock Invoices
  // Month 4/2026 (PAID)
  await prisma.invoice.create({
    data: {
      roomId: room.id,
      contractId: contract.id,
      billingMonth: 4,
      billingYear: 2026,
      roomFee: 1200000,
      electricityFee: 120 * 3500, // 420,000
      waterFee: 12 * 15000,      // 180,000
      serviceFee: 50000,
      totalAmount: 1200000 + 420000 + 180000 + 50000, // 1,850,000
      paymentStatus: 'PAID',
      dueDate: new Date('2026-05-10'),
      paidDate: new Date('2026-05-08'),
    },
  });

  // Month 5/2026 (UNPAID)
  await prisma.invoice.create({
    data: {
      roomId: room.id,
      contractId: contract.id,
      billingMonth: 5,
      billingYear: 2026,
      roomFee: 1200000,
      electricityFee: 140 * 3500, // 490,000
      waterFee: 16 * 15000,      // 240,000
      serviceFee: 50000,
      totalAmount: 1200000 + 490000 + 240000 + 50000, // 1,980,000
      paymentStatus: 'UNPAID',
      dueDate: new Date('2026-06-10'),
    },
  });

  // Month 3/2026 (OVERDUE)
  await prisma.invoice.create({
    data: {
      roomId: room.id,
      contractId: contract.id,
      billingMonth: 3,
      billingYear: 2026,
      roomFee: 1200000,
      electricityFee: 100 * 3500, // 350,000
      waterFee: 10 * 15000,      // 150,000
      serviceFee: 50000,
      totalAmount: 1200000 + 350000 + 150000 + 50000, // 1,750,000
      paymentStatus: 'OVERDUE',
      dueDate: new Date('2026-04-10'),
    },
  });

  console.log('✅ Created Mock Invoices (Paid, Unpaid, Overdue)');

  // 7. Create Mock Notifications
  await prisma.notification.deleteMany({});
  
  // Get student overdue/unpaid invoices to link referenceId
  const studentInvoices = await prisma.invoice.findMany({
    where: { roomId: room.id },
  });
  const unpaidInvoice = studentInvoices.find(inv => inv.paymentStatus === 'UNPAID');
  const overdueInvoice = studentInvoices.find(inv => inv.paymentStatus === 'OVERDUE');

  // Seed for Student
  await prisma.notification.createMany({
    data: [
      {
        userId: student.id,
        type: 'CONTRACT_CREATED',
        priority: 'MEDIUM',
        title: 'Hợp đồng kích hoạt',
        message: `Hợp đồng thuê phòng ${room.roomNumber} của bạn đã được kích hoạt từ ngày 01/01/2026.`,
        isRead: true,
        referenceId: contract.id,
        referenceType: 'CONTRACT',
        createdAt: new Date('2026-01-01T08:00:00Z'),
      },
      {
        userId: student.id,
        type: 'UTILITY_RECORDED',
        priority: 'LOW',
        title: 'Chỉ số điện nước tháng 5/2026',
        message: `Chỉ số điện nước mới đã được ghi nhận cho phòng ${room.roomNumber}: Điện: 1260 kWh, Nước: 428 m³.`,
        isRead: true,
        referenceType: 'UTILITY',
        createdAt: new Date('2026-05-31T17:30:00Z'),
      },
      {
        userId: student.id,
        type: 'INVOICE_CREATED',
        priority: 'HIGH',
        title: 'Hóa đơn mới tháng 5/2026',
        message: `Hóa đơn dịch vụ tháng 5/2026 cho phòng ${room.roomNumber} đã được tạo với tổng số tiền 1.980.000đ.`,
        isRead: false,
        referenceId: unpaidInvoice?.id || null,
        referenceType: 'INVOICE',
        createdAt: new Date('2026-06-01T09:00:00Z'),
      },
      {
        userId: student.id,
        type: 'INVOICE_OVERDUE',
        priority: 'URGENT',
        title: 'Hóa đơn quá hạn thanh toán!',
        message: `Hóa đơn tháng 3/2026 cho phòng ${room.roomNumber} (số tiền 1.750.000đ) đã quá hạn thanh toán ngày 10/04/2026. Vui lòng thanh toán ngay.`,
        isRead: false,
        referenceId: overdueInvoice?.id || null,
        referenceType: 'INVOICE',
        createdAt: new Date('2026-06-10T10:00:00Z'),
      },
    ],
  });

  // Seed for Admin
  await prisma.notification.createMany({
    data: [
      {
        userId: admin.id,
        type: 'SYSTEM',
        priority: 'MEDIUM',
        title: 'Bảo trì hệ thống định kỳ',
        message: 'Hệ thống sẽ tiến hành bảo trì định kỳ vào lúc 01:00 AM ngày 20/06/2026. Vui lòng lưu lại công việc.',
        isRead: false,
        referenceType: 'SYSTEM',
        createdAt: new Date('2026-06-15T08:00:00Z'),
      },
    ],
  });

  console.log('✅ Created Mock Notifications for student and admin');

  console.log('🌱 Seeding database completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
