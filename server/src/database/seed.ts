import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding...');

  // Hash mật khẩu mặc định: "Password123"
  const hashedPassword = await bcrypt.hash('Password123', 12);

  // 1. Tạo tài khoản Admin
  const adminEmail = 'admin@dormitory.com';
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        fullName: 'Quản trị viên Hệ thống',
        role: 'ADMIN',
      },
    });
    console.log(`✅ Đã tạo tài khoản Admin: ${admin.email}`);
  } else {
    console.log('ℹ️ Tài khoản Admin đã tồn tại.');
  }

  // 2. Tạo tài khoản Sinh viên mẫu
  const studentEmail = 'student@dormitory.com';
  const existingStudent = await prisma.user.findUnique({
    where: { email: studentEmail },
  });

  if (!existingStudent) {
    const student = await prisma.user.create({
      data: {
        email: studentEmail,
        password: hashedPassword,
        fullName: 'Nguyễn Văn A',
        role: 'STUDENT',
        studentId: 'SV123456',
        phone: '0987654321',
      },
    });
    console.log(`✅ Đã tạo tài khoản Sinh viên: ${student.email}`);
  } else {
    console.log('ℹ️ Tài khoản Sinh viên đã tồn tại.');
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

  // 4. Tạo phòng mẫu
  const existingRoom = await prisma.room.findUnique({
    where: { roomNumber: 'P101' },
  });

  if (!existingRoom) {
    const room = await prisma.room.create({
      data: {
        roomNumber: 'P101',
        floor: 1,
        capacity: 4,
        type: 'QUAD',
        status: 'AVAILABLE',
        pricePerMonth: 1200000,
        description: 'Phòng 4 người tầng 1, đầy đủ tiện nghi.',
        buildingId: buildingA.id,
      },
    });
    console.log(`✅ Đã tạo phòng mẫu: ${room.roomNumber}`);
  }

  console.log('🌱 Seeding hoàn tất!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
