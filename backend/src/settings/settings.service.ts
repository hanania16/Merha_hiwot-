import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UpdateSettingsDto {
  systemNameAmharic?: string;
  systemNameEnglish?: string;
  churchNameAmharic?: string;
  churchNameEnglish?: string;
  mottoAmharic?: string;
  primaryColorHex?: string;
  accentColorHex?: string;
  logoUrl?: string;
  currentAcademicYear?: number;
  defaultPassingScore?: number;
  teachingAdminName?: string;
  churchAdminName?: string;
}

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    let settings = await this.prisma.systemSetting.findUnique({
      where: { id: 'default' },
    });

    if (!settings) {
      settings = await this.prisma.systemSetting.create({
        data: {
          id: 'default',
          systemNameAmharic: 'መርሃ ህይወት ሰንበት ትምህርት ቤት',
          systemNameEnglish: 'Merha Hiwot Sunday School',
          churchNameAmharic: 'ደብረ አሚን ተክለ ሃይማኖት ቤተ ክርስቲያን',
          churchNameEnglish: 'Debre Amin Teklehaimanot Church',
          mottoAmharic:
            '«ሕፃናትን ወደ እኔ ይመጡ ዘንድ ተዉአቸው፤ አትከልክሏቸውም፤ የእግዚአብሔር መንግሥት እንደ እነዚህ ላሉት ናትና።» (ማርቆስ 10:14)',
          primaryColorHex: '#1E3A8A',
          accentColorHex: '#D4AF37',
          currentAcademicYear: 2018,
          defaultPassingScore: 50.0,
          teachingAdminName: 'ዲ/ን ዮሐንስ',
          churchAdminName: 'መጋቤ ሐዲስ',
        },
      });
    }

    return settings;
  }

  async updateSettings(dto: UpdateSettingsDto) {
    return this.prisma.systemSetting.upsert({
      where: { id: 'default' },
      update: {
        ...(dto.systemNameAmharic !== undefined && { systemNameAmharic: dto.systemNameAmharic.trim() }),
        ...(dto.systemNameEnglish !== undefined && { systemNameEnglish: dto.systemNameEnglish.trim() }),
        ...(dto.churchNameAmharic !== undefined && { churchNameAmharic: dto.churchNameAmharic.trim() }),
        ...(dto.churchNameEnglish !== undefined && { churchNameEnglish: dto.churchNameEnglish.trim() }),
        ...(dto.mottoAmharic !== undefined && { mottoAmharic: dto.mottoAmharic?.trim() || null }),
        ...(dto.primaryColorHex !== undefined && { primaryColorHex: dto.primaryColorHex.trim() }),
        ...(dto.accentColorHex !== undefined && { accentColorHex: dto.accentColorHex.trim() }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl?.trim() || null }),
        ...(dto.currentAcademicYear !== undefined && { currentAcademicYear: Number(dto.currentAcademicYear) }),
        ...(dto.defaultPassingScore !== undefined && { defaultPassingScore: Number(dto.defaultPassingScore) }),
        ...(dto.teachingAdminName !== undefined && { teachingAdminName: dto.teachingAdminName?.trim() || null }),
        ...(dto.churchAdminName !== undefined && { churchAdminName: dto.churchAdminName?.trim() || null }),
      },
      create: {
        id: 'default',
        systemNameAmharic: dto.systemNameAmharic || 'መርሃ ህይወት ሰንበት ትምህርት ቤት',
        systemNameEnglish: dto.systemNameEnglish || 'Merha Hiwot Sunday School',
        churchNameAmharic: dto.churchNameAmharic || 'ደብረ አሚን ተክለ ሃይማኖት ቤተ ክርስቲያን',
        churchNameEnglish: dto.churchNameEnglish || 'Debre Amin Teklehaimanot Church',
        mottoAmharic: dto.mottoAmharic || '«ሕፃናትን ወደ እኔ ይመጡ ዘንድ ተዉአቸው፤ አትከልክሏቸውም፤ የእግዚአብሔር መንግሥት እንደ እነዚህ ላሉት ናትና።» (ማርቆስ 10:14)',
        primaryColorHex: dto.primaryColorHex || '#1E3A8A',
        accentColorHex: dto.accentColorHex || '#D4AF37',
        logoUrl: dto.logoUrl || null,
        currentAcademicYear: dto.currentAcademicYear ? Number(dto.currentAcademicYear) : 2018,
        defaultPassingScore: dto.defaultPassingScore ? Number(dto.defaultPassingScore) : 50.0,
        teachingAdminName: dto.teachingAdminName || 'ዲ/ን ዮሐንስ',
        churchAdminName: dto.churchAdminName || 'መጋቤ ሐዲስ',
      },
    });
  }
}
