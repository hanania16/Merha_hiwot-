import { PrismaClient, Role, ClassLevel } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Setting up base data...');
  const passwordHash = await bcrypt.hash('Password123!', 10);

  await prisma.user.upsert({
    where: { email: 'admin@marhahiwot.org' },
    update: {},
    create: { fullName: 'Admin User', email: 'admin@marhahiwot.org', passwordHash, role: Role.ADMINISTRATOR },
  });
  await prisma.user.upsert({
    where: { email: 'finance@marhahiwot.org' },
    update: {},
    create: { fullName: 'Finance Officer', email: 'finance@marhahiwot.org', passwordHash, role: Role.FINANCE_OFFICER },
  });

  await prisma.classGroup.upsert({
    where: { level: ClassLevel.CLASS_1_3 }, update: {},
    create: { level: ClassLevel.CLASS_1_3, name: 'Class 1-3' },
  });
  await prisma.classGroup.upsert({
    where: { level: ClassLevel.CLASS_4_6 }, update: {},
    create: { level: ClassLevel.CLASS_4_6, name: 'Class 4-6' },
  });
  await prisma.classGroup.upsert({
    where: { level: ClassLevel.CLASS_7_12 }, update: {},
    create: { level: ClassLevel.CLASS_7_12, name: 'Class 7-12' },
  });

  console.log('Base data ready. Login with:');
  console.log('  admin@marhahiwot.org / Password123!');
  console.log('  finance@marhahiwot.org / Password123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
