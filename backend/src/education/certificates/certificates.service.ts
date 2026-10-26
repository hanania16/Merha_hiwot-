import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CertificateTemplate } from '@prisma/client';

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
  customMessageAmharic?: string;
  bibleVerseAmharic?: string;
  signatory1Title?: string;
  signatory1Name?: string;
  signatory2Title?: string;
  signatory2Name?: string;
  signatory3Title?: string;
  signatory3Name?: string;
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
      'በደብረ መዊዕ መርሃ ህይወት ሰንበት ትምህርት ቤት በመንፈሳዊ ትምህርቱ ከፍተኛ ትጋት በማሳየት ላጠናቀቀው ተማሪ የተሰጠ የምስክር ወረቀት።';

    if (template === CertificateTemplate.STANDARD_COMPLETION) {
      defaultTitleAmharic = 'የምርቃት ምስክር ወረቀት';
      defaultTitleEnglish = 'Certificate of Graduation';
      defaultMsg =
        'በደብረ መዊዕ መርሃ ህይወት ሰንበት ትምህርት ቤት የተዘጋጀውን መንፈሳዊ የትምህርት መርሃ ግብር በተሳካ ሁኔታ ላጠናቀቀው ተማሪ የተሰጠ።';
    } else if (template === CertificateTemplate.DISTINGUISHED_SERVICE) {
      defaultTitleAmharic = 'የላቀ አገልግሎት ምስክር ወረቀት';
      defaultTitleEnglish = 'Certificate of Distinguished Service';
      defaultMsg =
        'በደብረ መዊዕ መርሃ ህይወት ሰንበት ትምህርት ቤት በታማኝነት፣ በትጋትና በቅንነት ላበረከተው የላቀ አገልግሎት የተሰጠ የክብር ምስክር ወረቀት።';
    } else if (template === CertificateTemplate.PARTICIPATION) {
      defaultTitleAmharic = 'የተሳትፎ ምስክር ወረቀት';
      defaultTitleEnglish = 'Certificate of Participation';
      defaultMsg =
        'በደብረ መዊዕ መርሃ ህይወት ሰንበት ትምህርት ቤት በተዘጋጀው መንፈሳዊ ጉባኤ እና የሥልጠና መርሃ ግብር ላይ በንቃት ለተሳተፈ ተማሪ የተሰጠ።';
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
        customMessageAmharic: dto.customMessageAmharic?.trim() || defaultMsg,
        bibleVerseAmharic:
          dto.bibleVerseAmharic?.trim() ||
          '«በሃይማኖት ጸንታችሁ ቁሙ፣ ጎልምሱ፣ በረቱም፤ ሁሉ በእናንተ በፍቅር ይሁን።» (1ኛ ቆሮ. 16:13)',
        signatory1Title: dto.signatory1Title?.trim() || 'የክፍሉ መምህር',
        signatory1Name: dto.signatory1Name?.trim() || 'መምህር ተክለ ማርያም',
        signatory2Title: dto.signatory2Title?.trim() || 'የትምህርት ክፍል ኃላፊ',
        signatory2Name: dto.signatory2Name?.trim() || 'ዲ/ን ዮሐንስ ወ/ሥላሴ',
        signatory3Title: dto.signatory3Title?.trim() || 'የሰንበት ት/ቤቱ ሰብሳቢ',
        signatory3Name: dto.signatory3Name?.trim() || 'መጋቤ ሐዲስ ኃይለ ሚካኤል',
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

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.certificateRecord.delete({ where: { id } });
  }
}
