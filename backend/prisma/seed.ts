import {
  PrismaClient, Role, Gender, ClassLevel, IncomeCategory, ExpenseCategory,
  EthiopianMonth, AttendanceStatus, EventType, EventStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CLASS_MONTHLY_FEE, WORKING_MEMBER_RATE } from '../src/common/constants/fee-rules';

const prisma = new PrismaClient();

// English + Amharic name pairs for realistic bilingual demo data.
const STUDENT_NAMES: { en: string; am: string; gender: Gender }[] = [
  { en: 'Bereket Alemu', am: 'በረከት አለሙ', gender: 'MALE' },
  { en: 'Selamawit Tesfaye', am: 'ሰላማዊት ተስፋዬ', gender: 'FEMALE' },
  { en: 'Nathnael Girma', am: 'ናትናኤል ግርማ', gender: 'MALE' },
  { en: 'Hana Bekele', am: 'ሃና በቀለ', gender: 'FEMALE' },
  { en: 'Yonas Mekonnen', am: 'ዮናስ መኮንን', gender: 'MALE' },
  { en: 'Rahel Assefa', am: 'ራሔል አሰፋ', gender: 'FEMALE' },
  { en: 'Abel Tadesse', am: 'አቤል ታደሰ', gender: 'MALE' },
  { en: 'Meron Haile', am: 'ሜሮን ኃይሌ', gender: 'FEMALE' },
  { en: 'Kaleb Wolde', am: 'ካሌብ ወልደ', gender: 'MALE' },
  { en: 'Betelhem Fikru', am: 'ቤተልሔም ፍቅሩ', gender: 'FEMALE' },
  { en: 'Elias Dawit', am: 'ኤልያስ ዳዊት', gender: 'MALE' },
  { en: 'Tsion Getachew', am: 'ጽዮን ገታቸው', gender: 'FEMALE' },
  { en: 'Mikael Solomon', am: 'ሚካኤል ሰሎሞን', gender: 'MALE' },
  { en: 'Liya Amanuel', am: 'ልያ አማኑኤል', gender: 'FEMALE' },
  { en: 'Samuel Yohannes', am: 'ሳሙኤል ዮሐንስ', gender: 'MALE' },
];

async function main() {
  console.log('Seeding database...');
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // ── Users (idempotent) ──
  const admin = await prisma.user.upsert({
    where: { email: 'admin@marhahiwot.org' },
    update: {},
    create: { fullName: 'Admin User', email: 'admin@marhahiwot.org', passwordHash, role: Role.ADMINISTRATOR },
  });
  const financeOfficer = await prisma.user.upsert({
    where: { email: 'finance@marhahiwot.org' },
    update: {},
    create: { fullName: 'Finance Officer', email: 'finance@marhahiwot.org', passwordHash, role: Role.FINANCE_OFFICER },
  });
  const attendanceOfficer = await prisma.user.upsert({
    where: { email: 'attendance@marhahiwot.org' },
    update: {},
    create: { fullName: 'Attendance Officer', email: 'attendance@marhahiwot.org', passwordHash, role: Role.ATTENDANCE_OFFICER },
  });

  // ── Class groups (idempotent) ──
  const class1 = await prisma.classGroup.upsert({
    where: { level: ClassLevel.CLASS_1_3 }, update: {},
    create: { level: ClassLevel.CLASS_1_3, name: 'Class 1-3' },
  });
  const class2 = await prisma.classGroup.upsert({
    where: { level: ClassLevel.CLASS_4_6 }, update: {},
    create: { level: ClassLevel.CLASS_4_6, name: 'Class 4-6' },
  });
  const class3 = await prisma.classGroup.upsert({
    where: { level: ClassLevel.CLASS_7_12 }, update: {},
    create: { level: ClassLevel.CLASS_7_12, name: 'Class 7-12' },
  });
  const classes = [class1, class2, class3];

  // ── Teachers (delete & re-create for idempotency) ──
  await prisma.classGroup.update({ where: { id: class1.id }, data: { teachers: { set: [] } } });
  await prisma.classGroup.update({ where: { id: class2.id }, data: { teachers: { set: [] } } });
  await prisma.classGroup.update({ where: { id: class3.id }, data: { teachers: { set: [] } } });
  await prisma.teacher.deleteMany({});
  const teacher1 = await prisma.teacher.create({ data: { fullName: 'Deacon Samuel Girma', phone: '0911000001' } });
  const teacher2 = await prisma.teacher.create({ data: { fullName: 'Sister Ruth Alemu', phone: '0911000002' } });
  const teacher3 = await prisma.teacher.create({ data: { fullName: 'Deacon Yared Tesfaye', phone: '0911000003' } });
  await prisma.classGroup.update({ where: { id: class1.id }, data: { teachers: { connect: { id: teacher1.id } } } });
  await prisma.classGroup.update({ where: { id: class2.id }, data: { teachers: { connect: { id: teacher2.id } } } });
  await prisma.classGroup.update({ where: { id: class3.id }, data: { teachers: { connect: { id: teacher3.id } } } });

  // ── Students (idempotent via upsert on studentCode) ──
  const students = [];
  for (let i = 0; i < STUDENT_NAMES.length; i++) {
    const { en, am, gender } = STUDENT_NAMES[i];
    const cls = classes[i % classes.length];
    const isWorkingMember = cls.level === 'CLASS_7_12' && (i === 12 || i === 14);
    const studentCode = `MH-${String(i + 1).padStart(4, '0')}`;
    const student = await prisma.student.upsert({
      where: { studentCode },
      update: {
        fullName: en,
        fullNameAmharic: am,
        gender,
        classId: cls.id,
        isWorkingMember,
        monthlySalary: isWorkingMember ? 8000 + i * 250 : null,
      },
      create: {
        studentCode,
        fullName: en,
        fullNameAmharic: am,
        gender,
        dateOfBirth: new Date(2008 + (i % 12), i % 12, (i % 27) + 1),
        parentName: `${en.split(' ')[1]} Family`,
        parentPhone: `09${String(10000000 + i).padStart(8, '0')}`,
        classId: cls.id,
        isWorkingMember,
        monthlySalary: isWorkingMember ? 8000 + i * 250 : null,
        createdById: admin.id,
      },
    });
    students.push(student);
  }

  // ── Clear transactional seed data before re-creating ──
  await prisma.monthlyPayment.deleteMany({});
  await prisma.attendance.deleteMany({});
  await prisma.attendanceEvent.deleteMany({});
  await prisma.inactivationRecord.deleteMany({});
  await prisma.income.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.event.deleteMany({});

  // Reset all students to ACTIVE first (reapply inactive status below)
  await prisma.student.updateMany({ data: { status: 'ACTIVE' } });

  // --- Monthly fee payments (Ethiopian year 2017), varied progress per student ---
  const monthsOrder: EthiopianMonth[] = [
    'MESKEREM', 'TIKIMT', 'HIDAR', 'TAHSAS', 'TIR', 'YEKATIT',
    'MEGABIT', 'MIYAZIA', 'GINBOT', 'SENE', 'HAMLE', 'NEHASE', 'PAGUME',
  ];
  const ethiopianYear = 2017;

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const cls = classes.find((c) => c.id === student.classId)!;
    const baseAmount = student.isWorkingMember
      ? Math.round(Number(student.monthlySalary) * WORKING_MEMBER_RATE * 100) / 100
      : CLASS_MONTHLY_FEE[cls.level];

    const paidThrough = 3 + (i % 8);
    for (let m = 0; m < paidThrough; m++) {
      await prisma.monthlyPayment.create({
        data: {
          studentId: student.id,
          ethiopianYear,
          month: monthsOrder[m],
          status: 'PAID',
          baseAmount,
          penaltyAmount: 0,
          amount: baseAmount,
          paidDate: new Date(2025, m, 5),
          recordedById: financeOfficer.id,
        },
      });
    }
  }

  // --- Income & expenses ---
  const incomeCategories = Object.values(IncomeCategory);
  for (let i = 0; i < 15; i++) {
    await prisma.income.create({
      data: {
        date: new Date(2026, i % 7, (i % 27) + 1),
        amount: 200 + i * 37,
        category: incomeCategories[i % incomeCategories.length],
        description: 'Seed income record',
        recordedById: financeOfficer.id,
      },
    });
  }
  const expenseCategories = Object.values(ExpenseCategory);
  for (let i = 0; i < 15; i++) {
    await prisma.expense.create({
      data: {
        date: new Date(2026, i % 7, (i % 27) + 1),
        amount: 100 + i * 45,
        category: expenseCategories[i % expenseCategories.length],
        description: 'Seed expense record',
        recordedById: financeOfficer.id,
      },
    });
  }

  // --- Attendance: last 8 Sundays, with deliberate inactive/near-inactive/late cases ---
  const today = new Date();
  const sundays: Date[] = [];
  const cursor = new Date(today);
  while (sundays.length < 8) {
    if (cursor.getDay() === 0) sundays.push(new Date(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }
  sundays.reverse();

  for (const date of sundays) {
    const event = await prisma.attendanceEvent.create({ data: { date, eventType: 'SUNDAY_SCHOOL', title: '' } });
    const sundayIndex = sundays.indexOf(date);

    for (let i = 0; i < students.length; i++) {
      let status: AttendanceStatus = 'PRESENT';
      const last5 = sundayIndex >= sundays.length - 5;
      const last4 = sundayIndex >= sundays.length - 4;
      const last2 = sundayIndex >= sundays.length - 2;

      if (i === 1 && last5) status = 'ABSENT';
      else if (i === 3 && last4) status = 'ABSENT';
      else if (i === 5 && last2) status = 'ABSENT';
      else if (i % 6 === 0) status = 'PERMISSION';
      else if (i % 7 === 0) status = 'LATE';

      await prisma.attendance.create({
        data: { studentId: students[i].id, eventId: event.id, status, recordedById: attendanceOfficer.id },
      });
    }
  }

  // Mark student[1] inactive to reflect the 5-consecutive-absence automation, with a record.
  await prisma.student.update({ where: { id: students[1].id }, data: { status: 'INACTIVE' } });
  await prisma.inactivationRecord.create({
    data: {
      studentId: students[1].id,
      consecutiveAbsentDays: 5,
      lastAttendanceDate: sundays[sundays.length - 6],
      reason: '5 consecutive absences',
    },
  });

  // --- Events ---
  await prisma.event.create({
    data: {
      name: 'Christmas Retreat',
      date: new Date(2026, 0, 6),
      eventType: 'RETREAT',
      description: 'Annual Christmas retreat with all classes.',
      participatingClassIds: classes.map((c) => c.id),
      status: 'COMPLETED',
    },
  });
  await prisma.event.create({
    data: {
      name: 'Summer Camp',
      date: new Date(2026, 6, 20),
      eventType: 'CAMP',
      description: 'Weekend camp for Class 4-6 and Class 7-12.',
      participatingClassIds: [class2.id, class3.id],
      status: 'UPCOMING',
    },
  });
  await prisma.event.create({
    data: {
      name: 'Teachers Meeting',
      date: new Date(2026, 7, 2),
      eventType: 'MEETING',
      description: 'Monthly Sunday School teachers coordination meeting.',
      participatingClassIds: [],
      status: 'UPCOMING',
    },
  });

  console.log('Seed complete. Login with:');
  console.log('  admin@marhahiwot.org / Password123!');
  console.log('  finance@marhahiwot.org / Password123!');
  console.log('  attendance@marhahiwot.org / Password123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
