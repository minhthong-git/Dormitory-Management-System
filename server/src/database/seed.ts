import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

declare const process: any;

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding database...');

  // Clean existing data
  console.log('🧹 Cleaning old data...');
  await prisma.maintenanceRequest.deleteMany({});
  await prisma.asset.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.paymentTransaction.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.utilityReading.deleteMany({});
  await prisma.transferHistory.deleteMany({});
  await prisma.contract.deleteMany({});
  await prisma.bed.deleteMany({});
  await prisma.room.deleteMany({});
  await prisma.building.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.user.deleteMany({});

  // Hash default password
  const hashedPassword = await bcrypt.hash('Password123', 12);

  // 1. Create Admin
  const admin = await prisma.user.create({
    data: {
      email: 'admin@dormitory.com',
      password: hashedPassword,
      fullName: 'Quản trị viên Hệ thống',
      role: 'ADMIN',
      status: 'ACTIVE',
      studentId: 'ADMIN_USER', // bypass SQL Server NULL unique constraint
    },
  });
  console.log(`✅ Created Admin: ${admin.email}`);

  // Create Staff
  const staff = await prisma.user.create({
    data: {
      email: 'staff@dormitory.com',
      password: hashedPassword,
      fullName: 'Nhân viên Ký túc xá',
      role: 'STAFF',
      status: 'ACTIVE',
      studentId: 'STAFF_USER', // bypass SQL Server NULL unique constraint
    },
  });
  console.log(`✅ Created Staff: ${staff.email}`);

  // 2. Tạo tòa nhà mẫu
  let buildingA = await prisma.building.create({
    data: {
      name: 'Tòa A',
      genderType: 'MIXED',
      description: 'Tòa nhà dành cho cả nam và nữ.',
    },
  });
  console.log(`✅ Đã tạo tòa nhà: ${buildingA.name}`);

  // 3. Create 10 Rooms
  console.log('🚪 Creating rooms...');
  const rooms = [];
  for (let i = 1; i <= 10; i++) {
    const roomNumber = `P10${i}`;
    const floor = Math.ceil(i / 5); // 5 rooms per floor
    
    let type = 'STANDARD';
    let capacity = 4;
    let pricePerMonth = 1200000;
    
    if (i <= 3) {
      type = 'SMALL';
      capacity = 2;
      pricePerMonth = 1500000;
    } else if (i >= 8) {
      type = 'LARGE';
      capacity = 6;
      pricePerMonth = 900000;
    }

    const room = await prisma.room.create({
      data: {
        roomNumber,
        floor,
        capacity,
        currentOccupancy: 0,
        type,
        genderType: i % 2 === 0 ? 'MALE' : 'FEMALE',
        status: 'AVAILABLE',
        pricePerMonth,
        description: `Phòng ${type} ${capacity} giường tầng ${floor}, trang bị máy lạnh, tủ lạnh mini.`,
        buildingId: buildingA.id,
      },
    });
    rooms.push(room);
  }
  console.log(`✅ Created ${rooms.length} rooms.`);

  // 4. Create Beds
  console.log('🛏️ Creating beds...');
  const beds = [];
  for (const room of rooms) {
    for (let bedNum = 1; bedNum <= room.capacity; bedNum++) {
      const bed = await prisma.bed.create({
        data: {
          roomId: room.id,
          bedNumber: bedNum,
          bedType: 'SINGLE',
          status: 'AVAILABLE',
        },
      });
      beds.push(bed);
    }
  }
  console.log(`✅ Created ${beds.length} beds.`);

  // 4.5 Create Assets for Rooms
  console.log('📺 Creating assets...');
  let assetCount = 0;
  for (const room of rooms) {
    // 1 AC per room
    await prisma.asset.create({
      data: {
        roomId: room.id,
        code: `AC-${room.roomNumber}-01`,
        name: 'Máy lạnh Panasonic 1.5HP',
        type: 'AIR_CONDITIONER',
        status: Math.random() > 0.9 ? 'DAMAGED' : 'GOOD',
      }
    });
    assetCount++;
    
    // 1 Fan per room
    await prisma.asset.create({
      data: {
        roomId: room.id,
        code: `FAN-${room.roomNumber}-01`,
        name: 'Quạt treo tường Senko',
        type: 'FAN',
        status: 'GOOD',
      }
    });
    assetCount++;

    // Desks and Chairs matching capacity
    for (let i = 1; i <= room.capacity; i++) {
      await prisma.asset.create({
        data: {
          roomId: room.id,
          code: `DSK-${room.roomNumber}-${i.toString().padStart(2, '0')}`,
          name: 'Bàn học cá nhân',
          type: 'DESK',
          status: Math.random() > 0.95 ? 'REPAIRING' : 'GOOD',
        }
      });
      await prisma.asset.create({
        data: {
          roomId: room.id,
          code: `CHR-${room.roomNumber}-${i.toString().padStart(2, '0')}`,
          name: 'Ghế xoay văn phòng',
          type: 'CHAIR',
          status: 'GOOD',
        }
      });
      assetCount += 2;
    }

    // 4 Light bulbs
    for (let i = 1; i <= 4; i++) {
      await prisma.asset.create({
        data: {
          roomId: room.id,
          code: `LT-${room.roomNumber}-${i.toString().padStart(2, '0')}`,
          name: 'Bóng đèn',
          type: 'LIGHT',
          status: 'GOOD',
          description: 'Bóng đèn tuýp LED 1.2m 20W',
        }
      });
      assetCount++;
    }

    // 4 Lockers
    for (let i = 1; i <= 4; i++) {
      await prisma.asset.create({
        data: {
          roomId: room.id,
          code: `LK-${room.roomNumber}-${i.toString().padStart(2, '0')}`,
          name: 'Tủ locker',
          type: 'LOCKER',
          status: 'GOOD',
          description: 'Tủ locker cá nhân có khóa',
        }
      });
      assetCount++;
    }

    // 4 Power sockets
    for (let i = 1; i <= 4; i++) {
      await prisma.asset.create({
        data: {
          roomId: room.id,
          code: `SK-${room.roomNumber}-${i.toString().padStart(2, '0')}`,
          name: 'Ổ điện',
          type: 'POWER_SOCKET',
          status: 'GOOD',
          description: 'Ổ cắm điện đôi âm tường',
        }
      });
      assetCount++;
    }

    // 2 Water faucets
    for (let i = 1; i <= 2; i++) {
      await prisma.asset.create({
        data: {
          roomId: room.id,
          code: `FC-${room.roomNumber}-${i.toString().padStart(2, '0')}`,
          name: 'Vòi nước',
          type: 'FAUCET',
          status: 'GOOD',
          description: 'Vòi nước inox 304',
        }
      });
      assetCount++;
    }
  }
  console.log(`✅ Created ${assetCount} assets.`);

  // 5. Create 20 Student Users and Student profiles
  console.log('👥 Creating student accounts & profiles...');
  const students = [];
  const names = [
    'Nguyễn Văn An', 'Trần Thị Bình', 'Lê Hoàng Cường', 'Phạm Minh Đức', 'Hoàng Thanh Hải',
    'Vũ Minh Khang', 'Đỗ Thùy Linh', 'Ngô Quang Minh', 'Bùi Tuyết Nhung', 'Dương Quốc Phong',
    'Phan Cẩm Tú', 'Lý Gia Bảo', 'Võ Hoài Nam', 'Đặng Kim Ngân', 'Trần Bảo Long',
    'Nguyễn Thảo Nguyên', 'Lê Hữu Đạt', 'Phạm Phương Nam', 'Hoàng Diệu Hương', 'Trịnh Thế Vinh'
  ];

  for (let i = 0; i < 20; i++) {
    const indexStr = (i + 1).toString().padStart(2, '0');
    const email = `student${indexStr}@dormitory.com`;
    const studentCode = `SV2026${indexStr}`;
    
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName: names[i],
        role: 'STUDENT',
        studentId: studentCode,
        phone: `09012345${indexStr}`,
        status: 'ACTIVE',
      },
    });

    const student = await prisma.student.create({
      data: {
        userId: user.id,
        studentCode,
        fullName: names[i],
        gender: i % 2 === 0 ? 'MALE' : 'FEMALE',
        dateOfBirth: new Date(2004, i % 12, (i * 3) % 28 + 1),
        email,
        phone: user.phone,
        faculty: i % 3 === 0 ? 'CNTT' : (i % 3 === 1 ? 'Kinh tế' : 'Cơ khí'),
        major: i % 3 === 0 ? 'Kỹ thuật phần mềm' : (i % 3 === 1 ? 'Quản trị kinh doanh' : 'Cơ điện tử'),
        course: 'K18',
        emergencyContact: 'Phụ huynh học sinh',
        emergencyPhone: `09112233${indexStr}`,
        status: 'ACTIVE',
      },
    });

    students.push(student);
  }
  console.log(`✅ Created ${students.length} student users and profiles.`);

  // 6. Create 15 Contracts
  console.log('📋 Creating contracts...');
  // 10 ACTIVE, 3 EXPIRED, 2 PENDING
  const contractStatusList = [
    ...Array(10).fill('ACTIVE'),
    ...Array(3).fill('EXPIRED'),
    ...Array(2).fill('PENDING'),
  ];

  for (let i = 0; i < 15; i++) {
    const student = students[i];
    const bed = beds[i];
    const status = contractStatusList[i];

    const startDate = new Date();
    if (status === 'EXPIRED') {
      startDate.setMonth(startDate.getMonth() - 7);
    } else if (status === 'PENDING') {
      startDate.setDate(startDate.getDate() + 5);
    } else {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 6);

    await prisma.contract.create({
      data: {
        studentId: student.id,
        bedId: bed.id,
        startDate,
        endDate,
        price: 1200000,
        deposit: 1200000,
        monthlyFee: 1200000,
        status,
      },
    });

    // If ACTIVE, update bed to OCCUPIED and increment room occupancy
    if (status === 'ACTIVE') {
      await prisma.bed.update({
        where: { id: bed.id },
        data: { status: 'OCCUPIED' },
      });

      const updatedRoom = await prisma.room.update({
        where: { id: bed.roomId },
        data: {
          currentOccupancy: { increment: 1 },
        },
      });

      if (updatedRoom.currentOccupancy >= updatedRoom.capacity) {
        await prisma.room.update({
          where: { id: bed.roomId },
          data: { status: 'FULL' },
        });
      }
    }

  }

  // Generate 2 past invoices for each room
  console.log('🧾 Creating invoices...');
  for (const room of rooms) {
    for (let monthOffset = 1; monthOffset <= 2; monthOffset++) {
      const billingMonth = new Date().getMonth() + 1 - monthOffset > 0 
        ? new Date().getMonth() + 1 - monthOffset 
        : new Date().getMonth() + 13 - monthOffset;
      const billingYear = new Date().getMonth() + 1 - monthOffset > 0 
        ? new Date().getFullYear() 
        : new Date().getFullYear() - 1;

      const roomFee = room.pricePerMonth;
      const electricityFee = Math.floor(Math.random() * 200000) + 100000;
      const waterFee = Math.floor(Math.random() * 50000) + 30000;
      const serviceFee = 50000;
      const totalAmount = roomFee + electricityFee + waterFee + serviceFee;
      
      const paymentStatus = monthOffset === 2 || room.currentOccupancy > 0 ? 'PAID' : 'OVERDUE';
      const dueDate = new Date(billingYear, billingMonth - 1, 15);
      
      let paidDate = null;
      if (paymentStatus === 'PAID') {
        paidDate = new Date(billingYear, billingMonth - 1, Math.floor(Math.random() * 10) + 5);
      }

      const invoice = await prisma.invoice.create({
        data: {
          roomId: room.id,
          billingMonth,
          billingYear,
          roomFee,
          electricityFee,
          waterFee,
          serviceFee,
          totalAmount,
          paymentStatus,
          dueDate,
          paidDate,
        }
      });

      if (paymentStatus === 'PAID') {
        await prisma.paymentTransaction.create({
          data: {
            invoiceId: invoice.id,
            userId: students[0].userId!, // just use the first student as the payer
            amount: totalAmount,
            provider: 'PAYOS',
            providerTransactionId: `TXN-${invoice.id.substring(0,8).toUpperCase()}`,
            orderCode: BigInt(Math.floor(Math.random() * 9000000) + 1000000),
            status: 'SUCCESS',
            paidAt: paidDate || new Date(),
          }
        });
      }
    }
  }

  console.log('🌱 Seeding database completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
