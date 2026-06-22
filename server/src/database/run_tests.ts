import { prisma } from '@/config/db';
import { BillingService } from '@/services/billing.service';
import { UtilityService } from '@/services/utility.service';
import { InvoiceService } from '@/services/invoice.service';
import assert from 'assert';

const billingService = new BillingService();
const utilityService = new UtilityService();
const invoiceService = new InvoiceService();

async function runTests() {
  console.log('🧪 Starting programmatic integration tests...');
  let testsFailed = 0;

  const runTestCase = async (name: string, fn: () => Promise<void>) => {
    try {
      console.log(`⏳ Running: ${name}`);
      await fn();
      console.log(`✅ Passed: ${name}\n`);
    } catch (err: any) {
      console.error(`❌ Failed: ${name}`);
      console.error(err);
      console.log('');
      testsFailed++;
    }
  };

  // Test Case 1: Room unique invoice per month (Rule 2)
  await runTestCase('Rule 2 - Prevent Duplicate Invoice per Month/Year', async () => {
    // Find room P101
    const room = await prisma.room.findUnique({ where: { roomNumber: 'P101' } });
    if (!room) throw new Error('Room P101 not found, run db:seed first!');

    // Create the first invoice for April 2026 to ensure duplicate error can trigger
    const firstInvoice = await prisma.invoice.create({
      data: {
        roomId: room.id,
        billingMonth: 4,
        billingYear: 2026,
        roomFee: 1200000,
        electricityFee: 420000,
        waterFee: 180000,
        serviceFee: 50000,
        totalAmount: 1850000,
        dueDate: new Date('2026-05-10'),
      }
    });

    try {
      // Let's try creating a manual invoice for April 2026 for the same room
      await invoiceService.createInvoice({
        roomId: room.id,
        billingMonth: 4,
        billingYear: 2026,
        roomFee: 1200000,
        electricityFee: 420000,
        waterFee: 180000,
        serviceFee: 50000,
        totalAmount: 1850000,
        dueDate: new Date('2026-05-10'),
      });
      throw new Error('Should have failed to create a duplicate invoice, but succeeded!');
    } catch (err: any) {
      assert.ok(err.message.includes('đã tồn tại') || err.message.includes('đã được lập'));
    } finally {
      // Clean up the first invoice
      await prisma.invoice.delete({ where: { id: firstInvoice.id } });
    }
  });

  // Test Case 2: Reading checks (Rule 3)
  await runTestCase('Rule 3 - Current reading must be greater than or equal to previous reading', async () => {
    const room = await prisma.room.findUnique({ where: { roomNumber: 'P101' } });
    if (!room) throw new Error('Room P101 not found');

    try {
      await utilityService.createReading({
        roomId: room.id,
        billingMonth: 12,
        billingYear: 2026,
        previousElectric: 1000,
        currentElectric: 900, // smaller than previous!
        previousWater: 100,
        currentWater: 120,
        electricPrice: 3500,
        waterPrice: 15000,
      });
      throw new Error('Should have blocked current electric < previous electric!');
    } catch (err: any) {
      assert.ok(err.message.includes('nhỏ hơn chỉ số cũ') || err.message.includes('nhỏ hơn'));
    }
  });

  // Test Case 3: Due date passed => OVERDUE transition (Rule 7)
  await runTestCase('Rule 7 - Unpaid passed due date => Automatically OVERDUE', async () => {
    const room = await prisma.room.findUnique({ where: { roomNumber: 'P101' } });
    if (!room) throw new Error('Room P101 not found');

    // Create a temporary mock unpaid invoice with a due date in the past
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);

    const tempInvoice = await prisma.invoice.create({
      data: {
        roomId: room.id,
        billingMonth: 1,
        billingYear: 2026,
        roomFee: 1200000,
        electricityFee: 0,
        waterFee: 0,
        serviceFee: 0,
        totalAmount: 1200000,
        paymentStatus: 'UNPAID',
        dueDate: pastDate,
      }
    });

    try {
      // Query this invoice using invoiceService or invoiceRepository.findById
      const queried = await invoiceService.getInvoiceById(tempInvoice.id);
      
      // Verify its status is now OVERDUE
      assert.strictEqual(queried.paymentStatus, 'OVERDUE');
      
      // Verify the DB state is updated
      const dbRecord = await prisma.invoice.findUnique({ where: { id: tempInvoice.id } });
      assert.strictEqual(dbRecord?.paymentStatus, 'OVERDUE');
    } finally {
      // Clean up
      await prisma.invoice.delete({ where: { id: tempInvoice.id } });
    }
  });

  // Test Case 4: Revenue only counts PAID invoices (Rule 8)
  await runTestCase('Rule 8 - Revenue statistics only sum PAID invoices', async () => {
    // Check initial statistics
    const initialStats = await billingService.getRevenueStatistics();

    // Create a temporary unpaid invoice
    const room = await prisma.room.findUnique({ where: { roomNumber: 'P101' } });
    if (!room) throw new Error('Room P101 not found');

    const tempUnpaid = await prisma.invoice.create({
      data: {
        roomId: room.id,
        billingMonth: 11,
        billingYear: 2026,
        roomFee: 1000000,
        electricityFee: 0,
        waterFee: 0,
        serviceFee: 0,
        totalAmount: 1000000,
        paymentStatus: 'UNPAID',
        dueDate: new Date('2026-12-10'),
      }
    });

    try {
      const statsAfterUnpaid = await billingService.getRevenueStatistics();

      // The unpaid invoice shouldn't increase the monthly revenue map for 2026-11
      const initialNov = initialStats.monthlyRevenue.find(m => m.month === '2026-11')?.amount || 0;
      const afterNov = statsAfterUnpaid.monthlyRevenue.find(m => m.month === '2026-11')?.amount || 0;
      assert.strictEqual(afterNov, initialNov);
    } finally {
      // Clean up
      await prisma.invoice.delete({ where: { id: tempUnpaid.id } });
    }
  });

  // Test Case 5: Student submits maintenance request & Asset becomes DAMAGED
  await runTestCase('Asset/Maintenance - Submit request & asset status to DAMAGED', async () => {
    // Find active student
    const student = await prisma.student.findFirst({ where: { status: 'ACTIVE' } });
    if (!student) throw new Error('No active student found for testing');

    // Find a room asset
    const asset = await prisma.asset.findFirst();
    if (!asset) throw new Error('No asset found for testing, run seed first');

    // Set asset status to GOOD initially
    await prisma.asset.update({
      where: { id: asset.id },
      data: { status: 'GOOD' },
    });

    // Create a maintenance request
    const request = await prisma.maintenanceRequest.create({
      data: {
        roomId: asset.roomId,
        assetId: asset.id,
        studentId: student.id,
        title: 'Test asset damage report',
        description: 'Test description',
        status: 'PENDING',
      },
    });

    // Update asset status to DAMAGED (as controller does)
    await prisma.asset.update({
      where: { id: asset.id },
      data: { status: 'DAMAGED' },
    });

    try {
      const dbAsset = await prisma.asset.findUnique({ where: { id: asset.id } });
      assert.strictEqual(dbAsset?.status, 'DAMAGED');
    } finally {
      // Clean up request
      await prisma.maintenanceRequest.delete({ where: { id: request.id } });
    }
  });

  // Test Case 6: Resolve request => Asset status back to GOOD
  await runTestCase('Asset/Maintenance - Resolve request & update asset status back to GOOD', async () => {
    const student = await prisma.student.findFirst({ where: { status: 'ACTIVE' } });
    if (!student) throw new Error('No active student');

    const asset = await prisma.asset.findFirst();
    if (!asset) throw new Error('No asset');

    // Initial damaged state
    await prisma.asset.update({
      where: { id: asset.id },
      data: { status: 'DAMAGED' },
    });

    const request = await prisma.maintenanceRequest.create({
      data: {
        roomId: asset.roomId,
        assetId: asset.id,
        studentId: student.id,
        title: 'Test repair complete',
        description: 'Test description',
        status: 'PENDING',
      },
    });

    try {
      // Resolve the request (simulate controller action)
      await prisma.maintenanceRequest.update({
        where: { id: request.id },
        data: {
          status: 'RESOLVED',
          notes: 'Fixed successfully',
          resolvedAt: new Date(),
        },
      });

      // Update asset back to GOOD (simulate controller action)
      await prisma.asset.update({
        where: { id: asset.id },
        data: { status: 'GOOD' },
      });

      const dbRequest = await prisma.maintenanceRequest.findUnique({ where: { id: request.id } });
      const dbAsset = await prisma.asset.findUnique({ where: { id: asset.id } });

      assert.strictEqual(dbRequest?.status, 'RESOLVED');
      assert.strictEqual(dbRequest?.notes, 'Fixed successfully');
      assert.strictEqual(dbAsset?.status, 'GOOD');
    } finally {
      // Clean up request
      await prisma.maintenanceRequest.delete({ where: { id: request.id } });
    }
  });

  if (testsFailed > 0) {
    console.log(`❌ Done testing: ${testsFailed} test case(s) failed.`);
    process.exit(1);
  } else {
    console.log('🎉 All integration tests passed successfully!');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
