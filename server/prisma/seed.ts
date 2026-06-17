import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding...');

  // Clean existing data
  console.log('🧹 Cleaning old data...');
  await prisma.invoice.deleteMany({});
  await prisma.transferHistory.deleteMany({});
  await prisma.contract.deleteMany({});
  await prisma.bed.deleteMany({});
  await prisma.room.deleteMany({});
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

  // 2. Create 10 Rooms (AVAILABLE)
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
        type: 'QUAD',
        status: 'AVAILABLE',
        pricePerMonth: 1200000,
        description: `Phòng Quad 4 giường tầng ${floor}, trang bị máy lạnh, tủ lạnh mini.`,
      },
    });
    rooms.push(room);
  }
  console.log(`✅ Created ${rooms.length} rooms.`);

  // 3. Create 40 Beds (AVAILABLE, 4 per Room)
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

  // 4. Create 20 Student Users and Student profiles
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

  console.log('🌱 Seeding hoàn tất!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
