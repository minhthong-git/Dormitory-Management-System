import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

declare const process: any;

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding database...');

  // Clean existing data
  console.log('🧹 Cleaning old data...');
  await prisma.notification.deleteMany({});
  await prisma.maintenanceRequest.deleteMany({});
  await prisma.asset.deleteMany({});
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
    const room = await prisma.room.create({
      data: {
        roomNumber,
        floor,
        capacity: 4,
        currentOccupancy: 0,
        type: 'STANDARD',
        genderType: i % 2 === 0 ? 'MALE' : 'FEMALE',
        status: 'AVAILABLE',
        pricePerMonth: 1200000,
        description: `Phòng Quad 4 giường tầng ${floor}, trang bị máy lạnh, tủ lạnh mini.`,
        buildingId: buildingA.id,
      },
    });
    rooms.push(room);
  }
  console.log(`✅ Created ${rooms.length} rooms.`);

  // 4. Create 40 Beds (4 per Room)
  console.log('🛏️ Creating beds...');
  const beds = [];
  for (const room of rooms) {
    for (let bedNum = 1; bedNum <= 4; bedNum++) {
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

  // 4.1 Create Assets for each room
  console.log('📦 Creating assets for rooms...');
  const assets = [];
  for (const room of rooms) {
    // Air Conditioner
    const ac = await prisma.asset.create({
      data: {
        name: 'Máy lạnh',
        code: `AC-${room.roomNumber}-01`,
        type: 'AIR_CONDITIONER',
        status: 'GOOD',
        description: 'Máy lạnh LG 1.5 HP Inverter',
        roomId: room.id,
      },
    });
    assets.push(ac);

    // Desks
    for (let j = 1; j <= 4; j++) {
      const desk = await prisma.asset.create({
        data: {
          name: 'Bàn học',
          code: `DK-${room.roomNumber}-0${j}`,
          type: 'DESK',
          status: 'GOOD',
          description: 'Bàn học gỗ công nghiệp',
          roomId: room.id,
        },
      });
      assets.push(desk);
    }

    // Chairs
    for (let j = 1; j <= 4; j++) {
      const chair = await prisma.asset.create({
        data: {
          name: 'Ghế',
          code: `CH-${room.roomNumber}-0${j}`,
          type: 'CHAIR',
          status: 'GOOD',
          description: 'Ghế tựa nhựa Hòa Phát',
          roomId: room.id,
        },
      });
      assets.push(chair);
    }

    // Fans
    for (let j = 1; j <= 2; j++) {
      const fan = await prisma.asset.create({
        data: {
          name: 'Quạt',
          code: `FN-${room.roomNumber}-0${j}`,
          type: 'FAN',
          status: 'GOOD',
          description: 'Quạt treo tường Senko',
          roomId: room.id,
        },
      });
      assets.push(fan);
    }

    // 4 Light bulbs
    for (let j = 1; j <= 4; j++) {
      const light = await prisma.asset.create({
        data: {
          name: 'Bóng đèn',
          code: `LT-${room.roomNumber}-0${j}`,
          type: 'LIGHT',
          status: 'GOOD',
          description: 'Bóng đèn tuýp LED 1.2m 20W',
          roomId: room.id,
        },
      });
      assets.push(light);
    }

    // 4 Lockers
    for (let j = 1; j <= 4; j++) {
      const locker = await prisma.asset.create({
        data: {
          name: 'Tủ locker',
          code: `LK-${room.roomNumber}-0${j}`,
          type: 'LOCKER',
          status: 'GOOD',
          description: 'Tủ locker cá nhân có khóa',
          roomId: room.id,
        },
      });
      assets.push(locker);
    }

    // 4 Power sockets
    for (let j = 1; j <= 4; j++) {
      const socket = await prisma.asset.create({
        data: {
          name: 'Ổ điện',
          code: `SK-${room.roomNumber}-0${j}`,
          type: 'POWER_SOCKET',
          status: 'GOOD',
          description: 'Ổ cắm điện đôi âm tường',
          roomId: room.id,
        },
      });
      assets.push(socket);
    }

    // 2 Water faucets
    for (let j = 1; j <= 2; j++) {
      const faucet = await prisma.asset.create({
        data: {
          name: 'Vòi nước',
          code: `FC-${room.roomNumber}-0${j}`,
          type: 'FAUCET',
          status: 'GOOD',
          description: 'Vòi nước inox 304 phòng tắm/rửa mặt',
          roomId: room.id,
        },
      });
      assets.push(faucet);
    }
  }
  console.log(`✅ Created ${assets.length} assets.`);

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

      // Update room status if full
      if (updatedRoom.currentOccupancy >= updatedRoom.capacity) {
        await prisma.room.update({
          where: { id: bed.roomId },
          data: { status: 'FULL' },
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
