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
  previousYear?: number;
  semester?: AcademicSemester;
  templateType?: CertificateTemplate;
  certificateScope?: 'ALL_TWO_PAGE' | 'TOP_3_ONLY' | 'BOTH';
  titleAmharic?: string;
  titleEnglish?: string;
  issueDateEthiopian?: string;
  customMessageAmharic?: string;
  bibleVerseAmharic?: string;
  teacherNote?: string;
  adminNote?: string;
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
   * Calculates: 2 Years of grades (Year 1, Year 2, and 2-Year Average), Sum of total points,
   * Cumulative Average %, Class Ranks, Teacher/Admin notes, and Top 3 Honor distinctions!
   */
  async generateClassCertificates(dto: GenerateClassCertificatesDto, userId: string) {
    const year2 = dto.ethiopianYear ?? 2018;
    const year1 = dto.previousYear ?? (year2 - 1);
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

    // 2. Fetch selected courses
    const selectedCourses = await this.prisma.course.findMany({
      where: { id: { in: dto.courseIds } },
      include: {
        teacher: { select: { fullName: true, signatureUrl: true } },
      },
      orderBy: [{ code: 'asc' }],
    });

    // 3. Fetch grades for both year1 and year2
    const grades = await this.prisma.studentGrade.findMany({
      where: {
        studentId: { in: students.map((s) => s.id) },
        courseId: { in: dto.courseIds },
        ethiopianYear: { in: [year1, year2] },
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

    // 4. Resolve default signatures if not explicitly provided
    let defaultSignatory1Signature = dto.signatory1Signature || null;
    let defaultSignatory2Signature = dto.signatory2Signature || null;
    let defaultSignatory3Signature = dto.signatory3Signature || null;

    if (!defaultSignatory1Signature) {
      const teacherWithSig = selectedCourses.find((c) => c.teacher?.signatureUrl)?.teacher;
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

    // 5. Compute metrics for each student across the 2 years
    const studentMetrics = students.map((student) => {
      const courseBreakdownList = selectedCourses.map((c) => {
        const y1g = grades.find(
          (g) => g.studentId === student.id && g.courseId === c.id && g.ethiopianYear === year1,
        );
        const y2g = grades.find(
          (g) => g.studentId === student.id && g.courseId === c.id && g.ethiopianYear === year2,
        );

        const year1Score = y1g ? Number(y1g.totalScore) : null;
        const year2Score = y2g ? Number(y2g.totalScore) : null;

        let avgScore = 0;
        if (year1Score !== null && year2Score !== null) {
          avgScore = Number(((year1Score + year2Score) / 2).toFixed(1));
        } else if (year2Score !== null) {
          avgScore = year2Score;
        } else if (year1Score !== null) {
          avgScore = year1Score;
        }

        return {
          courseId: c.id,
          code: c.code,
          name: c.name,
          nameAmharic: c.nameAmharic,
          year1Score,
          year2Score,
          averageScore: avgScore,
          score: avgScore, // backward compatibility
          letterGrade: computeGrade(avgScore),
        };
      });

      const y1Courses = courseBreakdownList.filter((cb) => cb.year1Score !== null);
      const y2Courses = courseBreakdownList.filter((cb) => cb.year2Score !== null);

      const year1Total = y1Courses.reduce((sum, cb) => sum + (cb.year1Score || 0), 0);
      const year2Total = y2Courses.reduce((sum, cb) => sum + (cb.year2Score || 0), 0);
      const avgTotal = courseBreakdownList.reduce((sum, cb) => sum + cb.averageScore, 0);

      const year1Avg = y1Courses.length > 0 ? Number((year1Total / y1Courses.length).toFixed(2)) : null;
      const year2Avg = y2Courses.length > 0 ? Number((year2Total / y2Courses.length).toFixed(2)) : null;
      const cumulativeAvg =
        courseBreakdownList.length > 0 ? Number((avgTotal / courseBreakdownList.length).toFixed(2)) : 0;
      const overallGrade = computeGrade(cumulativeAvg);

      return {
        student,
        numberOfCourses: courseBreakdownList.length,
        year1Total,
        year2Total,
        totalScore: year2Total > 0 ? year2Total : avgTotal,
        averageScore: cumulativeAvg,
        year1Avg,
        year2Avg,
        overallGrade,
        courseBreakdownList,
      };
    });

    // 6. Sort descending by totalScore/averageScore to calculate Class Rank
    studentMetrics.sort((a, b) => b.totalScore - a.totalScore);

    const totalStudentsInClass = studentMetrics.length;
    let currentRank = 1;
    for (let i = 0; i < studentMetrics.length; i++) {
      if (i > 0 && studentMetrics[i].totalScore < studentMetrics[i - 1].totalScore) {
        currentRank = i + 1;
      }
      (studentMetrics[i] as any).rank = currentRank;
    }

    // 7. Filter if only Top 3 were requested
    const targetMetrics =
      dto.certificateScope === 'TOP_3_ONLY'
        ? studentMetrics.filter((item) => (item as any).rank <= 3)
        : studentMetrics;

    // 8. Bulk create certificates
    const generatedCertificates = [];

    for (const item of targetMetrics) {
      const rank = (item as any).rank;
      const isTopThree = rank <= 3;
      const rankText = `${rank}ኛ ደረጃ (ከ ${totalStudentsInClass} ተማሪዎች)`;
      const certCount = await this.prisma.certificateRecord.count();
      const certNum = `MH-CERT-${year2}-${String(certCount + 1).padStart(4, '0')}`;

      // Default template: HONOR_EXCELLENCE for top 3, STANDARD_COMPLETION for others
      const template =
        dto.templateType ||
        (isTopThree ? CertificateTemplate.HONOR_EXCELLENCE : CertificateTemplate.STANDARD_COMPLETION);

      const titleAmharic =
        dto.titleAmharic ||
        (isTopThree
          ? 'የላቀ ውጤት የክብር ምስክር ወረቀት (Certificate of Honor)'
          : 'ዓመታዊ የትምህርት ውጤትና ምስክር ወረቀት');

      const titleEnglish =
        dto.titleEnglish ||
        (isTopThree ? 'Certificate of Academic Excellence & High Honor' : 'Academic Certificate & Progress Transcript');

      const courseBreakdownData = {
        year1,
        year2,
        courses: item.courseBreakdownList,
        year1Total: item.year1Total,
        year2Total: item.year2Total,
        averageTotal: item.totalScore,
        year1Average: item.year1Avg,
        year2Average: item.year2Avg,
        cumulativeAverage: item.averageScore,
        rank,
        totalStudents: totalStudentsInClass,
        teacherNote:
          dto.teacherNote?.trim() ||
          'ተማሪው በመንፈሳዊ ትምህርቱ ላይ ከፍተኛ ትጋትና ፍላጎት የሚያሳይ፣ በመልካም ስነ-ምግባሩ የተመሰገነ ነው።',
        adminNote:
          dto.adminNote?.trim() ||
          'የቀረበውን የትምህርት ውጤትና የስነ-ምግባር ምዘና መሠረት በማድረግ ወደ ሚቀጥለው የትምህርት ደረጃ እንዲዘዋወር ተወስኗል።',
        conduct: isTopThree ? 'አርአያ (Exemplary)' : 'በጣም ጥሩ (Very Good)',
        spiritualAttendance: 'ቋሚ (Active)',
        isTopThree,
        statusText: item.averageScore >= 50 ? 'ወደ ሚቀጥለው ክፍል ተዛውሯል (Promoted)' : 'ድጋሚ እንዲማር ተወስኗል (Repeat)',
      };

      const cert = await this.prisma.certificateRecord.create({
        data: {
          certificateNumber: certNum,
          studentId: item.student.id,
          templateType: template,
          titleAmharic,
          titleEnglish,
          recipientNameAmharic: item.student.fullNameAmharic || item.student.fullName,
          recipientNameEnglish: item.student.fullName,
          courseOrClass: `${item.student.class.name} (${year1} - ${year2} ዓ.ም)`,
          academicYear: year2,
          issueDateEthiopian: dto.issueDateEthiopian || `ሰኔ 30 ቀን ${year2} ዓ.ም`,
          overallGrade: `${item.overallGrade} (${item.averageScore}%)`,
          rankText,
          numberOfCourses: item.numberOfCourses,
          totalScore: item.totalScore,
          averageScore: item.averageScore,
          rankInClass: rank,
          totalStudentsInClass,
          courseBreakdown: courseBreakdownData,
          customMessageAmharic:
            dto.customMessageAmharic ||
            `በደብረ አሚን መርሃ ህይወት ሰንበት ትምህርት ቤት በ${year1}-${year2} ዓ.ም የትምህርት ዘመን በ${item.numberOfCourses} የትምህርት ዓይነቶች አጠቃላይ ድምር ${item.totalScore} ነጥብ በማምጣትና ${item.averageScore}% አማካኝ በማስመዝገብ ከክፍሉ ${rankText} በመያዝ ላጠናቀቀው ተማሪ የተሰጠ።`,
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
