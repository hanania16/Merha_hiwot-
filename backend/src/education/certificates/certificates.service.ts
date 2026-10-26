import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CertificateTemplate, ClassLevel, AcademicSemester, Role } from '@prisma/client';
import { computeGrade } from '../grades/grades.service';

export interface GenerateCertificateDto {
  studentId: string;
  templateType?: CertificateTemplate;
  titleAmharic?: string;
  titleEnglish?: string;
  recipientNameAmharic?: string;
  recipientNameEnglish?: string;
  courseOrClass?: string;
  academicYear?: number;
  issueDateEthiopian?: string;
  overallGrade?: string;
  rankText?: string;
  numberOfCourses?: number;
  totalScore?: number;
  averageScore?: number;
  rankInClass?: number;
  totalStudentsInClass?: number;
  courseBreakdown?: any;
  customMessageAmharic?: string;
  bibleVerseAmharic?: string;
  signatory1Title?: string;
  signatory1Name?: string;
  signatory1Signature?: string;
  signatory2Title?: string;
  signatory2Name?: string;
  signatory2Signature?: string;
  signatory3Title?: string;
  signatory3Name?: string;
  signatory3Signature?: string;
  borderStyle?: string;
  themeColor?: string;
}

export interface GenerateClassCertificatesDto {
  classLevel?: ClassLevel;
  classId?: string;
  courseIds: string[];
  ethiopianYear?: number;
  semester?: AcademicSemester;
  templateType?: CertificateTemplate;
  titleAmharic?: string;
  titleEnglish?: string;
  issueDateEthiopian?: string;
  customMessageAmharic?: string;
  bibleVerseAmharic?: string;
  signatory1Title?: string;
  signatory1Name?: string;
  signatory1Signature?: string;
  signatory2Title?: string;
  signatory2Name?: string;
  signatory2Signature?: string;
  signatory3Title?: string;
  signatory3Name?: string;
  signatory3Signature?: string;
  borderStyle?: string;
  themeColor?: string;
}

@Injectable()
export class CertificatesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.certificateRecord.findMany({
      include: {
        student: {
          select: {
            id: true,
            studentCode: true,
            fullName: true,
            fullNameAmharic: true,
            gender: true,
            dateOfBirth: true,
            class: { select: { id: true, name: true, level: true } },
          },
        },
        createdBy: {
          select: { id: true, fullName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const cert = await this.prisma.certificateRecord.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            studentCode: true,
            fullName: true,
            fullNameAmharic: true,
            gender: true,
            dateOfBirth: true,
            photoUrl: true,
            class: { select: { id: true, name: true, level: true } },
          },
        },
        createdBy: {
          select: { id: true, fullName: true },
        },
      },
    });
    if (!cert) throw new NotFoundException('Certificate not found');
    return cert;
  }

  async generate(dto: GenerateCertificateDto, userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
      include: { class: true },
    });
    if (!student) throw new NotFoundException('Student not found');

    const count = await this.prisma.certificateRecord.count();
    const certNum = `MH-CERT-${dto.academicYear || 2018}-${String(count + 1).padStart(4, '0')}`;

    const template = dto.templateType || CertificateTemplate.HONOR_EXCELLENCE;

    let defaultTitleAmharic = 'የክብር ምስክር ወረቀት';
    let defaultTitleEnglish = 'Certificate of Academic Honor';
    let defaultMsg =
      'በደብረ አሚን መርሃ ህይወት ሰንበት ትምህርት ቤት በመንፈሳዊ ትምህርቱ ከፍተኛ ትጋት በማሳየት ላጠናቀቀው ተማሪ የተሰጠ የምስክር ወረቀት።';

    if (template === CertificateTemplate.STANDARD_COMPLETION) {
      defaultTitleAmharic = 'የምርቃት ምስክር ወረቀት';
      defaultTitleEnglish = 'Certificate of Graduation';
      defaultMsg =
        'በደብረ አሚን መርሃ ህይወት ሰንበት ትምህርት ቤት የተዘጋጀውን መንፈሳዊ የትምህርት መርሃ ግብር በተሳካ ሁኔታ ላጠናቀቀው ተማሪ የተሰጠ።';
    } else if (template === CertificateTemplate.DISTINGUISHED_SERVICE) {
      defaultTitleAmharic = 'የላቀ አገልግሎት ምስክር ወረቀት';
      defaultTitleEnglish = 'Certificate of Distinguished Service';
      defaultMsg =
        'በደብረ አሚን መርሃ ህይወት ሰንበት ትምህርት ቤት በታማኝነት፣ በትጋትና በቅንነት ላበረከተው የላቀ አገልግሎት የተሰጠ የክብር ምስክር ወረቀት።';
    } else if (template === CertificateTemplate.PARTICIPATION) {
      defaultTitleAmharic = 'የተሳትፎ ምስክር ወረቀት';
      defaultTitleEnglish = 'Certificate of Participation';
      defaultMsg =
        'በደብረ አሚን መርሃ ህይወት ሰንበት ትምህርት ቤት በተዘጋጀው መንፈሳዊ ጉባኤ እና የሥልጠና መርሃ ግብር ላይ በንቃት ለተሳተፈ ተማሪ የተሰጠ።';
    }

    return this.prisma.certificateRecord.create({
      data: {
        certificateNumber: certNum,
        studentId: student.id,
        templateType: template,
        titleAmharic: dto.titleAmharic?.trim() || defaultTitleAmharic,
        titleEnglish: dto.titleEnglish?.trim() || defaultTitleEnglish,
        recipientNameAmharic:
          dto.recipientNameAmharic?.trim() || student.fullNameAmharic || student.fullName,
        recipientNameEnglish: dto.recipientNameEnglish?.trim() || student.fullName,
        courseOrClass: dto.courseOrClass?.trim() || student.class.name,
        academicYear: dto.academicYear || 2018,
        issueDateEthiopian: dto.issueDateEthiopian?.trim() || 'ሰኔ 30 ቀን 2018 ዓ.ም',
        overallGrade: dto.overallGrade?.trim() || null,
        rankText: dto.rankText?.trim() || null,
        numberOfCourses: dto.numberOfCourses ?? null,
        totalScore: dto.totalScore !== undefined ? dto.totalScore : null,
        averageScore: dto.averageScore !== undefined ? dto.averageScore : null,
        rankInClass: dto.rankInClass ?? null,
        totalStudentsInClass: dto.totalStudentsInClass ?? null,
        courseBreakdown: dto.courseBreakdown || undefined,
        customMessageAmharic: dto.customMessageAmharic?.trim() || defaultMsg,
        bibleVerseAmharic:
          dto.bibleVerseAmharic?.trim() ||
          '«በሃይማኖት ጸንታችሁ ቁሙ፣ ጎልምሱ፣ በረቱም፤ ሁሉ በእናንተ በፍቅር ይሁን።» (1ኛ ቆሮ. 16:13)',
        signatory1Title: dto.signatory1Title?.trim() || 'የክፍሉ መምህር',
        signatory1Name: dto.signatory1Name?.trim() || 'መምህር ተክለ ማርያም',
        signatory1Signature: dto.signatory1Signature || null,
        signatory2Title: dto.signatory2Title?.trim() || 'የትምህርት ክፍል ኃላፊ',
        signatory2Name: dto.signatory2Name?.trim() || 'ዲ/ን ዮሐንስ ወ/ሥላሴ',
        signatory2Signature: dto.signatory2Signature || null,
        signatory3Title: dto.signatory3Title?.trim() || 'የሰንበት ት/ቤቱ ሰብሳቢ',
        signatory3Name: dto.signatory3Name?.trim() || 'መጋቤ ሐዲስ ኃይለ ሚካኤል',
        signatory3Signature: dto.signatory3Signature || null,
        borderStyle: dto.borderStyle || 'ETHIOPIC_GOLD_DOUBLE',
        themeColor: dto.themeColor || '#D4AF37',
        createdById: userId,
      },
      include: {
        student: {
          select: { id: true, studentCode: true, fullName: true, fullNameAmharic: true },
        },
      },
    });
  }

  /**
   * Generates certificates in bulk for a whole class from submitted course rosters.
   * Calculates: Number of courses, Sum of total points, Average %, and Rank from whole class!
   */
  async generateClassCertificates(dto: GenerateClassCertificatesDto, userId: string) {
    const year = dto.ethiopianYear ?? 2018;
    const semester = dto.semester ?? AcademicSemester.SEMESTER_1;

    // 1. Find class and students
    let studentsWhere: any = { status: 'ACTIVE' };
    if (dto.classId) {
      studentsWhere.classId = dto.classId;
    } else if (dto.classLevel) {
      studentsWhere.class = { level: dto.classLevel };
    }

    const students = await this.prisma.student.findMany({
      where: studentsWhere,
      include: { class: true },
      orderBy: { fullName: 'asc' },
    });

    if (students.length === 0) {
      throw new NotFoundException('No active students found in the selected class');
    }

    // 2. Fetch grades for these courses
    const grades = await this.prisma.studentGrade.findMany({
      where: {
        studentId: { in: students.map((s) => s.id) },
        courseId: { in: dto.courseIds },
        ethiopianYear: year,
        semester,
      },
      include: {
        course: {
          select: {
            id: true,
            code: true,
            name: true,
            nameAmharic: true,
            teacherId: true,
            teacher: { select: { fullName: true, signatureUrl: true } },
          },
        },
      },
    });

    // 3. Resolve default signatures if not explicitly provided
    let defaultSignatory1Signature = dto.signatory1Signature || null;
    let defaultSignatory2Signature = dto.signatory2Signature || null;
    let defaultSignatory3Signature = dto.signatory3Signature || null;

    if (!defaultSignatory1Signature) {
      // Pick first course teacher's signature
      const teacherWithSig = grades.find((g) => g.course?.teacher?.signatureUrl)?.course?.teacher;
      if (teacherWithSig?.signatureUrl) {
        defaultSignatory1Signature = teacherWithSig.signatureUrl;
      }
    }

    if (!defaultSignatory2Signature || !defaultSignatory3Signature) {
      const admins = await this.prisma.user.findMany({
        where: { role: Role.ADMINISTRATOR, isActive: true },
        select: { id: true, fullName: true, titleAmharic: true, signatureUrl: true },
      });
      for (const a of admins) {
        if (!defaultSignatory2Signature && a.signatureUrl) {
          defaultSignatory2Signature = a.signatureUrl;
        } else if (!defaultSignatory3Signature && a.signatureUrl && a.signatureUrl !== defaultSignatory2Signature) {
          defaultSignatory3Signature = a.signatureUrl;
        }
      }
    }

    // 4. Compute metrics for each student
    const studentMetrics = students.map((student) => {
      const studentGrades = grades.filter((g) => g.studentId === student.id);
      const numberOfCourses = studentGrades.length;
      const totalScore = studentGrades.reduce((sum, g) => sum + Number(g.totalScore), 0);
      const averageScore = numberOfCourses > 0 ? Number((totalScore / numberOfCourses).toFixed(2)) : 0;
      const overallGrade = computeGrade(averageScore);

      const courseBreakdown = studentGrades.map((g) => ({
        courseId: g.courseId,
        code: g.course.code,
        name: g.course.name,
        nameAmharic: g.course.nameAmharic,
        score: Number(g.totalScore),
        letterGrade: g.letterGrade || computeGrade(Number(g.totalScore)),
      }));

      return {
        student,
        numberOfCourses,
        totalScore,
        averageScore,
        overallGrade,
        courseBreakdown,
      };
    });

    // 5. Sort descending by totalScore/averageScore to calculate Rank
    studentMetrics.sort((a, b) => b.totalScore - a.totalScore);

    const totalStudentsInClass = studentMetrics.length;
    let currentRank = 1;
    for (let i = 0; i < studentMetrics.length; i++) {
      if (i > 0 && studentMetrics[i].totalScore < studentMetrics[i - 1].totalScore) {
        currentRank = i + 1;
      }
      (studentMetrics[i] as any).rank = currentRank;
    }

    // 6. Bulk create / replace certificates for this class & year
    const generatedCertificates = [];
    const template = dto.templateType || CertificateTemplate.HONOR_EXCELLENCE;

    for (const item of studentMetrics) {
      const rank = (item as any).rank;
      const rankText = `${rank}ኛ ደረጃ (ከ ${totalStudentsInClass} ተማሪዎች)`;
      const certCount = await this.prisma.certificateRecord.count();
      const certNum = `MH-CERT-${year}-${String(certCount + 1).padStart(4, '0')}`;

      const cert = await this.prisma.certificateRecord.create({
        data: {
          certificateNumber: certNum,
          studentId: item.student.id,
          templateType: template,
          titleAmharic: dto.titleAmharic || 'የክብርና የላቀ ውጤት ምስክር ወረቀት',
          titleEnglish: dto.titleEnglish || 'Certificate of Academic Excellence',
          recipientNameAmharic: item.student.fullNameAmharic || item.student.fullName,
          recipientNameEnglish: item.student.fullName,
          courseOrClass: `${item.student.class.name} (${year} ዓ.ም)`,
          academicYear: year,
          issueDateEthiopian: dto.issueDateEthiopian || 'ሰኔ 30 ቀን 2018 ዓ.ም',
          overallGrade: `${item.overallGrade} (${item.averageScore}%)`,
          rankText,
          numberOfCourses: item.numberOfCourses,
          totalScore: item.totalScore,
          averageScore: item.averageScore,
          rankInClass: rank,
          totalStudentsInClass,
          courseBreakdown: item.courseBreakdown,
          customMessageAmharic:
            dto.customMessageAmharic ||
            `በደብረ አሚን መርሃ ህይወት ሰንበት ትምህርት ቤት በ${year} ዓ.ም የትምህርት ዘመን በ${item.numberOfCourses} የትምህርት ዓይነቶች አጠቃላይ ድምር ${item.totalScore} ነጥብ በማምጣትና ${item.averageScore}% አማካኝ በማስመዝገብ ከክፍሉ ${rankText} በመያዝ ላጠናቀቀው ተማሪ የተሰጠ።`,
          bibleVerseAmharic:
            dto.bibleVerseAmharic ||
            '«በሃይማኖት ጸንታችሁ ቁሙ፣ ጎልምሱ፣ በረቱም፤ ሁሉ በእናንተ በፍቅር ይሁን።» (1ኛ ቆሮ. 16:13)',
          signatory1Title: dto.signatory1Title || 'የክፍሉ መምህር',
          signatory1Name: dto.signatory1Name || 'መምህር ተክለ ማርያም',
          signatory1Signature: defaultSignatory1Signature,
          signatory2Title: dto.signatory2Title || 'የትምህርት ክፍል ኃላፊ',
          signatory2Name: dto.signatory2Name || 'ዲ/ን ዮሐንስ ወ/ሥላሴ',
          signatory2Signature: defaultSignatory2Signature,
          signatory3Title: dto.signatory3Title || 'የሰንበት ት/ቤቱ ሰብሳቢ',
          signatory3Name: dto.signatory3Name || 'መጋቤ ሐዲስ ኃይለ ሚካኤል',
          signatory3Signature: defaultSignatory3Signature,
          borderStyle: dto.borderStyle || 'ETHIOPIC_GOLD_DOUBLE',
          themeColor: dto.themeColor || '#D4AF37',
          createdById: userId,
        },
        include: {
          student: {
            select: { id: true, studentCode: true, fullName: true, fullNameAmharic: true, class: true },
          },
        },
      });

      generatedCertificates.push(cert);
    }

    return {
      success: true,
      count: generatedCertificates.length,
      classGroup: students[0]?.class?.name,
      certificates: generatedCertificates,
    };
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.certificateRecord.delete({ where: { id } });
  }
}
