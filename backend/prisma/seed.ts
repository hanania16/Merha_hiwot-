import {
  PrismaClient,
  Role,
  ClassLevel,
  Gender,
  GradeStatus,
  AcademicSemester,
  MessageCategory,
  CertificateTemplate,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding official Sunday School schedule, classes, courses, teachers, and users...');
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Users: Admin, Finance Officer, and all 7 Teachers from the schedule
  const admin = await prisma.user.upsert({
    where: { email: 'admin@marhahiwot.org' },
    update: { role: Role.ADMINISTRATOR, fullName: 'የሰንበት ት/ቤት አስተዳደር (Administrator)' },
    create: {
      fullName: 'የሰንበት ት/ቤት አስተዳደር (Administrator)',
      email: 'admin@marhahiwot.org',
      passwordHash,
      role: Role.ADMINISTRATOR,
    },
  });

  const finance = await prisma.user.upsert({
    where: { email: 'finance@marhahiwot.org' },
    update: { role: Role.FINANCE_OFFICER, fullName: 'የፋይናንስ ክፍል ኃላፊ (Finance Officer)' },
    create: {
      fullName: 'የፋይናንስ ክፍል ኃላፊ (Finance Officer)',
      email: 'finance@marhahiwot.org',
      passwordHash,
      role: Role.FINANCE_OFFICER,
    },
  });

  // Teacher 1: ዳዊት አብርሃም (Dawit Abreham)
  const teacherDawit = await prisma.user.upsert({
    where: { email: 'dawit.abreham@marhahiwot.org' },
    update: { role: Role.TEACHER, fullName: 'ዳዊት አብርሃም (Dawit Abreham)' },
    create: {
      fullName: 'ዳዊት አብርሃም (Dawit Abreham)',
      email: 'dawit.abreham@marhahiwot.org',
      passwordHash,
      role: Role.TEACHER,
    },
  });

  // Teacher 2: አቤኔዘር ግደይ (Abenezer Gidey)
  const teacherAbenezer = await prisma.user.upsert({
    where: { email: 'abenezer.gidey@marhahiwot.org' },
    update: { role: Role.TEACHER, fullName: 'አቤኔዘር ግደይ (Abenezer Gidey)' },
    create: {
      fullName: 'አቤኔዘር ግደይ (Abenezer Gidey)',
      email: 'abenezer.gidey@marhahiwot.org',
      passwordHash,
      role: Role.TEACHER,
    },
  });

  // Teacher 3: ብሩክ ክብረአብ (Biruk Kibreab)
  const teacherBiruk = await prisma.user.upsert({
    where: { email: 'biruk.kibreab@marhahiwot.org' },
    update: { role: Role.TEACHER, fullName: 'ብሩክ ክብረአብ (Biruk Kibreab)' },
    create: {
      fullName: 'ብሩክ ክብረአብ (Biruk Kibreab)',
      email: 'biruk.kibreab@marhahiwot.org',
      passwordHash,
      role: Role.TEACHER,
    },
  });

  // Teacher 4: መ/ር ሮቤል (Memhir Robel)
  const teacherRobel = await prisma.user.upsert({
    where: { email: 'robel@marhahiwot.org' },
    update: { role: Role.TEACHER, fullName: 'መ/ር ሮቤል (Memhir Robel)' },
    create: {
      fullName: 'መ/ር ሮቤል (Memhir Robel)',
      email: 'robel@marhahiwot.org',
      passwordHash,
      role: Role.TEACHER,
    },
  });

  // Teacher 5: መ/ር ባሻ (Memhir Basha)
  const teacherBasha = await prisma.user.upsert({
    where: { email: 'basha@marhahiwot.org' },
    update: { role: Role.TEACHER, fullName: 'መ/ር ባሻ (Memhir Basha)' },
    create: {
      fullName: 'መ/ር ባሻ (Memhir Basha)',
      email: 'basha@marhahiwot.org',
      passwordHash,
      role: Role.TEACHER,
    },
  });

  // Teacher 6: መ/ር መልካሙ (Memhir Melkamu)
  const teacherMelkamu = await prisma.user.upsert({
    where: { email: 'melkamu@marhahiwot.org' },
    update: { role: Role.TEACHER, fullName: 'መ/ር መልካሙ (Memhir Melkamu)' },
    create: {
      fullName: 'መ/ር መልካሙ (Memhir Melkamu)',
      email: 'melkamu@marhahiwot.org',
      passwordHash,
      role: Role.TEACHER,
    },
  });

  // Teacher 7: መ/ር መጋቤ ሐዲስ አበረሃም (Memhir Megabe Hadis Abreham)
  const teacherMegabeHadis = await prisma.user.upsert({
    where: { email: 'megabehadis.abreham@marhahiwot.org' },
    update: { role: Role.TEACHER, fullName: 'መ/ር መጋቤ ሐዲስ አበረሃም (Megabe Hadis Abreham)' },
    create: {
      fullName: 'መ/ር መጋቤ ሐዲስ አበረሃም (Megabe Hadis Abreham)',
      email: 'megabehadis.abreham@marhahiwot.org',
      passwordHash,
      role: Role.TEACHER,
    },
  });

  console.log('✓ All 7 teachers and administrative user accounts created.');

  // 2. Class Groups
  let class1_3 = await prisma.classGroup.findFirst({
    where: { level: ClassLevel.CLASS_1_3 },
  });
  if (!class1_3) {
    class1_3 = await prisma.classGroup.create({
      data: { level: ClassLevel.CLASS_1_3, name: 'ክፍል 1-3 (ሕፃናት)' },
    });
  }

  let class4_6 = await prisma.classGroup.findFirst({
    where: { level: ClassLevel.CLASS_4_6 },
  });
  if (!class4_6) {
    class4_6 = await prisma.classGroup.create({
      data: { level: ClassLevel.CLASS_4_6, name: 'ማዕከላውያን (4ኛ እና 5ኛ ክፍል)' },
    });
  }

  let class7_12 = await prisma.classGroup.findFirst({
    where: { level: ClassLevel.CLASS_7_12 },
  });
  if (!class7_12) {
    class7_12 = await prisma.classGroup.create({
      data: { level: ClassLevel.CLASS_7_12, name: 'ወጣቶች (7ኛ ክፍል)' },
    });
  }

  // 3. Courses - Official Schedule from User Document
  const officialCourses = [
    // --- ማዕከላውያን ---
    {
      code: 'MAK-MEZ-01',
      name: 'Mezmur (Intermediate)',
      nameAmharic: 'መዝሙር (ማዕከላውያን)',
      classLevel: ClassLevel.CLASS_4_6,
      targetGrade: 'ማዕከላውያን',
      scheduleTime: 'ቅዳሜ 8:00 - 10:00',
      semester: AcademicSemester.SEMESTER_1,
      maxScore: 100,
      passScore: 50,
      description: 'የማዕከላውያን የቅዳሜ መዝሙር ትምህርት እና ልምምድ (8:00 - 10:00)',
      teacherId: null,
    },
    // 4ኛ ክፍል
    {
      code: 'ETH-G4',
      name: 'Christian Ethics (Grade 4)',
      nameAmharic: 'ክርስቲያናዊ ስነምግባር (4ኛ ክፍል)',
      classLevel: ClassLevel.CLASS_4_6,
      targetGrade: '4ኛ ክፍል',
      scheduleTime: 'እሁድ 3:30 - 4:30',
      semester: AcademicSemester.SEMESTER_1,
      maxScore: 100,
      passScore: 50,
      description: 'ክርስቲያናዊ ሥነ ምግባር ለ4ኛ ክፍል ማዕከላውያን (እሁድ 3:30 - 4:30)',
      teacherId: teacherDawit.id,
    },
    {
      code: 'BIB-G4',
      name: 'Bible Study (Grade 4)',
      nameAmharic: 'የመጽሃፍ ቅዱስ ጥናት (4ኛ ክፍል)',
      classLevel: ClassLevel.CLASS_4_6,
      targetGrade: '4ኛ ክፍል',
      scheduleTime: 'እሁድ 4:30 - 5:30',
      semester: AcademicSemester.SEMESTER_1,
      maxScore: 100,
      passScore: 50,
      description: 'የመጽሐፍ ቅዱስ ጥናት ለ4ኛ ክፍል ማዕከላውያን (እሁድ 4:30 - 5:30)',
      teacherId: teacherAbenezer.id,
    },
    {
      code: 'DOG-G4',
      name: 'Fundamentals of Faith (Grade 4)',
      nameAmharic: 'መሰረተ ኃይማኖት (4ኛ ክፍል)',
      classLevel: ClassLevel.CLASS_4_6,
      targetGrade: '4ኛ ክፍል',
      scheduleTime: 'እሁድ 5:30 - 6:30',
      semester: AcademicSemester.SEMESTER_1,
      maxScore: 100,
      passScore: 50,
      description: 'መሰረተ ሃይማኖት ለ4ኛ ክፍል ማዕከላውያን (እሁድ 5:30 - 6:30)',
      teacherId: teacherBiruk.id,
    },
    // 5ኛ ክፍል
    {
      code: 'ETH-G5',
      name: 'Christian Ethics (Grade 5)',
      nameAmharic: 'ክርስቲያናዊ ስነምግባር (5ኛ ክፍል)',
      classLevel: ClassLevel.CLASS_4_6,
      targetGrade: '5ኛ ክፍል',
      scheduleTime: 'እሁድ 3:30 - 4:30',
      semester: AcademicSemester.SEMESTER_1,
      maxScore: 100,
      passScore: 50,
      description: 'ክርስቲያናዊ ሥነ ምግባር ለ5ኛ ክፍል ማዕከላውያን (እሁድ 3:30 - 4:30)',
      teacherId: teacherBiruk.id,
    },
    {
      code: 'BIB-G5',
      name: 'Bible Study (Grade 5)',
      nameAmharic: 'የመጽሃፍ ቅዱስ ጥናት (5ኛ ክፍል)',
      classLevel: ClassLevel.CLASS_4_6,
      targetGrade: '5ኛ ክፍል',
      scheduleTime: 'እሁድ 4:30 - 5:30',
      semester: AcademicSemester.SEMESTER_1,
      maxScore: 100,
      passScore: 50,
      description: 'የመጽሐፍ ቅዱስ ጥናት ለ5ኛ ክፍል ማዕከላውያን (እሁድ 4:30 - 5:30)',
      teacherId: teacherDawit.id,
    },
    {
      code: 'DOG-G5',
      name: 'Fundamentals of Faith (Grade 5)',
      nameAmharic: 'መሰረተ ኃይማኖት (5ኛ ክፍል)',
      classLevel: ClassLevel.CLASS_4_6,
      targetGrade: '5ኛ ክፍል',
      scheduleTime: 'እሁድ 5:30 - 6:30',
      semester: AcademicSemester.SEMESTER_1,
      maxScore: 100,
      passScore: 50,
      description: 'መሰረተ ሃይማኖት ለ5ኛ ክፍል ማዕከላውያን (እሁድ 5:30 - 6:30)',
      teacherId: teacherAbenezer.id,
    },

    // --- ወጣቶች ---
    {
      code: 'WET-MEZ-01',
      name: 'Mezmur (Youth)',
      nameAmharic: 'መዝሙር (ወጣቶች)',
      classLevel: ClassLevel.CLASS_7_12,
      targetGrade: 'ወጣቶች',
      scheduleTime: 'ቅዳሜ 7:30 - 10:00',
      semester: AcademicSemester.SEMESTER_1,
      maxScore: 100,
      passScore: 50,
      description: 'የወጣቶች የቅዳሜ መዝሙር ትምህርት እና ልምምድ (7:30 - 10:00)',
      teacherId: null,
    },
    {
      code: 'LIT-WET-01',
      name: 'Church Order & Liturgy (Youth)',
      nameAmharic: 'ስርዓተ ቤ/ክ (ወጣቶች)',
      classLevel: ClassLevel.CLASS_7_12,
      targetGrade: 'ወጣቶች',
      scheduleTime: 'ቅዳሜ 10:00 - 12:00',
      semester: AcademicSemester.SEMESTER_1,
      maxScore: 100,
      passScore: 50,
      description: 'ሥርዓተ ቤተክርስቲያን ትምህርት ለወጣቶች (ቅዳሜ 10:00 - 12:00)',
      teacherId: teacherRobel.id,
    },
    // 7ኛ ክፍል (1ኛ ሴሚስተር)
    {
      code: 'ETH-G7-S1',
      name: 'Christian Ethics (Grade 7)',
      nameAmharic: 'ክርስቲያናዊ ስነምግባር (7ኛ ክፍል)',
      classLevel: ClassLevel.CLASS_7_12,
      targetGrade: '7ኛ ክፍል',
      scheduleTime: 'እሁድ 3:30 - 4:30',
      semester: AcademicSemester.SEMESTER_1,
      maxScore: 100,
      passScore: 50,
      description: 'ክርስቲያናዊ ስነምግባር ለ7ኛ ክፍል ወጣቶች (እሁድ 3:30 - 4:30)',
      teacherId: teacherBasha.id,
    },
    {
      code: 'DOG-G7-S1',
      name: 'Fundamentals of Faith (Grade 7)',
      nameAmharic: 'መሰረተ ኃይማኖት (7ኛ ክፍል)',
      classLevel: ClassLevel.CLASS_7_12,
      targetGrade: '7ኛ ክፍል',
      scheduleTime: 'እሁድ 4:30 - 5:30',
      semester: AcademicSemester.SEMESTER_1,
      maxScore: 100,
      passScore: 50,
      description: 'መሰረተ ሃይማኖት ለ7ኛ ክፍል ወጣቶች (እሁድ 4:30 - 5:30)',
      teacherId: teacherMelkamu.id,
    },
    // 7ኛ ክፍል (2ኛ ሴሚስተር)
    {
      code: 'GEEZ-G7-S2',
      name: "Ge'ez Language (Grade 7 - Sem 2)",
      nameAmharic: 'ልሳነ ግዕዝ (7ኛ ክፍል)',
      classLevel: ClassLevel.CLASS_7_12,
      targetGrade: '7ኛ ክፍል (2ኛ ሴሚስተር)',
      scheduleTime: 'እሁድ 9:00 - 10:00',
      semester: AcademicSemester.SEMESTER_2,
      maxScore: 100,
      passScore: 50,
      description: 'ልሳነ ግዕዝ ለ7ኛ ክፍል 2ኛ ሴሚስተር (እሁድ 9:00 - 10:00)',
      teacherId: teacherMegabeHadis.id,
    },
    {
      code: 'HIST-G7-S2',
      name: 'Church History (Grade 7 - Sem 2)',
      nameAmharic: 'የቤ/ክ ታሪክ (7ኛ ክፍል)',
      classLevel: ClassLevel.CLASS_7_12,
      targetGrade: '7ኛ ክፍል (2ኛ ሴሚስተር)',
      scheduleTime: 'እሁድ 10:00 - 12:00',
      semester: AcademicSemester.SEMESTER_2,
      maxScore: 100,
      passScore: 50,
      description: 'የኢትዮጵያ ኦርቶዶክስ ተዋሕዶ ቤተክርስቲያን ታሪክ ለ7ኛ ክፍል 2ኛ ሴሚስተር (እሁድ 10:00 - 12:00)',
      teacherId: teacherRobel.id,
    },
  ];

  const courses: Record<string, any> = {};
  for (const c of officialCourses) {
    const record = await prisma.course.upsert({
      where: { code: c.code },
      update: {
        name: c.name,
        nameAmharic: c.nameAmharic,
        targetGrade: c.targetGrade,
        scheduleTime: c.scheduleTime,
        semester: c.semester,
        teacherId: c.teacherId,
        description: c.description,
      },
      create: c,
    });
    courses[c.code] = record;
  }
  console.log(`✓ Seeded ${officialCourses.length} official courses with teachers and schedule times.`);

  // 4. Students
  const studentsData = [
    // 7ኛ ክፍል (ወጣቶች)
    {
      studentCode: 'MH-0001',
      fullName: 'Bereket Hailu',
      fullNameAmharic: 'በረከት ኃይሉ',
      gender: Gender.MALE,
      dateOfBirth: new Date('2008-04-12'),
      parentName: 'ኃይሉ ወልደማርያም',
      parentPhone: '0911223344',
      studentPhone: '0922334455',
      classId: class7_12.id,
    },
    {
      studentCode: 'MH-0002',
      fullName: 'Selamawit Kebede',
      fullNameAmharic: 'ሰላማዊት ከበደ',
      gender: Gender.FEMALE,
      dateOfBirth: new Date('2008-08-20'),
      parentName: 'ከበደ ታፈሰ',
      parentPhone: '0911334455',
      studentPhone: '0933445566',
      classId: class7_12.id,
    },
    {
      studentCode: 'MH-0003',
      fullName: 'Yared Fikre',
      fullNameAmharic: 'ያሬድ ፍቅሬ',
      gender: Gender.MALE,
      dateOfBirth: new Date('2007-11-15'),
      parentName: 'ፍቅሬ ዘውዴ',
      parentPhone: '0911445566',
      classId: class7_12.id,
    },
    // 4ኛ እና 5ኛ ክፍል (ማዕከላውያን)
    {
      studentCode: 'MH-0004',
      fullName: 'Hana Tesfaye',
      fullNameAmharic: 'ሐና ተስፋዬ',
      gender: Gender.FEMALE,
      dateOfBirth: new Date('2011-02-10'),
      parentName: 'ተስፋዬ አስፋው',
      parentPhone: '0911556677',
      classId: class4_6.id,
    },
    {
      studentCode: 'MH-0005',
      fullName: 'Daniel Yohannes',
      fullNameAmharic: 'ዳንኤል ዮሐንስ',
      gender: Gender.MALE,
      dateOfBirth: new Date('2011-06-25'),
      parentName: 'ዮሐንስ ገብሬ',
      parentPhone: '0911667788',
      classId: class4_6.id,
    },
    {
      studentCode: 'MH-0006',
      fullName: 'Tewodros Girma',
      fullNameAmharic: 'ቴዎድሮስ ግርማ',
      gender: Gender.MALE,
      dateOfBirth: new Date('2012-01-30'),
      parentName: 'ግርማ በቀለ',
      parentPhone: '0911778899',
      classId: class4_6.id,
    },
    {
      studentCode: 'MH-0007',
      fullName: 'Ruth Solomon',
      fullNameAmharic: 'ሩት ሰሎሞን',
      gender: Gender.FEMALE,
      dateOfBirth: new Date('2012-09-14'),
      parentName: 'ሰሎሞን ካሳ',
      parentPhone: '0911889900',
      classId: class4_6.id,
    },
    // 1-3
    {
      studentCode: 'MH-0008',
      fullName: 'Natnael Mesfin',
      fullNameAmharic: 'ናትናኤል መስፍን',
      gender: Gender.MALE,
      dateOfBirth: new Date('2015-05-18'),
      parentName: 'መስፍን ዓለሙ',
      parentPhone: '0911990011',
      classId: class1_3.id,
    },
  ];

  const students: Record<string, any> = {};
  for (const s of studentsData) {
    const record = await prisma.student.upsert({
      where: { studentCode: s.studentCode },
      update: {
        fullName: s.fullName,
        fullNameAmharic: s.fullNameAmharic,
        classId: s.classId,
      },
      create: s,
    });
    students[s.studentCode] = record;
  }
  console.log(`✓ Seeded ${studentsData.length} students across class levels.`);

  // 5. Initial Grades & Points Submissions
  // 4ኛ ክፍል: Dawit Abreham (ETH-G4), Abenezer Gidey (BIB-G4), Biruk Kibreab (DOG-G4)
  const sampleGrades = [
    // Hana Tesfaye (MH-0004) - 4ኛ ክፍል
    {
      studentId: students['MH-0004'].id,
      courseId: courses['ETH-G4'].id,
      ethiopianYear: 2018,
      semester: AcademicSemester.SEMESTER_1,
      assessmentScore: 19,
      midExamScore: 28,
      finalExamScore: 47,
      conductScore: 5,
      totalScore: 99,
      letterGrade: 'A+',
      status: GradeStatus.APPROVED,
      submittedById: teacherDawit.id,
      approvedById: admin.id,
      remarks: 'እጅግ የላቀ ክርስቲያናዊ ስነ ምግባርና ተሳትፎ',
    },
    {
      studentId: students['MH-0004'].id,
      courseId: courses['BIB-G4'].id,
      ethiopianYear: 2018,
      semester: AcademicSemester.SEMESTER_1,
      assessmentScore: 18,
      midExamScore: 27,
      finalExamScore: 45,
      conductScore: 5,
      totalScore: 95,
      letterGrade: 'A',
      status: GradeStatus.APPROVED,
      submittedById: teacherAbenezer.id,
      approvedById: admin.id,
      remarks: 'የመጽሐፍ ቅዱስ ጥቅሶችን በደንብ የተገነዘበች',
    },
    {
      studentId: students['MH-0004'].id,
      courseId: courses['DOG-G4'].id,
      ethiopianYear: 2018,
      semester: AcademicSemester.SEMESTER_1,
      assessmentScore: 17,
      midExamScore: 26,
      finalExamScore: 44,
      conductScore: 5,
      totalScore: 92,
      letterGrade: 'A',
      status: GradeStatus.APPROVED,
      submittedById: teacherBiruk.id,
      approvedById: admin.id,
      remarks: 'ጥሩ ውጤት',
    },

    // Daniel Yohannes (MH-0005) - 4ኛ ክፍል
    {
      studentId: students['MH-0005'].id,
      courseId: courses['ETH-G4'].id,
      ethiopianYear: 2018,
      semester: AcademicSemester.SEMESTER_1,
      assessmentScore: 16,
      midExamScore: 24,
      finalExamScore: 40,
      conductScore: 5,
      totalScore: 85,
      letterGrade: 'A',
      status: GradeStatus.SUBMITTED,
      submittedById: teacherDawit.id,
      approvedById: null,
      remarks: 'ታታሪ ተማሪ',
    },
    {
      studentId: students['MH-0005'].id,
      courseId: courses['BIB-G4'].id,
      ethiopianYear: 2018,
      semester: AcademicSemester.SEMESTER_1,
      assessmentScore: 15,
      midExamScore: 23,
      finalExamScore: 38,
      conductScore: 4,
      totalScore: 80,
      letterGrade: 'B+',
      status: GradeStatus.SUBMITTED,
      submittedById: teacherAbenezer.id,
      approvedById: null,
      remarks: 'ጥሩ ጥረት',
    },

    // Bereket Hailu (MH-0001) - 7ኛ ክፍል
    {
      studentId: students['MH-0001'].id,
      courseId: courses['ETH-G7-S1'].id,
      ethiopianYear: 2018,
      semester: AcademicSemester.SEMESTER_1,
      assessmentScore: 18,
      midExamScore: 28,
      finalExamScore: 46,
      conductScore: 5,
      totalScore: 97,
      letterGrade: 'A+',
      status: GradeStatus.APPROVED,
      submittedById: teacherBasha.id,
      approvedById: admin.id,
      remarks: 'የተሟላ ሥነ ምግባርና ንቁ ተሳትፎ',
    },
    {
      studentId: students['MH-0001'].id,
      courseId: courses['DOG-G7-S1'].id,
      ethiopianYear: 2018,
      semester: AcademicSemester.SEMESTER_1,
      assessmentScore: 17,
      midExamScore: 27,
      finalExamScore: 44,
      conductScore: 5,
      totalScore: 93,
      letterGrade: 'A',
      status: GradeStatus.APPROVED,
      submittedById: teacherMelkamu.id,
      approvedById: admin.id,
      remarks: 'ጥሩ ግንዛቤ',
    },
    {
      studentId: students['MH-0001'].id,
      courseId: courses['LIT-WET-01'].id,
      ethiopianYear: 2018,
      semester: AcademicSemester.SEMESTER_1,
      assessmentScore: 19,
      midExamScore: 29,
      finalExamScore: 48,
      conductScore: 5,
      totalScore: 101,
      letterGrade: 'A+',
      status: GradeStatus.APPROVED,
      submittedById: teacherRobel.id,
      approvedById: admin.id,
      remarks: 'በቅዳሜ ስርዓተ ቤ/ክ ትምህርት የላቀ ተሳትፎ',
    },
  ];

  for (const g of sampleGrades) {
    await prisma.studentGrade.upsert({
      where: {
        studentId_courseId_ethiopianYear_semester: {
          studentId: g.studentId,
          courseId: g.courseId,
          ethiopianYear: g.ethiopianYear,
          semester: g.semester,
        },
      },
      update: g,
      create: g,
    });
  }
  console.log(`✓ Seeded ${sampleGrades.length} sample points submissions.`);

  // 6. Teacher-Admin Communications (Notice Board)
  const scheduleNotice = `በስመ አብ ወወልድ ወመንፈስቅዱስ አሃዱ አምላክ አሜን!

የ2018 ዓ.ም የሰንበት ትምህርት ቤት ሳምንታዊ የትምህርት ፕሮግራም፡

◆ ማዕከላውያን
• ቅዳሜ፡ መዝሙር (8፡00 - 10፡00)
• እሁድ 4ኛ ክፍል፡
  - 3፡30 - 4፡30: ክርስቲያናዊ ስነምግባር (መምህር ዳዊት አብርሃም)
  - 4፡30 - 5፡30: የመጽሃፍ ቅዱስ ጥናት (መምህር አቤኔዘር ግደይ)
  - 5፡30 - 6፡30: መሰረተ ኃይማኖት (መምህር ብሩክ ክብረአብ)
• እሁድ 5ኛ ክፍል፡
  - 3፡30 - 4፡30: ክርስቲያናዊ ስነምግባር (መምህር ብሩክ ክብረአብ)
  - 4፡30 - 5፡30: የመጽሃፍ ቅዱስ ጥናት (መምህር ዳዊት አብርሃም)
  - 5፡30 - 6፡30: መሰረተ ኃይማኖት (መምህር አቤኔዘር ግደይ)

◆ ወጣቶች
• ቅዳሜ፡
  - 7፡30 - 10፡00: መዝሙር
  - 10፡00 - 12፡00: ስርዓተ ቤ/ክ (መ/ር ሮቤል)
• እሁድ 7ኛ ክፍል (1ኛ ሴሚስተር)፡
  - 3፡30 - 4፡30: ክርስቲያናዊ ስነምግባር (መ/ር ባሻ)
  - 4፡30 - 5፡30: መሰረተ ኃይማኖት (መ/ር መልካሙ)
• እሁድ 7ኛ ክፍል (2ኛ ሴሚስተር)፡
  - 9፡00 - 10፡00: ልሳነ ግዕዝ (መ/ር መጋቤ ሐዲስ አበረሃም)
  - 10፡00 - 12፡00: የቤ/ክ ታሪክ (መ/ር ሮቤል)

ወስብሃት ለእግዚአብሔር ወለወላዲቱ ድንግል ወለመስቀሉ ክቡር አሜን!`;

  await prisma.departmentMessage.createMany({
    data: [
      {
        senderId: admin.id,
        title: 'የማዕከላውያን እና የወጣቶች ይፋዊ የትምህርት ፕሮግራም',
        content: scheduleNotice,
        category: MessageCategory.CURRICULUM,
        targetAudience: 'ALL',
        isPinned: true,
      },
      {
        senderId: teacherDawit.id,
        title: 'የ4ኛ ክፍል ክርስቲያናዊ ስነ ምግባር ውጤት መዝገብ',
        content: 'ለክቡር ትምህርት ክፍል ኃላፊ፤ የ4ኛ ክፍል ተማሪዎች የ1ኛ መንፈቀ ዓመት ምዘና እና አጋማሽ ፈተና ውጤት በሙሉ ተጠናቆ በሲስተሙ ተልኳል። እንድታጸድቁልን በአክብሮት እንጠይቃለን።',
        category: MessageCategory.EXAM_SCHEDULE,
        targetAudience: 'ADMIN',
        isPinned: false,
      },
      {
        senderId: teacherRobel.id,
        title: 'የወጣቶች የስርዓተ ቤተክርስቲያን መማሪያ ማስታወሻ',
        content: 'የቅዳሜ የ10፡00 - 12፡00 የወጣቶች ስርዓተ ቤ/ክ ትምህርት አጋዥ ማስታወሻ ተዘጋጅቷል፤ በቢሮ በኩል ለተማሪዎች እንዲባዛ ይደረግልን።',
        category: MessageCategory.GENERAL,
        targetAudience: 'ALL',
        isPinned: false,
      },
    ],
    skipDuplicates: true,
  });
  console.log('✓ Seeded official schedule notice and teacher communications.');

  // 7. Sample Certificate Record with Ethiopian Format
  await prisma.certificateRecord.upsert({
    where: { certificateNumber: 'MH-CERT-2018-001' },
    update: {},
    create: {
      certificateNumber: 'MH-CERT-2018-001',
      studentId: students['MH-0001'].id,
      templateType: CertificateTemplate.HONOR_EXCELLENCE,
      titleAmharic: 'የልህቀት እና የክብር ምስክር ወረቀት',
      titleEnglish: 'Certificate of Academic Excellence & Honor',
      recipientNameAmharic: 'በረከት ኃይሉ',
      recipientNameEnglish: 'Bereket Hailu',
      courseOrClass: 'ወጣቶች - 7ኛ ክፍል (ስርዓተ ቤ/ክ እና ክርስቲያናዊ ስነ ምግባር)',
      academicYear: 2018,
      issueDateEthiopian: 'ጥቅምት 13 ቀን 2018 ዓ.ም',
      customMessageAmharic:
        'በመርሃ ህይወት ሰንበት ትምህርት ቤት በትምህርት ክፍለ ጊዜ በትጋት በመከታተል፣ በሥነ ምግባርና በውጤት የላቀ አርአያነት ላሳየው ተማሪ ይህ የክብር ምስክር ወረቀት ተበርክቶለታል።',
      bibleVerseAmharic: '«የእግዚአብሔር ፍርሃት የጥበብ መጀመሪያ ነው፤ ለሚያደርጓትም ሁሉ መልካም ማስተዋል አላቸው።» (መዝ 111፥10)',
      overallGrade: '97% (A+)',
      rankText: '1ኛ ደረጃ',
      signatory1Title: 'የክፍሉ መምህር',
      signatory1Name: 'መምህር ባሻ',
      signatory2Title: 'የትምህርት ክፍል ኃላፊ',
      signatory2Name: 'ዲ/ን ዮሐንስ',
      signatory3Title: 'የሰ/ት/ቤቱ ሰብሳቢ',
      signatory3Name: 'መጋቤ ሐዲስ አበረሃም',
      borderStyle: 'ETHIOPIC_GOLD_DOUBLE',
      themeColor: '#D4AF37',
      createdById: admin.id,
    },
  });
  console.log('✓ Seeded sample official certificate.');
  console.log('Setup finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
