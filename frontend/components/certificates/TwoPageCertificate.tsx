'use client';

import React from 'react';
import Image from 'next/image';

export interface CourseItem {
  courseId?: string;
  code: string;
  name?: string;
  nameAmharic: string;
  year1Score?: number | null;
  year2Score?: number | null;
  averageScore?: number;
  score?: number;
  letterGrade?: string;
}

export interface TwoPageCertificateData {
  id?: string;
  certificateNumber: string;
  studentId?: string;
  templateType?: string;
  titleAmharic?: string;
  titleEnglish?: string;
  recipientNameAmharic: string;
  recipientNameEnglish: string;
  courseOrClass: string;
  academicYear: number;
  issueDateEthiopian: string;
  customMessageAmharic?: string | null;
  bibleVerseAmharic?: string | null;
  overallGrade?: string | null;
  rankText?: string | null;
  numberOfCourses?: number | null;
  totalScore?: number | null;
  averageScore?: number | null;
  rankInClass?: number | null;
  totalStudentsInClass?: number | null;
  courseBreakdown?: any;
  signatory1Title?: string;
  signatory1Name?: string;
  signatory1Signature?: string | null;
  signatory2Title?: string;
  signatory2Name?: string;
  signatory2Signature?: string | null;
  signatory3Title?: string;
  signatory3Name?: string;
  signatory3Signature?: string | null;
  themeColor?: string;
  student?: {
    studentCode: string;
    fullName: string;
    fullNameAmharic?: string | null;
    gender?: string;
    age?: number;
    class?: { id: string; name: string; level: string };
  };
}

interface TwoPageCertificateProps {
  cert: TwoPageCertificateData;
  systemSettings?: {
    churchNameAmharic?: string;
    churchNameEnglish?: string;
    systemNameAmharic?: string;
    systemNameEnglish?: string;
    logoUrl?: string | null;
    mottoAmharic?: string | null;
  } | null;
  viewMode?: 'both' | 'front' | 'back';
}

export default function TwoPageCertificate({
  cert,
  systemSettings,
  viewMode = 'both',
}: TwoPageCertificateProps) {
  const theme = cert.themeColor || '#D4AF37';

  // Normalize course breakdown data
  const breakdownObj =
    cert.courseBreakdown && typeof cert.courseBreakdown === 'object' && !Array.isArray(cert.courseBreakdown)
      ? cert.courseBreakdown
      : null;

  const rawCourses: CourseItem[] = Array.isArray(cert.courseBreakdown)
    ? cert.courseBreakdown
    : breakdownObj?.courses || [];

  // Year defaults: if year is left empty, default to academicYear (e.g. 2018) and year1 = academicYear - 1
  const year2 = breakdownObj?.year2 || cert.academicYear || 2018;
  const year1 = breakdownObj?.year1 || (year2 - 1);

  // Normalize courses with Year 1, Year 2, and Average
  const courses: CourseItem[] = rawCourses.map((c) => {
    const y2 = c.year2Score !== undefined && c.year2Score !== null ? Number(c.year2Score) : (c.score ?? null);
    const y1 = c.year1Score !== undefined && c.year1Score !== null ? Number(c.year1Score) : null;
    let avg = c.averageScore !== undefined && c.averageScore !== null ? Number(c.averageScore) : null;

    if (avg === null) {
      if (y1 !== null && y2 !== null) {
        avg = Number(((y1 + y2) / 2).toFixed(1));
      } else if (y2 !== null) {
        avg = y2;
      } else if (y1 !== null) {
        avg = y1;
      } else {
        avg = 0;
      }
    }

    return {
      ...c,
      year1Score: y1,
      year2Score: y2,
      averageScore: avg,
    };
  });

  // Calculate or fallback summary totals
  const y1Items = courses.filter((c) => c.year1Score !== null);
  const y2Items = courses.filter((c) => c.year2Score !== null);

  const year1Sum = breakdownObj?.year1Total ?? (y1Items.length > 0 ? y1Items.reduce((s, c) => s + (c.year1Score || 0), 0) : null);
  const year2Sum = breakdownObj?.year2Total ?? (y2Items.length > 0 ? y2Items.reduce((s, c) => s + (c.year2Score || 0), 0) : cert.totalScore ?? null);
  const avgSum = breakdownObj?.averageTotal ?? courses.reduce((s, c) => s + (c.averageScore || 0), 0);

  const year1Avg = breakdownObj?.year1Average ?? (y1Items.length > 0 && year1Sum !== null ? Number((year1Sum / y1Items.length).toFixed(1)) : null);
  const year2Avg = breakdownObj?.year2Average ?? (y2Items.length > 0 && year2Sum !== null ? Number((year2Sum / y2Items.length).toFixed(1)) : cert.averageScore ?? null);
  const cumulativeAvg = breakdownObj?.cumulativeAverage ?? cert.averageScore ?? (courses.length > 0 ? Number((avgSum / courses.length).toFixed(1)) : 0);

  const rank = breakdownObj?.rank ?? cert.rankInClass ?? 1;
  const totalStudents = breakdownObj?.totalStudents ?? cert.totalStudentsInClass ?? (rank > 1 ? rank : 1);
  const rankText = cert.rankText || `${rank}ኛ ደረጃ (ከ ${totalStudents} ተማሪዎች)`;

  const teacherNote =
    breakdownObj?.teacherNote ||
    'ተማሪው በመንፈሳዊ ትምህርቱ ላይ ከፍተኛ ትጋትና ፍላጎት የሚያሳይ፣ በመልካም ስነ-ምግባሩ የተመሰገነ ነው።';

  const adminNote =
    breakdownObj?.adminNote ||
    'የቀረበውን የዓመቱን የትምህርት ውጤትና የስነ-ምግባር ምዘና መሠረት በማድረግ ወደ ሚቀጥለው የትምህርት ደረጃ እንዲዘዋወር ተወስኗል።';

  const conductText = breakdownObj?.conduct || (rank <= 3 ? 'አርአያ (Exemplary)' : 'በጣም ጥሩ (Very Good)');
  const attendanceText = breakdownObj?.spiritualAttendance || 'ቋሚና ንቁ (Active)';
  const statusText = breakdownObj?.statusText || (cumulativeAvg >= 50 ? 'ወደ ሚቀጥለው ክፍል ተዛውሯል (Promoted)' : 'ድጋሚ እንዲማር ተወስኗል (Repeat)');

  return (
    <div className="space-y-8 print:space-y-0 w-full select-none text-[#111111]">
      {/* ========================================================================= */}
      {/* PAGE 1: FRONT PAGE (የፊት ገጽ)                                             */}
      {/* ========================================================================= */}
      {(viewMode === 'both' || viewMode === 'front') && (
        <div
          className="certificate-print-page print-page w-full bg-[#FCFBF7] rounded-2xl shadow-xl overflow-hidden border border-gray-200 relative p-6 sm:p-10 flex flex-col justify-between"
          style={{
            aspectRatio: '1.414 / 1', // A4 Landscape ratio
            minHeight: '620px',
          }}
        >
          {/* Ornate Ethiopian Outer Border */}
          <div
            className="absolute inset-3 border-4 rounded-xl pointer-events-none"
            style={{ borderColor: theme }}
          >
            {/* Inner Fillet Line */}
            <div
              className="absolute inset-1.5 border border-dashed rounded-lg"
              style={{ borderColor: theme }}
            />

            {/* Corner Ethiopian Cross Insignias */}
            <div className="absolute -top-3.5 -left-3.5 w-7 h-7 bg-[#FCFBF7] flex items-center justify-center font-bold text-base" style={{ color: theme }}>
              ☩
            </div>
            <div className="absolute -top-3.5 -right-3.5 w-7 h-7 bg-[#FCFBF7] flex items-center justify-center font-bold text-base" style={{ color: theme }}>
              ☩
            </div>
            <div className="absolute -bottom-3.5 -left-3.5 w-7 h-7 bg-[#FCFBF7] flex items-center justify-center font-bold text-base" style={{ color: theme }}>
              ☩
            </div>
            <div className="absolute -bottom-3.5 -right-3.5 w-7 h-7 bg-[#FCFBF7] flex items-center justify-center font-bold text-base" style={{ color: theme }}>
              ☩
            </div>
          </div>

          {/* PAGE 1 CONTENT */}
          <div className="relative z-10 flex flex-col justify-between h-full text-center py-2 px-3 sm:px-8">
            {/* Spiritual Opening */}
            <div className="space-y-1">
              <span className="text-[11px] sm:text-xs font-bold tracking-widest text-[#555] uppercase block font-serif">
                በስመ አብ ወወልድ ወመንፈስ ቅዱስ አሐዱ አምላክ አሜን
              </span>
              <p className="text-xs sm:text-sm font-bold text-ink">
                {systemSettings?.churchNameAmharic || 'በኢትዮጵያ ኦርቶዶክስ ተዋሕዶ ቤተ ክርስቲያን'}
              </p>
            </div>

            {/* School Crest & Description */}
            <div className="my-auto py-2 space-y-3">
              <div className="flex flex-col items-center justify-center">
                <div
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full p-1 border-2 border-double flex items-center justify-center bg-white shadow-md mb-2"
                  style={{ borderColor: theme }}
                >
                  <Image
                    src={systemSettings?.logoUrl || '/logo.jpg'}
                    alt="School Logo"
                    width={72}
                    height={72}
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>

                <h1
                  className="text-lg sm:text-2xl font-black tracking-wide font-serif"
                  style={{ color: theme }}
                >
                  {systemSettings?.systemNameAmharic || 'ደብረ አሚን መርሃ ህይወት ሰንበት ትምህርት ቤት'}
                </h1>
                <p className="text-[11px] sm:text-xs font-semibold text-slate tracking-wider uppercase">
                  {systemSettings?.systemNameEnglish || 'Debre Amin Merha Hiwot Sunday School'}
                </p>
              </div>

              {/* School Spiritual Description */}
              <div className="max-w-2xl mx-auto px-4 py-2 bg-white/70 rounded-xl border border-amber-200/60 shadow-2xs">
                <p className="text-[11px] sm:text-xs text-ink/90 leading-relaxed font-sans">
                  {systemSettings?.mottoAmharic ||
                    'መርሃ ህይወት ሰንበት ትምህርት ቤት በደብረ አሚን አቡነ ተክለ ሃይማኖት ቤተ ክርስቲያን ሥር የሚገኝ መንፈሳዊ ተቋም ሲሆን፤ ሕፃናትና ወጣቶች በኦርቶዶክሳዊት ተዋሕዶ እምነት፣ በስነ-ምግባርና በቤተ ክርስቲያን ስርዓት ታንፀው እንዲያድጉ ጥራት ያለው መንፈሳዊ ትምህርት ይሰጣል።'}
                </p>
                <div className="mt-1.5 pt-1.5 border-t border-dashed border-amber-300/60 text-[10px] sm:text-[11px] italic font-serif text-slate">
                  «ሕፃኑን በሚሄድበት መንገድ ምራው፤ በሸመገለም ጊዜ ከእርሱ ፈቀቅ አይልም።» (ምሳሌ 22:6)
                </div>
              </div>

              {/* Certificate Main Title */}
              <div>
                <div
                  className="inline-block px-6 py-1.5 rounded-full border-2 shadow-xs"
                  style={{
                    borderColor: theme,
                    backgroundColor: `${theme}15`,
                  }}
                >
                  <h2 className="text-sm sm:text-base font-black tracking-wide" style={{ color: theme }}>
                    የተማሪዎች ዓመታዊ የትምህርት ውጤትና ምስክር ወረቀት
                  </h2>
                  <p className="text-[9px] sm:text-[10px] font-bold text-slate uppercase tracking-wider">
                    Student Academic Progress Certificate & Transcript
                  </p>
                </div>
                <p className="text-xs font-bold text-ink mt-1">
                  የትምህርት ዘመን፡ <span className="font-extrabold text-amber-800">{year1} - {year2} ዓ.ም</span>
                </p>
              </div>

              {/* Student Identity Card Box */}
              <div className="max-w-xl mx-auto bg-white rounded-xl border border-gray-300 p-4 shadow-sm text-left">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-8 space-y-1">
                    <span className="text-[10px] font-bold text-slate uppercase tracking-wider block">
                      የተማሪው ሙሉ ስም (Student Full Name)
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-ink font-serif leading-tight">
                      {cert.recipientNameAmharic}
                    </h3>
                    {cert.recipientNameEnglish && (
                      <p className="text-[11px] font-semibold text-slate font-sans uppercase">
                        {cert.recipientNameEnglish}
                      </p>
                    )}
                    <div className="pt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate">
                      <span>መለያ ቁጥር: <strong className="text-ink font-mono">{cert.student?.studentCode || '—'}</strong></span>
                      <span>ክፍል: <strong className="text-ink">{cert.courseOrClass}</strong></span>
                      <span>ፆታ: <strong className="text-ink">{cert.student?.gender === 'MALE' ? 'ወንድ' : 'ሴት'}</strong></span>
                      {cert.student?.age && <span>ዕድሜ: <strong className="text-ink">{cert.student.age} ዓመት</strong></span>}
                    </div>
                  </div>

                  <div className="sm:col-span-4 border-t sm:border-t-0 sm:border-l border-gray-200 sm:pl-3 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] text-slate font-bold uppercase block mb-1">የሰርተፊኬት ቁጥር</span>
                    <span className="font-mono text-xs font-extrabold text-gold px-2 py-0.5 rounded bg-gold/10 border border-gold/30">
                      {cert.certificateNumber}
                    </span>
                    <span className="text-[10px] text-slate mt-2 block">የተሰጠበት ቀን</span>
                    <span className="text-xs font-bold text-ink">{cert.issueDateEthiopian}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Footer Notice */}
            <div className="pt-1 border-t border-gray-200 flex items-center justify-between text-[10px] text-slate px-2">
              <span>ገጽ 1 / የፊት ገጽ (Front Page)</span>
              <span className="font-semibold italic font-serif">«እግዚአብሔርን መፍራት የጥበብ መጀመሪያ ነው።» (ምሳሌ 1:7)</span>
              <span>ደብረ አሚን መርሃ ህይወት ሰንበት ትምህርት ቤት</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PAGE 2: BACK PAGE (የጀርባ ገጽ)                                              */}
      {/* ========================================================================= */}
      {(viewMode === 'both' || viewMode === 'back') && (
        <div
          className="certificate-print-page print-page w-full bg-[#FCFBF7] rounded-2xl shadow-xl overflow-hidden border border-gray-200 relative p-6 sm:p-8 flex flex-col justify-between"
          style={{
            aspectRatio: '1.414 / 1', // A4 Landscape ratio
            minHeight: '620px',
            breakBefore: 'page',
            pageBreakBefore: 'always',
          }}
        >
          {/* Subtle Outer Border for Page 2 */}
          <div
            className="absolute inset-3 border-2 rounded-xl pointer-events-none"
            style={{ borderColor: `${theme}99` }}
          >
            <div className="absolute -top-2.5 -left-2.5 w-5 h-5 bg-[#FCFBF7] flex items-center justify-center font-bold text-xs" style={{ color: theme }}>
              ☩
            </div>
            <div className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-[#FCFBF7] flex items-center justify-center font-bold text-xs" style={{ color: theme }}>
              ☩
            </div>
            <div className="absolute -bottom-2.5 -left-2.5 w-5 h-5 bg-[#FCFBF7] flex items-center justify-center font-bold text-xs" style={{ color: theme }}>
              ☩
            </div>
            <div className="absolute -bottom-2.5 -right-2.5 w-5 h-5 bg-[#FCFBF7] flex items-center justify-center font-bold text-xs" style={{ color: theme }}>
              ☩
            </div>
          </div>

          {/* PAGE 2 CONTENT */}
          <div className="relative z-10 flex flex-col justify-between h-full space-y-3">
            {/* Top Page 2 Header Banner */}
            <div className="border-b border-gray-200 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center font-bold text-xs text-gold">☩</span>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-ink font-serif">
                    ደብረ አሚን መርሃ ህይወት ሰንበት ትምህርት ቤት — የተማሪው የውጤት መግለጫና ምዘና
                  </h3>
                  <p className="text-[10px] text-slate">
                    ተማሪ፡ <strong className="text-ink">{cert.recipientNameAmharic}</strong> ({cert.student?.studentCode}) · ክፍል፡ <strong className="text-ink">{cert.courseOrClass}</strong>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-slate block">{cert.certificateNumber}</span>
                <span className="text-[10px] font-bold text-gold">ገጽ 2 / የጀርባ ገጽ (Back Page)</span>
              </div>
            </div>

            {/* TWO-COLUMN SPLIT:
                - LEFT SIDE: Subjects Table with 2 Years and Average
                - RIGHT SIDE: Teacher Note, Admin Note, Behavior & Signatures
            */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 items-stretch">
              {/* ------------------------------------------------------------- */}
              {/* LEFT COLUMN: ACADEMIC RESULTS TABLE (7 cols)                  */}
              {/* ------------------------------------------------------------- */}
              <div className="lg:col-span-7 flex flex-col justify-between bg-white rounded-xl border border-gray-200 p-3 shadow-2xs">
                <div>
                  <div className="flex items-center justify-between border-b border-gray-100 pb-1.5 mb-2">
                    <h4 className="text-xs font-black text-ink flex items-center gap-1.5">
                      <span>📖 የትምህርት ዓይነቶችና የተገኙ ውጤቶች ዝርዝር</span>
                    </h4>
                    <span className="text-[10px] text-slate font-medium">
                      የትምህርት ዓመታት፡ <strong className="text-ink">{year1}</strong> እና <strong className="text-ink">{year2}</strong>
                    </span>
                  </div>

                  <table className="w-full text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-amber-50/70 border-b border-amber-200 text-ink font-bold text-[10px]">
                        <th className="py-1 px-1.5 text-center w-7">ተ.ቁ</th>
                        <th className="py-1 px-2 text-left">የትምህርት ዓይነት</th>
                        <th className="py-1 px-2 text-center w-14 bg-amber-100/50">{year1} ዓ.ም</th>
                        <th className="py-1 px-2 text-center w-14 bg-amber-200/50">{year2} ዓ.ም</th>
                        <th className="py-1 px-2 text-center w-16 text-gold font-extrabold">አማካይ %</th>
                        <th className="py-1 px-1.5 text-center w-9">ደረጃ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {courses.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-4 text-center text-slate text-xs italic">
                            የትምህርት ውጤት አልተመዘገበም
                          </td>
                        </tr>
                      ) : (
                        courses.map((c, idx) => (
                          <tr key={c.code || idx} className="hover:bg-amber-50/20">
                            <td className="py-1 px-1.5 text-center font-mono text-[10px] text-slate">{idx + 1}</td>
                            <td className="py-1 px-2">
                              <span className="font-bold text-ink block leading-tight">{c.nameAmharic}</span>
                              {c.name && <span className="text-[9px] text-slate block">{c.name}</span>}
                            </td>
                            <td className="py-1 px-2 text-center font-semibold text-ink bg-amber-50/20">
                              {c.year1Score !== null && c.year1Score !== undefined ? `${c.year1Score}%` : '—'}
                            </td>
                            <td className="py-1 px-2 text-center font-bold text-ink bg-amber-100/20">
                              {c.year2Score !== null && c.year2Score !== undefined ? `${c.year2Score}%` : '—'}
                            </td>
                            <td className="py-1 px-2 text-center font-black text-amber-900">
                              {c.averageScore !== undefined && c.averageScore !== null ? `${c.averageScore}%` : '—'}
                            </td>
                            <td className="py-1 px-1.5 text-center font-bold text-[10px]">
                              <span className="px-1 py-0.5 rounded bg-gray-100 text-slate">
                                {c.letterGrade || (c.averageScore ? (c.averageScore >= 90 ? 'A+' : c.averageScore >= 80 ? 'A' : c.averageScore >= 70 ? 'B' : c.averageScore >= 50 ? 'C' : 'F') : '—')}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      {/* Summary Row 1: Total Sum */}
                      <tr className="border-t-2 border-gray-300 font-bold bg-gray-50/80 text-[10.5px]">
                        <td colSpan={2} className="py-1 px-2 text-left text-ink">
                          የነጥብ ድምር (Total Score)
                        </td>
                        <td className="py-1 px-2 text-center font-bold text-ink">
                          {year1Sum !== null ? year1Sum : '—'}
                        </td>
                        <td className="py-1 px-2 text-center font-bold text-ink">
                          {year2Sum !== null ? year2Sum : '—'}
                        </td>
                        <td className="py-1 px-2 text-center font-black text-gold">
                          {avgSum !== null ? avgSum : '—'}
                        </td>
                        <td className="text-center">—</td>
                      </tr>

                      {/* Summary Row 2: Average Score % */}
                      <tr className="border-t border-gray-200 font-bold bg-amber-50/40 text-[10.5px]">
                        <td colSpan={2} className="py-1 px-2 text-left text-amber-900">
                          አማካይ ውጤት (Average %)
                        </td>
                        <td className="py-1 px-2 text-center font-bold text-slate">
                          {year1Avg !== null ? `${year1Avg}%` : '—'}
                        </td>
                        <td className="py-1 px-2 text-center font-bold text-ink">
                          {year2Avg !== null ? `${year2Avg}%` : '—'}
                        </td>
                        <td className="py-1 px-2 text-center font-extrabold text-amber-800 text-xs">
                          {cumulativeAvg !== null ? `${cumulativeAvg}%` : '—'}
                        </td>
                        <td className="text-center font-bold text-amber-900">
                          {cert.overallGrade?.split(' ')[0] || (cumulativeAvg >= 80 ? 'A' : 'B')}
                        </td>
                      </tr>

                      {/* Summary Row 3: Class Rank */}
                      <tr className="border-t border-gray-200 bg-white text-[10.5px]">
                        <td colSpan={2} className="py-1 px-2 text-left font-bold text-ink">
                          ከክፍሉ ደረጃ (Class Rank)
                        </td>
                        <td colSpan={4} className="py-1 px-2 text-right">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-black bg-gold/15 text-gold border border-gold/40">
                            {rankText}
                          </span>
                        </td>
                      </tr>

                      {/* Summary Row 4: Promotion Status */}
                      <tr className="border-t border-gray-200 bg-emerald-50/50 text-[10.5px]">
                        <td colSpan={2} className="py-1 px-2 text-left font-bold text-emerald-900">
                          የትምህርት ሁኔታ (Status)
                        </td>
                        <td colSpan={4} className="py-1 px-2 text-right font-extrabold text-emerald-800 text-xs">
                          ✓ {statusText}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <p className="text-[9px] text-slate italic pt-1 border-t border-gray-100">
                  ማስታወሻ፡ የማለፊያ ዝቅተኛ አማካይ ውጤት 50% ሲሆን፤ አጠቃላይ ድምርና ደረጃ የተሰላው በሁለቱ ዓመታት የትምህርት አፈጻጸም መሠረት ነው።
                </p>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* RIGHT COLUMN: EVALUATIONS, NOTES & SIGNATURES (5 cols)         */}
              {/* ------------------------------------------------------------- */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-2">
                {/* 1. Teacher's Note Box */}
                <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-1 mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink flex items-center gap-1">
                      <span>✍️ የክፍሉ መምህር አስተያየት (Teacher Note)</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-ink/90 italic leading-relaxed bg-amber-50/30 p-2 rounded border border-amber-100">
                    «{teacherNote}»
                  </p>
                  <div className="mt-2 flex items-end justify-between text-[10px]">
                    <div>
                      <p className="font-bold text-ink">{cert.signatory1Name || 'መምህር'}</p>
                      <p className="text-[9px] text-slate">{cert.signatory1Title || 'የክፍሉ መምህር'}</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="h-7 flex items-center justify-center">
                        {cert.signatory1Signature ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={cert.signatory1Signature} alt="Teacher Sig" className="max-h-6 max-w-[80px] object-contain" />
                        ) : (
                          <div className="w-14 border-b border-dashed border-gray-400" />
                        )}
                      </div>
                      <span className="text-[8px] text-slate">ፊርማና ቀን</span>
                    </div>
                  </div>
                </div>

                {/* 2. Admin's Note Box */}
                <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-1 mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink flex items-center gap-1">
                      <span>🏛️ የትምህርት ክፍል አስተዳደር ውሳኔ (Admin Note)</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-ink/90 leading-relaxed bg-slate-50/60 p-2 rounded border border-gray-200">
                    {adminNote}
                  </p>
                  <div className="mt-2 flex items-end justify-between text-[10px]">
                    <div>
                      <p className="font-bold text-ink">{cert.signatory2Name || 'ዲ/ን ዮሐንስ'}</p>
                      <p className="text-[9px] text-slate">{cert.signatory2Title || 'የትምህርት ክፍል ኃላፊ'}</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="h-7 flex items-center justify-center">
                        {cert.signatory2Signature ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={cert.signatory2Signature} alt="Admin Sig" className="max-h-6 max-w-[80px] object-contain" />
                        ) : (
                          <div className="w-14 border-b border-dashed border-gray-400" />
                        )}
                      </div>
                      <span className="text-[8px] text-slate">ፊርማና ቀን</span>
                    </div>
                  </div>
                </div>

                {/* 3. Conduct & Attendance Badges */}
                <div className="bg-white rounded-xl border border-gray-200 p-2.5 shadow-2xs grid grid-cols-2 gap-2 text-[10px]">
                  <div className="p-1.5 bg-gray-50 rounded border border-gray-100">
                    <span className="text-slate block text-[9px]">ስነ-ምግባር (Conduct)</span>
                    <strong className="text-emerald-800 font-bold block">{conductText}</strong>
                  </div>
                  <div className="p-1.5 bg-gray-50 rounded border border-gray-100">
                    <span className="text-slate block text-[9px]">የሰንበት ት/ቤት ተሳትፎ</span>
                    <strong className="text-indigo-800 font-bold block">{attendanceText}</strong>
                  </div>
                </div>

                {/* 4. Official Seal & Sunday School Board Chairperson Signature */}
                <div className="bg-white rounded-xl border border-gray-200 p-2.5 shadow-2xs flex items-center justify-between">
                  <div>
                    <span className="text-[9px] text-slate font-bold uppercase block">የሰንበት ት/ቤቱ ሰብሳቢ</span>
                    <p className="text-[10px] font-extrabold text-ink">{cert.signatory3Name || 'መጋቤ ሐዲስ'}</p>
                    <p className="text-[8px] text-slate">{cert.signatory3Title || 'የሰ/ት/ቤቱ ሰብሳቢ'}</p>
                    <div className="h-6 flex items-center mt-1">
                      {cert.signatory3Signature ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={cert.signatory3Signature} alt="Chair Sig" className="max-h-6 max-w-[80px] object-contain" />
                      ) : (
                        <div className="w-16 border-b border-dashed border-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Circular Gold Stamp */}
                  <div className="flex flex-col items-center">
                    <div
                      className="w-12 h-12 rounded-full border-2 border-double flex flex-col items-center justify-center text-center shadow-xs"
                      style={{
                        borderColor: theme,
                        color: theme,
                        backgroundColor: `${theme}12`,
                      }}
                    >
                      <span className="text-[10px] font-bold">☩</span>
                      <span className="text-[6px] font-bold tracking-tighter uppercase leading-tight">
                        መርሃ ህይወት<br />ማኅተም
                      </span>
                    </div>
                    <span className="text-[7.5px] font-mono text-slate mt-0.5">{cert.issueDateEthiopian}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Footer for Page 2 */}
            <div className="pt-1 border-t border-gray-200 flex items-center justify-between text-[10px] text-slate px-2">
              <span>ገጽ 2 / የጀርባ ገጽ (Back Page)</span>
              <span className="font-medium">ይህ ሰነድ ያለ ሰንበት ትምህርት ቤቱ ይፋዊ ማኅተምና ፊርማ ተቀባይነት የለውም።</span>
              <span className="font-mono">{cert.certificateNumber}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
