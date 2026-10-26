'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { api } from '@/lib/api';
import { useLang } from '@/lib/i18n';
import { getCurrentUser } from '@/lib/auth';
import { Topbar } from '@/components/layout/Topbar';
import { Modal } from '@/components/ui/Modal';
import { SignaturePad } from '@/components/ui/SignaturePad';
import {
  Scroll,
  Printer,
  Award,
  Sparkles,
  CheckCircle,
  Plus,
  Trash2,
  Eye,
  FileCheck2,
  Sliders,
  Palette,
  Layers,
  BookOpen,
  Calendar,
  Check,
  PenTool,
  CheckCircle2,
  CheckSquare,
  Square,
  ChevronRight,
  AlertTriangle,
  Trophy,
} from 'lucide-react';
import TwoPageCertificate from '@/components/certificates/TwoPageCertificate';

interface Student {
  id: string;
  studentCode: string;
  fullName: string;
  fullNameAmharic: string | null;
  gender?: string;
  dateOfBirth?: string;
  age?: number;
  class: { id: string; name: string; level: string };
  isSuspended?: boolean;
  behaviorStatus?: string;
  suspensionReason?: string | null;
}

interface CourseItem {
  id: string;
  code: string;
  name: string;
  nameAmharic: string;
  classLevel: string;
  targetGrade?: string | null;
  teacher?: { id: string; fullName: string; signatureUrl?: string };
}

interface CourseBreakdownItem {
  courseId?: string;
  code: string;
  name?: string;
  nameAmharic: string;
  score: number;
  letterGrade: string;
}

interface CertificateRecord {
  id: string;
  certificateNumber: string;
  studentId: string;
  templateType: 'STANDARD_COMPLETION' | 'HONOR_EXCELLENCE' | 'DISTINGUISHED_SERVICE' | 'PARTICIPATION';
  titleAmharic: string;
  titleEnglish: string;
  recipientNameAmharic: string;
  recipientNameEnglish: string;
  courseOrClass: string;
  academicYear: number;
  issueDateEthiopian: string;
  customMessageAmharic: string | null;
  bibleVerseAmharic: string | null;
  overallGrade: string | null;
  rankText: string | null;
  numberOfCourses?: number | null;
  totalScore?: number | null;
  averageScore?: number | null;
  rankInClass?: number | null;
  totalStudentsInClass?: number | null;
  courseBreakdown?: CourseBreakdownItem[] | null;
  signatory1Title: string;
  signatory1Name: string;
  signatory1Signature?: string | null;
  signatory2Title: string;
  signatory2Name: string;
  signatory2Signature?: string | null;
  signatory3Title: string;
  signatory3Name: string;
  signatory3Signature?: string | null;
  borderStyle: string;
  themeColor: string;
  createdAt: string;
  student: {
    studentCode: string;
    fullName: string;
    fullNameAmharic: string | null;
    gender?: string;
    age?: number;
    class?: { id: string; name: string; level: string };
  };
}

interface SystemSetting {
  id: string;
  systemNameAmharic: string;
  systemNameEnglish: string;
  churchNameAmharic: string;
  churchNameEnglish: string;
  mottoAmharic: string | null;
  primaryColorHex: string;
  accentColorHex: string;
  logoUrl: string | null;
  currentAcademicYear: number;
  defaultPassingScore: number | string;
  teachingAdminName: string | null;
  churchAdminName: string | null;
}

const BIBLE_VERSES = [
  '«በሃይማኖት ጸንታችሁ ቁሙ፣ ጎልምሱ፣ በረቱም፤ ሁሉ በእናንተ በፍቅር ይሁን።» (1ኛ ቆሮ. 16:13)',
  '«ሕፃኑን በሚሄድበት መንገድ ምራው፤ በሸመገለም ጊዜ ከእርሱ ፈቀቅ አይልም።» (ምሳሌ 22:6)',
  '«በቃልና በኑሮ በፍቅርም በእምነትም በንጽሕናም ለምእመናን አርዓያ ሁን እንጂ፥ ማንም ታናሽነትህን አይናቀው።» (1ኛ ጢሞ. 4:12)',
  '«የእግዚአብሔር ቃል በሙላት ይኑርባችሁ፤ በመንፈሳዊ ቅኔና ዝማሬ እግዚአብሔርን በልባችሁ አመስግኑ።» (ቆላ. 3:16)',
];

export default function CertificatesPage() {
  const { t, lang } = useLang();
  const user = getCurrentUser();
  const isAdmin = user?.role === 'ADMINISTRATOR';

  const [activeTab, setActiveTab] = useState<'batch_roster' | 'create' | 'history'>('batch_roster');
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // -------------------------------------------------------------
  // BATCH MULTI-COURSE CERTIFICATE GENERATOR STATE (Item 4)
  // -------------------------------------------------------------
  const [batchClassLevel, setBatchClassLevel] = useState<string>('CLASS_7_12');
  const [batchSemester, setBatchSemester] = useState<string>('SEMESTER_1');
  const [batchYear, setBatchYear] = useState<number>(2018);
  const [batchPreviousYear, setBatchPreviousYear] = useState<number>(2017);
  const [batchScope, setBatchScope] = useState<'BOTH' | 'ALL_TWO_PAGE' | 'TOP_3_ONLY'>('BOTH');
  const [batchTeacherNote, setBatchTeacherNote] = useState<string>(
    'ተማሪው በመንፈሳዊ ትምህርቱ ላይ ከፍተኛ ትጋትና ፍላጎት የሚያሳይ፣ በመልካም ስነ-ምግባሩ የተመሰገነ ነው።',
  );
  const [batchAdminNote, setBatchAdminNote] = useState<string>(
    'የቀረበውን የዓመቱን የትምህርት ውጤትና የስነ-ምግባር ምዘና መሠረት በማድረግ ወደ ሚቀጥለው የትምህርት ደረጃ እንዲዘዋወር ተወስኗል።',
  );
  const [availableCourses, setAvailableCourses] = useState<CourseItem[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [batchGrades, setBatchGrades] = useState<any[]>([]);
  const [batchPrevGrades, setBatchPrevGrades] = useState<any[]>([]);
  const [generatingBatch, setGeneratingBatch] = useState(false);
  const [batchTemplateType, setBatchTemplateType] = useState<CertificateRecord['templateType']>('HONOR_EXCELLENCE');
  const [batchIssueDate, setBatchIssueDate] = useState('ሰኔ 30 ቀን 2018 ዓ.ም');

  // Preview Modal for individual certificate
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewCert, setPreviewCert] = useState<CertificateRecord | null>(null);
  const [modalCertTab, setModalCertTab] = useState<'two_page' | 'top3_honor'>('two_page');
  const [twoPageView, setTwoPageView] = useState<'both' | 'front' | 'back'>('both');
  const [designerPreviewType, setDesignerPreviewType] = useState<'two_page' | 'top3_honor'>('two_page');

  // -------------------------------------------------------------
  // SINGLE CERTIFICATE BUILDER STATE
  // -------------------------------------------------------------
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [templateType, setTemplateType] = useState<CertificateRecord['templateType']>('HONOR_EXCELLENCE');
  const [titleAmharic, setTitleAmharic] = useState('የክብርና የላቀ ውጤት ምስክር ወረቀት');
  const [titleEnglish, setTitleEnglish] = useState('Certificate of Academic Excellence & High Honor');
  const [recipientNameAmharic, setRecipientNameAmharic] = useState('');
  const [recipientNameEnglish, setRecipientNameEnglish] = useState('');
  const [courseOrClass, setCourseOrClass] = useState('');
  const [academicYear, setAcademicYear] = useState(2018);
  const [issueDateEthiopian, setIssueDateEthiopian] = useState('');
  const [overallGrade, setOverallGrade] = useState('');
  const [rankText, setRankText] = useState('');
  const [numberOfCourses, setNumberOfCourses] = useState<number | ''>('');
  const [totalScore, setTotalScore] = useState<number | ''>('');
  const [averageScore, setAverageScore] = useState<number | ''>('');
  const [courseBreakdownList, setCourseBreakdownList] = useState<CourseBreakdownItem[]>([]);
  const [customMessageAmharic, setCustomMessageAmharic] = useState('');
  const [bibleVerseAmharic, setBibleVerseAmharic] = useState(BIBLE_VERSES[0]);

  // Signatories & Signatures
  const [signatory1Title, setSignatory1Title] = useState('የክፍሉ መምህር');
  const [signatory1Name, setSignatory1Name] = useState('');
  const [signatory1Signature, setSignatory1Signature] = useState<string | null>(null);

  const [signatory2Title, setSignatory2Title] = useState('የትምህርት ክፍል ኃላፊ');
  const [signatory2Name, setSignatory2Name] = useState('');
  const [signatory2Signature, setSignatory2Signature] = useState<string | null>(null);

  const [signatory3Title, setSignatory3Title] = useState('የሰንበት ት/ቤቱ ሰብሳቢ');
  const [signatory3Name, setSignatory3Name] = useState('');
  const [signatory3Signature, setSignatory3Signature] = useState<string | null>(null);

  const [borderStyle, setBorderStyle] = useState<string>('ETHIOPIC_GOLD_DOUBLE');
  const [themeColor, setThemeColor] = useState('#D4AF37'); // Gold

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadClassCoursesAndGrades();
  }, [batchClassLevel, batchSemester, batchYear, batchPreviousYear]);

  async function loadInitialData() {
    try {
      setLoading(true);
      const [certsRes, studentsRes, settingsRes] = await Promise.all([
        api.get<CertificateRecord[]>('/education/certificates'),
        api.get<any>('/students?pageSize=500'),
        api.get<SystemSetting>('/settings').catch(() => null),
      ]);
      setCertificates(certsRes || []);
      const allStudents: Student[] = Array.isArray(studentsRes) ? studentsRes : studentsRes?.data || [];
      setStudents(allStudents);
      if (settingsRes) {
        setSystemSettings(settingsRes);
        if (settingsRes.teachingAdminName) setSignatory2Name(settingsRes.teachingAdminName);
        if (settingsRes.churchAdminName) setSignatory3Name(settingsRes.churchAdminName);
        if (settingsRes.accentColorHex) setThemeColor(settingsRes.accentColorHex);
        if (settingsRes.currentAcademicYear) setAcademicYear(settingsRes.currentAcademicYear);
      }

      if (allStudents.length > 0) {
        await handleStudentSelect(allStudents[0]);
      }
    } catch (err) {
      console.error('Failed to load certificates data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadClassCoursesAndGrades() {
    try {
      const [coursesRes, gradesRes, prevGradesRes, studentsRes] = await Promise.all([
        api.get<CourseItem[]>(`/education/courses?classLevel=${batchClassLevel}`),
        api.get<any[]>(
          `/education/grades?classLevel=${batchClassLevel}&ethiopianYear=${batchYear}&semester=${batchSemester}`,
        ),
        api.get<any[]>(
          `/education/grades?classLevel=${batchClassLevel}&ethiopianYear=${batchPreviousYear}&semester=${batchSemester}`,
        ).catch(() => []),
        api.get<any>(`/students?classLevel=${batchClassLevel}&pageSize=500`),
      ]);
      setAvailableCourses(coursesRes || []);
      setBatchGrades(gradesRes || []);
      setBatchPrevGrades(prevGradesRes || []);
      const fetchedStudents: Student[] = Array.isArray(studentsRes) ? studentsRes : studentsRes?.data || [];
      setStudents((prev) => {
        const others = prev.filter((s) => s.class?.level !== batchClassLevel);
        return [...others, ...fetchedStudents];
      });
      // Auto-select all available courses for this class level
      setSelectedCourseIds((coursesRes || []).map((c) => c.id));
    } catch (err) {
      console.error('Failed to load class courses/grades:', err);
    }
  }

  async function handleStudentSelect(s: Student) {
    setSelectedStudentId(s.id);
    setRecipientNameAmharic(s.fullNameAmharic || s.fullName);
    setRecipientNameEnglish(s.fullName);
    setCourseOrClass(`${s.class?.name || 'ሰንበት ትምህርት'}`);
    try {
      const grades = await api.get<any[]>(`/education/grades?studentId=${s.id}`);
      if (grades && grades.length > 0) {
        const approved = grades.filter((g: any) => g.status === 'APPROVED' || g.status === 'SUBMITTED');
        if (approved.length > 0) {
          const breakdown: CourseBreakdownItem[] = approved.map((g: any) => ({
            courseId: g.courseId,
            code: g.course?.code || '',
            nameAmharic: g.course?.nameAmharic || g.course?.name || '',
            score: Number(g.totalScore),
            letterGrade: g.letterGrade || '',
          }));
          setCourseBreakdownList(breakdown);
          const total = approved.reduce((acc: number, g: any) => acc + Number(g.totalScore), 0);
          const avg = Number((total / approved.length).toFixed(1));
          setNumberOfCourses(approved.length);
          setTotalScore(total);
          setAverageScore(avg);
          setOverallGrade(`${avg}%`);
        } else {
          setCourseBreakdownList([]);
          setNumberOfCourses('');
          setTotalScore('');
          setAverageScore('');
          setOverallGrade('');
        }
      } else {
        setCourseBreakdownList([]);
        setNumberOfCourses('');
        setTotalScore('');
        setAverageScore('');
        setOverallGrade('');
      }
    } catch {
      setCourseBreakdownList([]);
      setNumberOfCourses('');
      setTotalScore('');
      setAverageScore('');
      setOverallGrade('');
    }
  }

  function toggleCourseSelection(courseId: string) {
    if (selectedCourseIds.includes(courseId)) {
      setSelectedCourseIds(selectedCourseIds.filter((id) => id !== courseId));
    } else {
      setSelectedCourseIds([...selectedCourseIds, courseId]);
    }
  }

  function selectAllCourses() {
    setSelectedCourseIds(availableCourses.map((c) => c.id));
  }

  function deselectAllCourses() {
    setSelectedCourseIds([]);
  }

  // Real-time computed class roster with multi-course 2-year metrics:
  // Year 1 ({batchPreviousYear}), Year 2 ({batchYear}), and 2-Year Average %
  const computedClassStudents = students
    .filter((s) => s.class?.level === batchClassLevel)
    .map((s) => {
      const studentGrades = batchGrades.filter(
        (g) => g.studentId === s.id && selectedCourseIds.includes(g.courseId),
      );
      const studentPrevGrades = batchPrevGrades.filter(
        (g) => g.studentId === s.id && selectedCourseIds.includes(g.courseId),
      );

      const coursesCount = selectedCourseIds.length;
      const year2Sum = studentGrades.reduce((acc, g) => acc + Number(g.totalScore), 0);
      const year1Sum = studentPrevGrades.reduce((acc, g) => acc + Number(g.totalScore), 0);

      const y2Avg = studentGrades.length > 0 ? Number((year2Sum / studentGrades.length).toFixed(1)) : 0;
      const y1Avg = studentPrevGrades.length > 0 ? Number((year1Sum / studentPrevGrades.length).toFixed(1)) : 0;

      let cumulativeAvg = y2Avg;
      if (studentPrevGrades.length > 0 && studentGrades.length > 0) {
        cumulativeAvg = Number(((y1Avg + y2Avg) / 2).toFixed(1));
      } else if (studentPrevGrades.length > 0) {
        cumulativeAvg = y1Avg;
      }

      // Grade breakdown map for both years
      const courseScores: { [courseId: string]: { y1?: number; y2?: number; avg?: number } } = {};
      selectedCourseIds.forEach((cid) => {
        const y2g = studentGrades.find((g) => g.courseId === cid);
        const y1g = studentPrevGrades.find((g) => g.courseId === cid);
        const y2Score = y2g ? Number(y2g.totalScore) : undefined;
        const y1Score = y1g ? Number(y1g.totalScore) : undefined;
        let cAvg: number | undefined = y2Score;
        if (y1Score !== undefined && y2Score !== undefined) {
          cAvg = Number(((y1Score + y2Score) / 2).toFixed(1));
        } else if (y1Score !== undefined) {
          cAvg = y1Score;
        }
        courseScores[cid] = { y1: y1Score, y2: y2Score, avg: cAvg };
      });

      return {
        student: s,
        coursesCount,
        sum: year2Sum > 0 ? year2Sum : (year1Sum > 0 ? year1Sum : 0),
        year1Sum,
        year2Sum,
        y1Avg,
        y2Avg,
        avg: cumulativeAvg,
        courseScores,
        isSuspended: s.isSuspended || s.behaviorStatus === 'SUSPENDED',
      };
    })
    // Sort descending by sum/avg to determine Rank
    .sort((a, b) => (b.year2Sum || b.sum) - (a.year2Sum || a.sum));

  // Assign ranks
  const totalInClass = computedClassStudents.length;
  let rankCounter = 1;
  const computedWithRanks = computedClassStudents.map((item, idx) => {
    if (idx > 0 && item.sum < computedClassStudents[idx - 1].sum) {
      rankCounter = idx + 1;
    }
    const isTopThree = rankCounter <= 3;
    return {
      ...item,
      rank: rankCounter,
      isTopThree,
      rankText: `${rankCounter}ኛ ደረጃ (ከ ${totalInClass} ተማሪዎች)`,
    };
  });

  async function handleGenerateBatchCertificates() {
    if (selectedCourseIds.length === 0) {
      alert(lang === 'am' ? 'እባክዎ ቢያንስ አንድ የትምህርት ዓይነት ይምረጡ' : 'Please select at least one course roster');
      return;
    }
    try {
      setGeneratingBatch(true);
      const res = await api.post<any>('/education/certificates/generate-class', {
        classLevel: batchClassLevel,
        courseIds: selectedCourseIds,
        ethiopianYear: batchYear,
        previousYear: batchPreviousYear || (batchYear - 1),
        semester: batchSemester,
        templateType: batchTemplateType,
        certificateScope: batchScope,
        teacherNote: batchTeacherNote,
        adminNote: batchAdminNote,
        issueDateEthiopian: batchIssueDate,
      });

      setNotification(
        lang === 'am'
          ? `በ${batchClassLevel} ለ${res.count} ተማሪዎች የሁለት ገጽ ሰርተፊኬቶችና ለደረጃ 1-3 የክብር ምስክር ወረቀቶች ተዘጋጅተዋል!`
          : `Successfully generated ${res.count} certificates (2-Page for all, Special Honor for Top 3)!`,
      );

      // Reload certificates
      const certsRes = await api.get<CertificateRecord[]>('/education/certificates');
      setCertificates(certsRes || []);
      setActiveTab('history');
      setTimeout(() => setNotification(null), 6000);
    } catch (err: any) {
      alert(err?.message || 'Failed to generate certificates');
    } finally {
      setGeneratingBatch(false);
    }
  }

  async function handleSaveSingleCertificate() {
    if (!selectedStudentId) {
      alert(lang === 'am' ? 'እባክዎ ተማሪ ይምረጡ' : 'Please select a student');
      return;
    }
    try {
      setSaving(true);
      const res = await api.post<CertificateRecord>('/education/certificates/generate', {
        studentId: selectedStudentId,
        templateType,
        titleAmharic,
        titleEnglish,
        recipientNameAmharic,
        recipientNameEnglish,
        courseOrClass,
        academicYear,
        issueDateEthiopian,
        overallGrade,
        rankText,
        numberOfCourses: Number(numberOfCourses) || undefined,
        totalScore: Number(totalScore) || undefined,
        averageScore: Number(averageScore) || undefined,
        courseBreakdown: courseBreakdownList,
        customMessageAmharic,
        bibleVerseAmharic,
        signatory1Title,
        signatory1Name,
        signatory1Signature,
        signatory2Title,
        signatory2Name,
        signatory2Signature,
        signatory3Title,
        signatory3Name,
        signatory3Signature,
        borderStyle,
        themeColor,
      });

      setCertificates([res, ...certificates]);
      setNotification(
        lang === 'am'
          ? `ሰርተፊኬት ቁጥር ${res.certificateNumber} በተሳካ ሁኔታ ተመዝግቧል!`
          : `Certificate ${res.certificateNumber} successfully generated and saved!`,
      );
      setTimeout(() => setNotification(null), 5000);
    } catch (err: any) {
      alert(err?.message || 'Failed to save certificate');
    } finally {
      setSaving(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  async function handleDeleteCertificate(id: string) {
    if (!confirm(lang === 'am' ? 'ይህ ሰርተፊኬት ይሰረዝ?' : 'Delete this certificate?')) return;
    try {
      await api.delete(`/education/certificates/${id}`);
      setCertificates(certificates.filter((c) => c.id !== id));
    } catch (err) {
      console.error('Failed to delete certificate:', err);
    }
  }

  function openPreviewCertificate(cert: CertificateRecord) {
    setPreviewCert(cert);
    setModalCertTab('two_page');
    setTwoPageView('both');
    setPreviewModalOpen(true);
  }

  const activeDesignerCert: any = {
    certificateNumber: `MH-CERT-${academicYear}-DRAFT`,
    recipientNameAmharic: recipientNameAmharic || 'ተማሪ ስም',
    recipientNameEnglish: recipientNameEnglish || 'Student Name',
    courseOrClass,
    academicYear,
    issueDateEthiopian,
    titleAmharic,
    titleEnglish,
    overallGrade,
    rankText,
    numberOfCourses: Number(numberOfCourses) || 4,
    totalScore: Number(totalScore) || 368,
    averageScore: Number(averageScore) || 92.0,
    rankInClass: 1,
    totalStudentsInClass: 15,
    customMessageAmharic,
    bibleVerseAmharic,
    signatory1Title,
    signatory1Name,
    signatory1Signature,
    signatory2Title,
    signatory2Name,
    signatory2Signature,
    signatory3Title,
    signatory3Name,
    signatory3Signature,
    themeColor,
    student: {
      studentCode: 'MH-0001',
      fullName: recipientNameEnglish || 'Student Name',
      fullNameAmharic: recipientNameAmharic || 'ተማሪ ስም',
      gender: 'MALE',
      age: 12,
    },
    courseBreakdown: {
      year1: academicYear - 1,
      year2: academicYear,
      courses: courseBreakdownList.map((c) => ({
        ...c,
        year1Score: Math.max(50, c.score - 4),
        year2Score: c.score,
        averageScore: c.score,
      })),
      year1Total: Number(totalScore) ? Number(totalScore) - 16 : 352,
      year2Total: Number(totalScore) || 368,
      averageTotal: Number(totalScore) || 368,
      year1Average: Number(averageScore) ? Number(averageScore) - 4 : 88.0,
      year2Average: Number(averageScore) || 92.0,
      cumulativeAverage: Number(averageScore) || 92.0,
      teacherNote: 'ተማሪው በመንፈሳዊ ትምህርቱ ላይ ከፍተኛ ትጋትና ፍላጎት የሚያሳይ፣ በመልካም ስነ-ምግባሩ የተመሰገነ ነው።',
      adminNote: 'የቀረበውን የዓመቱን የትምህርት ውጤትና የስነ-ምግባር ምዘና መሠረት በማድረግ ወደ ሚቀጥለው የትምህርት ደረጃ እንዲዘዋወር ተወስኗል።',
      conduct: 'አርአያ (Exemplary)',
      spiritualAttendance: 'ቋሚ (Active)',
      isTopThree: true,
      statusText: 'ወደ ሚቀጥለው ክፍል ተዛውሯል (Promoted)',
    },
  };

  return (
    <div className="space-y-6">
      {/* Print Stylesheet injection for A4 Landscape custom print formatting */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm;
          }
          body, html {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          header, aside, nav, .no-print {
            display: none !important;
          }
          .print-page {
            page-break-after: always !important;
            break-after: page !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 auto !important;
            width: 100% !important;
            min-height: 96vh !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            background: #FCFBF7 !important;
          }
          .print-page:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          .print-certificate-target {
            page-break-after: avoid !important;
            break-after: avoid !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 auto !important;
            width: 100% !important;
            min-height: 96vh !important;
            background: #FCFBF7 !important;
          }
        }
      `}</style>

      {/* Screen Header */}
      <div className="no-print">
        <Topbar
          title={lang === 'am' ? 'የምስክር ወረቀት ማዘጋጃና ማተሚያ' : 'Certificate Generator & Printing'}
          subtitle={
            lang === 'am'
              ? 'ከቀረቡ የትምህርት ሮስተሮች በድምር ነጥብ፣ አማካይና ደረጃ ሰርተፊኬቶችን በጅምላ አዘጋጅተህ አትም'
              : 'Generate multi-course certificates with totals, average %, class rank, and digital signatures'
          }
        >
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handlePrint}
              className="btn-gold flex items-center gap-1.5 text-xs sm:text-sm font-bold shadow-md"
            >
              <Printer size={16} />
              {lang === 'am' ? 'ሰርተፊኬት አትም (Print)' : 'Print Certificate'}
            </button>
          </div>
        </Topbar>
      </div>

      {notification && (
        <div className="no-print p-3.5 bg-green-50 text-green-800 border border-green-200 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle size={16} className="text-green-600" /> {notification}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="no-print flex border-b border-gray-200 gap-2">
        <button
          onClick={() => setActiveTab('batch_roster')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'batch_roster'
              ? 'border-gold text-ink'
              : 'border-transparent text-slate hover:text-ink'
          }`}
        >
          <Award size={15} className={activeTab === 'batch_roster' ? 'text-gold' : ''} />
          {lang === 'am' ? '1. ከቀረቡ የትምህርት ሮስተሮች በጅምላ አዘጋጅ' : '1. Generate from Course Rosters'}
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-gold/20 text-gold font-bold">
            አዲስ (Multi-Course)
          </span>
        </button>

        <button
          onClick={() => setActiveTab('create')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'create'
              ? 'border-gold text-ink'
              : 'border-transparent text-slate hover:text-ink'
          }`}
        >
          <Sliders size={15} className={activeTab === 'create' ? 'text-gold' : ''} />
          {lang === 'am' ? '2. ነጠላ ሰርተፊኬት ማበጃ (Designer)' : '2. Single Certificate Designer'}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'history'
              ? 'border-gold text-ink'
              : 'border-transparent text-slate hover:text-ink'
          }`}
        >
          <Scroll size={15} className={activeTab === 'history' ? 'text-gold' : ''} />
          {lang === 'am' ? '3. የተዘጋጁ ሰርተፊኬቶች ታሪክ' : '3. Certificate Records'}
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-gray-100 text-slate font-bold">
            {certificates.length}
          </span>
        </button>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-xs text-slate">{t('loading')}</div>
      ) : activeTab === 'batch_roster' ? (
        /* ========================================================================= */
        /* TAB 1: BATCH ROSTER CERTIFICATE GENERATOR (Item 4 & 5 Core Feature)       */
        /* ========================================================================= */
        <div className="space-y-5 no-print">
          {/* Controls: Class Level, Semester, 2-Year Selection, Scope & Remarks */}
          <div className="card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-ink flex items-center gap-2">
                  <Award className="text-gold" size={17} />
                  <span>{lang === 'am' ? 'ደረጃ 1፡ የክፍል፣ የ2 ዓመት የትምህርት ዘመን እና የሰርተፊኬት ዓይነት' : 'Step 1: Class, 2-Year Range & Certificate Mode'}</span>
                </h3>
                <p className="text-xs text-slate mt-0.5">
                  {lang === 'am'
                    ? 'የተማሪዎችን ውጤት በሁለቱ ዓመታት አጠቃልሎ የሁለት ገጽ ሰርተፊኬት እና ለደረጃ 1-3 የክብር ሰርተፊኬት ለማዘጋጀት ይምረጡ'
                    : 'Configure class, 2-year academic range for the back-page transcript table, and issuance scope'}
                </p>
              </div>

              {/* 2-Year Selection Inputs */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate">{lang === 'am' ? '1ኛ ዓመት:' : 'Year 1:'}</span>
                  <input
                    type="number"
                    className="input py-1 px-2 text-xs font-bold w-20 text-center"
                    placeholder="2017"
                    value={batchPreviousYear || ''}
                    onChange={(e) => setBatchPreviousYear(e.target.value ? Number(e.target.value) : 2017)}
                  />
                  <span className="text-xs text-slate">ዓ.ም</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate">{lang === 'am' ? '2ኛ ዓመት (ነባሪ):' : 'Year 2 (Default):'}</span>
                  <input
                    type="number"
                    className="input py-1 px-2 text-xs font-extrabold text-gold w-20 text-center border-gold/40"
                    placeholder="2018"
                    value={batchYear || ''}
                    onChange={(e) => setBatchYear(e.target.value ? Number(e.target.value) : 2018)}
                  />
                  <span className="text-xs text-slate">ዓ.ም</span>
                </div>
              </div>
            </div>

            {/* Certificate Scope / Issuance Mode (User Request Item) */}
            <div>
              <label className="label text-xs font-bold flex items-center gap-1.5">
                <Trophy size={14} className="text-gold" />
                <span>{lang === 'am' ? 'የሰርተፊኬት አወጣጥ ሁኔታ (Issuance Scope)' : 'Certificate Issuance Scope'}</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setBatchScope('BOTH')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    batchScope === 'BOTH'
                      ? 'border-gold bg-gold/10 ring-2 ring-gold/30 shadow-xs'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <p className="font-bold text-xs text-ink flex items-center gap-1.5">
                    <span>🏆+📄 ሁለቱንም አዘጋጅ (የተመከረ)</span>
                  </p>
                  <p className="text-[10px] text-slate mt-0.5 leading-snug">
                    ለሁሉም ተማሪዎች የሁለት ገጽ (Front & Back) + ለደረጃ 1-3 ልዩ የክብር ሰርተፊኬት
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setBatchScope('ALL_TWO_PAGE')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    batchScope === 'ALL_TWO_PAGE'
                      ? 'border-gold bg-gold/10 ring-2 ring-gold/30 shadow-xs'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <p className="font-bold text-xs text-ink flex items-center gap-1.5">
                    <span>📄 የሁለት ገጽ ሰርተፊኬት ብቻ</span>
                  </p>
                  <p className="text-[10px] text-slate mt-0.5 leading-snug">
                    ለሁሉም ተማሪዎች የሁለት ገጽ ውጤት መግለጫና ምስክር ወረቀት
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setBatchScope('TOP_3_ONLY')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    batchScope === 'TOP_3_ONLY'
                      ? 'border-gold bg-gold/10 ring-2 ring-gold/30 shadow-xs'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <p className="font-bold text-xs text-ink flex items-center gap-1.5">
                    <span>🎖️ የደረጃ 1-3 የክብር ሰርተፊኬት ብቻ</span>
                  </p>
                  <p className="text-[10px] text-slate mt-0.5 leading-snug">
                    ለክፍሉ 1ኛ፣ 2ኛ እና 3ኛ ለወጡ ተማሪዎች ብቻ ነጠላ የክብር ሰርተፊኬት
                  </p>
                </button>
              </div>
            </div>

            {/* Class Level Tabs */}
            <div>
              <label className="label">{lang === 'am' ? 'የክፍል ደረጃ (Class Level)' : 'Class Level'}</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: 'CLASS_1_3', titleAm: 'ክፍል 1-3', subAm: 'ከ1ኛ እስከ 3ኛ ክፍል' },
                  { id: 'CLASS_4_6', titleAm: 'ክፍል 4-6', subAm: 'ከ4ኛ እስከ 6ኛ ክፍል' },
                  { id: 'CLASS_7_12', titleAm: 'ክፍል 7-12', subAm: 'ከ7ኛ እስከ 12ኛ ክፍል' },
                ].map((lvl) => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setBatchClassLevel(lvl.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      batchClassLevel === lvl.id
                        ? 'border-gold bg-gold/10 ring-2 ring-gold/30'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <p className="font-bold text-xs text-ink">{lvl.titleAm}</p>
                    <p className="text-[11px] text-slate">{lvl.subAm}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Semester Tabs */}
            <div>
              <label className="label">{lang === 'am' ? 'መንፈቀ ዓመት (Semester / Term)' : 'Semester'}</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setBatchSemester('SEMESTER_1')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    batchSemester === 'SEMESTER_1'
                      ? 'bg-gold text-ink shadow-sm'
                      : 'bg-gray-100 text-slate hover:bg-gray-200'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-ink/10 flex items-center justify-center text-[10px]">1</span>
                  {lang === 'am' ? '1ኛ መንፈቀ ዓመት' : '1st Semester'}
                </button>
                <button
                  type="button"
                  onClick={() => setBatchSemester('SEMESTER_2')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    batchSemester === 'SEMESTER_2'
                      ? 'bg-gold text-ink shadow-sm'
                      : 'bg-gray-100 text-slate hover:bg-gray-200'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-ink/10 flex items-center justify-center text-[10px]">2</span>
                  {lang === 'am' ? '2ኛ መንፈቀ ዓመት' : '2nd Semester'}
                </button>
                <button
                  type="button"
                  onClick={() => setBatchSemester('YEAR_ROUND')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    batchSemester === 'YEAR_ROUND'
                      ? 'bg-gold text-ink shadow-sm'
                      : 'bg-gray-100 text-slate hover:bg-gray-200'
                  }`}
                >
                  {lang === 'am' ? 'ዓመታዊ ማጠቃለያ' : 'Year-Round'}
                </button>
              </div>
            </div>

            {/* Teacher Note & Admin Note (for Page 2 Back side) */}
            <div className="border-t border-gray-100 pt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="label text-[11px] font-bold text-ink flex items-center gap-1">
                  <span>✍️ የክፍሉ መምህር አስተያየት (Teacher Note on Back Page)</span>
                </label>
                <textarea
                  rows={2}
                  className="input text-xs"
                  value={batchTeacherNote}
                  onChange={(e) => setBatchTeacherNote(e.target.value)}
                  placeholder="ተማሪው በመንፈሳዊ ትምህርቱ ላይ ያሳየው ትጋት..."
                />
              </div>

              <div>
                <label className="label text-[11px] font-bold text-ink flex items-center gap-1">
                  <span>🏛️ የትምህርት ክፍል አስተዳደር አስተያየት (Admin Note on Back Page)</span>
                </label>
                <textarea
                  rows={2}
                  className="input text-xs"
                  value={batchAdminNote}
                  onChange={(e) => setBatchAdminNote(e.target.value)}
                  placeholder="የውጤትና ስነ-ምግባር ምዘና መሠረት በማድረግ..."
                />
              </div>
            </div>
          </div>

          {/* Course Rosters Selection Card */}
          <div className="card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-ink flex items-center gap-2">
                  <BookOpen className="text-gold" size={17} />
                  <span>{lang === 'am' ? 'ደረጃ 2፡ በሰርተፊኬቱ ላይ የሚካተቱ የትምህርት ሮስተሮች' : 'Step 2: Pick Course Rosters'}</span>
                </h3>
                <p className="text-xs text-slate mt-0.5">
                  {lang === 'am'
                    ? 'መምህራን ያስገቧቸውን የትምህርት ውጤቶች ይምረጡ፤ ሲስተሙ የነጥብ ድምር፣ አማካይ እና የክፍል ደረጃ ያሰላል'
                    : 'Select submitted course marks to include in the certificate calculation'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllCourses}
                  className="text-xs text-gold hover:underline font-semibold"
                >
                  {lang === 'am' ? 'ሁሉንም ምረጥ' : 'Select All'}
                </button>
                <span className="text-slate">•</span>
                <button
                  type="button"
                  onClick={deselectAllCourses}
                  className="text-xs text-slate hover:underline"
                >
                  {lang === 'am' ? 'ሁሉንም አውጣ' : 'Deselect All'}
                </button>
              </div>
            </div>

            {availableCourses.length === 0 ? (
              <p className="text-xs text-slate italic p-4 text-center">
                {lang === 'am' ? 'በዚህ ክፍል ምንም የተመዘገበ ትምህርት የለም።' : 'No courses registered in this class level.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {availableCourses.map((c) => {
                  const isChecked = selectedCourseIds.includes(c.id);
                  const gradesCount = batchGrades.filter((g) => g.courseId === c.id).length;
                  return (
                    <div
                      key={c.id}
                      onClick={() => toggleCourseSelection(c.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                        isChecked
                          ? 'border-gold bg-gold/10 shadow-xs'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="mt-0.5 text-gold shrink-0">
                        {isChecked ? <CheckSquare size={17} /> : <Square size={17} className="text-slate/60" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-mono text-[10px] text-gold font-bold uppercase block">{c.code}</span>
                        <h4 className="font-bold text-xs text-ink truncate">{c.nameAmharic}</h4>
                        <p className="text-[11px] text-slate truncate">{c.name}</p>
                        <div className="mt-1 flex items-center justify-between text-[10px] text-slate border-t border-gray-100 pt-1">
                          <span>{c.teacher?.fullName || 'መምህር አልተመደበም'}</span>
                          <span className="font-semibold text-emerald-700">{gradesCount} ተማሪዎች</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Step 3: Aggregated Student Grades & Class Rankings Table */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-mist/30">
              <div>
                <h3 className="font-bold text-sm text-ink flex items-center gap-2">
                  <CheckCircle2 size={17} className="text-emerald-600" />
                  <span>
                    {lang === 'am' ? 'ደረጃ 3፡ የተሰላ የውጤት ድምር፣ አማካይ እና የክፍሉ ደረጃ' : 'Step 3: Aggregated Totals, Average % & Class Ranks'}
                  </span>
                </h3>
                <p className="text-xs text-slate mt-0.5">
                  {lang === 'am'
                    ? `በመምረጣቸው ${selectedCourseIds.length} የትምህርት ዓይነቶች መሠረት ለእያንዳንዱ ተማሪ የተሰላ ደረጃ`
                    : `Live computed scores across ${selectedCourseIds.length} selected courses`}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs bg-gold/20 text-gold font-bold px-2.5 py-1 rounded-full">
                  {computedWithRanks.length} {lang === 'am' ? 'ተማሪዎች' : 'Students'}
                </span>
                <button
                  type="button"
                  onClick={handleGenerateBatchCertificates}
                  disabled={generatingBatch || selectedCourseIds.length === 0 || computedWithRanks.length === 0}
                  className="btn-gold flex items-center gap-2 text-xs font-bold py-2 px-4 shadow-md"
                >
                  <Sparkles size={15} />
                  {generatingBatch
                    ? t('saving')
                    : lang === 'am'
                    ? 'የክፍል ሰርተፊኬቶችን በጅምላ አዘጋጅ (Generate)'
                    : 'Generate All Class Certificates'}
                </button>
              </div>
            </div>

            {computedWithRanks.some((r) => r.isSuspended) && (
              <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-300 rounded-lg text-red-900 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-red-600 shrink-0" />
                  <span>
                    {lang === 'am'
                      ? 'ማስጠንቀቂያ፡ በዚህ ክፍል ውስጥ የታገደ ተማሪ አለ። እገዳው እስካልተነሳ ድረስ ሰርተፊኬት እንዳይዘጋጅላቸው ጥንቃቄ ያድርጉ።'
                      : 'Warning: There are suspended students in this class. Refrain from issuing certificates until suspensions are lifted.'}
                  </span>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr className="bg-mist/40">
                    <th className="w-16">{lang === 'am' ? 'መለያ' : 'ID'}</th>
                    <th className="min-w-[140px]">{lang === 'am' ? 'የተማሪው ስም' : 'Student Name'}</th>
                    <th className="w-24 text-center">{lang === 'am' ? 'ዕድሜ / ፆታ' : 'Age / Gender'}</th>
                    {availableCourses
                      .filter((c) => selectedCourseIds.includes(c.id))
                      .map((c) => (
                        <th key={c.id} className="text-center font-semibold text-xs">
                          {c.nameAmharic}
                        </th>
                      ))}
                    <th className="w-20 text-center font-bold text-slate">{batchPreviousYear} ድምር</th>
                    <th className="w-20 text-center font-bold text-ink">{batchYear} ድምር</th>
                    <th className="w-20 text-center font-extrabold text-gold">{lang === 'am' ? 'አማካይ (%)' : 'Average'}</th>
                    <th className="w-24 text-center font-bold text-ink">{lang === 'am' ? 'ከክፍሉ ደረጃ' : 'Class Rank'}</th>
                    <th className="w-36 text-center font-bold text-ink">{lang === 'am' ? 'የሚሰጠው ሰርተፊኬት' : 'Format'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {computedWithRanks.length === 0 ? (
                    <tr>
                      <td colSpan={9 + availableCourses.length} className="p-8 text-center text-xs text-slate">
                        {lang === 'am' ? 'ምንም ተማሪ አልተገኘም' : 'No students found'}
                      </td>
                    </tr>
                  ) : (
                    computedWithRanks.map((item) => (
                      <tr key={item.student.id} className={`hover:bg-amber-50/20 ${item.isSuspended ? 'bg-red-50/30' : ''}`}>
                        <td className="font-mono text-xs text-slate">{item.student.studentCode}</td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <div>
                              <p className="font-semibold text-xs text-ink">
                                {lang === 'am' && item.student.fullNameAmharic
                                  ? item.student.fullNameAmharic
                                  : item.student.fullName}
                              </p>
                              {lang === 'am' && item.student.fullNameAmharic && (
                                <p className="text-[10px] text-slate">{item.student.fullName}</p>
                              )}
                            </div>
                            {item.isSuspended && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                                ⚠️ {lang === 'am' ? 'የታገደ' : 'Suspended'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="text-center text-xs text-slate whitespace-nowrap">
                          <span className="font-medium text-ink">
                            {item.student.age !== undefined && item.student.age !== null
                              ? `${item.student.age} ዓመት`
                              : '—'}
                          </span>
                          <span className="text-[10px] block text-slate/70">
                            {item.student.gender === 'MALE' ? 'ወንድ' : 'ሴት'}
                          </span>
                        </td>

                        {/* Individual Course Scores */}
                        {availableCourses
                          .filter((c) => selectedCourseIds.includes(c.id))
                          .map((c) => {
                            const sc = item.courseScores[c.id];
                            return (
                              <td key={c.id} className="text-center text-xs font-semibold">
                                {sc?.avg !== undefined ? (
                                  <div>
                                    <span className={sc.avg >= 50 ? 'text-ink font-bold' : 'text-rose-600'}>
                                      {sc.avg}%
                                    </span>
                                    {sc.y1 !== undefined && sc.y2 !== undefined && (
                                      <span className="block text-[8.5px] text-slate/70">
                                        {sc.y1}% / {sc.y2}%
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate/40">—</span>
                                )}
                              </td>
                            );
                          })}

                        {/* 2-Year Summary Metrics */}
                        <td className="text-center text-xs font-semibold text-slate">
                          {item.year1Sum > 0 ? item.year1Sum : '—'}
                        </td>
                        <td className="text-center text-xs font-bold text-ink">
                          {item.year2Sum > 0 ? item.year2Sum : '—'}
                        </td>
                        <td className="text-center text-xs font-extrabold text-amber-800">
                          {item.avg}%
                        </td>
                        <td className="text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              item.rank === 1
                                ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs'
                                : item.rank === 2
                                ? 'bg-slate-100 text-slate-800 border border-slate-300'
                                : item.rank === 3
                                ? 'bg-orange-100 text-orange-900 border border-orange-300'
                                : 'bg-gray-100 text-slate'
                            }`}
                          >
                            {item.isTopThree && <span>🏆</span>}
                            <span>{item.rankText}</span>
                          </span>
                        </td>
                        <td className="text-center">
                          {item.isTopThree ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                              🏆 {lang === 'am' ? 'ደረጃ 1-3 ክብር + 2-ገጽ' : 'Top 3 Honor + 2-Page'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-slate border border-gray-200">
                              📄 {lang === 'am' ? 'የ2-ገጽ ሰርተፊኬት' : '2-Page Certificate'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'create' ? (
        /* ========================================================================= */
        /* TAB 2: SINGLE CERTIFICATE DESIGNER & PREVIEW                              */
        /* ========================================================================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel: Customizer Controls (5 cols) */}
          <div className="lg:col-span-5 space-y-4 no-print">
            {/* Student Picker */}
            <div className="card p-4 space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate flex items-center gap-1.5">
                <Award size={14} className="text-gold" />
                <span>1. {lang === 'am' ? 'ተማሪ ምረጥ' : 'Select Student'}</span>
              </h4>
              <select
                className="input font-semibold"
                value={selectedStudentId}
                onChange={(e) => {
                  const s = students.find((st) => st.id === e.target.value);
                  if (s) handleStudentSelect(s);
                }}
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.isSuspended ? '⚠️ [የታገደ] ' : ''}{s.studentCode} - {s.fullNameAmharic || s.fullName} ({s.class?.name})
                  </option>
                ))}
              </select>

              {students.find((st) => st.id === selectedStudentId)?.isSuspended && (
                <div className="p-3 bg-red-50 border-2 border-red-500 rounded-lg text-red-900 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle size={18} className="text-red-600 shrink-0" />
                  <div>
                    <p className="font-extrabold">{lang === 'am' ? '⚠️ ማስጠንቀቂያ፡ ይህ ተማሪ በአሁኑ ወቅት የታገደ ነው!' : '⚠️ Warning: This student is currently suspended!'}</p>
                    <p className="font-normal text-[11px] mt-0.5">
                      {lang === 'am' ? 'የእገዳ ምክንያት፡ ' : 'Reason: '}
                      {students.find((st) => st.id === selectedStudentId)?.suspensionReason || (lang === 'am' ? 'የዲሲፕሊን ጥሰት' : 'Disciplinary violation')}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Custom Content & Fields */}
            <div className="card p-4 space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate flex items-center gap-1.5">
                <Sliders size={14} className="text-gold" />
                <span>2. {lang === 'am' ? 'የውጤትና የአካዳሚክ መረጃዎች' : 'Academic Scores & Metrics'}</span>
              </h4>

              <div className="space-y-2.5 text-xs">
                <div>
                  <label className="label">{lang === 'am' ? 'የተማሪው ስም (በአማርኛ)' : 'Student Name (Amharic)'}</label>
                  <input
                    type="text"
                    className="input font-bold"
                    value={recipientNameAmharic}
                    onChange={(e) => setRecipientNameAmharic(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label">{lang === 'am' ? 'ክፍል' : 'Class / Level'}</label>
                    <input
                      type="text"
                      className="input"
                      value={courseOrClass}
                      onChange={(e) => setCourseOrClass(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">{lang === 'am' ? 'የተሰጠበት ቀን' : 'Issue Date'}</label>
                    <input
                      type="text"
                      className="input"
                      value={issueDateEthiopian}
                      onChange={(e) => setIssueDateEthiopian(e.target.value)}
                    />
                  </div>
                </div>

                {/* 4 Multi-Course Metrics (Item 4) */}
                <div className="grid grid-cols-2 gap-2 p-3 bg-mist/30 rounded-xl border border-gray-100">
                  <div>
                    <label className="label">{lang === 'am' ? 'የትምህርቶች ብዛት' : 'No. of Courses'}</label>
                    <input
                      type="number"
                      className="input font-bold"
                      value={numberOfCourses}
                      onChange={(e) => setNumberOfCourses(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="label">{lang === 'am' ? 'ድምር ውጤት' : 'Total Score'}</label>
                    <input
                      type="number"
                      className="input font-bold"
                      value={totalScore}
                      onChange={(e) => setTotalScore(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="label">{lang === 'am' ? 'አማካይ ውጤት (%)' : 'Average Score (%)'}</label>
                    <input
                      type="number"
                      className="input font-bold text-gold"
                      value={averageScore}
                      onChange={(e) => setAverageScore(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="label">{lang === 'am' ? 'ከክፍሉ ደረጃ' : 'Class Rank'}</label>
                    <input
                      type="text"
                      className="input font-bold"
                      value={rankText}
                      onChange={(e) => setRankText(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">{lang === 'am' ? 'የእንኳን ደስ አላችሁ ዝርዝር መግለጫ' : 'Congratulatory Body Text'}</label>
                  <textarea
                    rows={2}
                    className="input leading-relaxed"
                    value={customMessageAmharic}
                    onChange={(e) => setCustomMessageAmharic(e.target.value)}
                  />
                </div>

                <div>
                  <label className="label">{lang === 'am' ? 'የመጽሐፍ ቅዱስ ጥቅስ (Verse)' : 'Bible Verse'}</label>
                  <select
                    className="input mb-1 text-[11px]"
                    onChange={(e) => setBibleVerseAmharic(e.target.value)}
                    value={bibleVerseAmharic}
                  >
                    {BIBLE_VERSES.map((v, i) => (
                      <option key={i} value={v}>
                        {v.substring(0, 45)}…
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Signatories & Signatures */}
            <div className="card p-4 space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate flex items-center gap-1.5">
                <Palette size={14} className="text-gold" />
                <span>3. {lang === 'am' ? 'የባለስልጣናት ይፋዊ ፊርማዎች' : 'Official Digital Signatures'}</span>
              </h4>

              <div className="space-y-3 text-xs">
                {/* Signatory 1: Teacher */}
                <div className="p-2.5 rounded-lg border border-gray-200 space-y-1.5 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ink">{lang === 'am' ? '1. የክፍሉ/የትምህርቱ መምህር' : '1. Class Teacher'}</span>
                    {signatory1Signature && (
                      <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                        <Check size={11} /> ፊርማ ተያይዟል
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    className="input text-[11px]"
                    value={signatory1Name}
                    onChange={(e) => setSignatory1Name(e.target.value)}
                    placeholder="የመምህሩ ስም"
                  />
                </div>

                {/* Signatory 2: Education Head */}
                <div className="p-2.5 rounded-lg border border-gray-200 space-y-1.5 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ink">{lang === 'am' ? '2. የትምህርት ክፍል ኃላፊ' : '2. Head of Education'}</span>
                    {signatory2Signature && (
                      <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                        <Check size={11} /> ፊርማ ተያይዟል
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    className="input text-[11px]"
                    value={signatory2Name}
                    onChange={(e) => setSignatory2Name(e.target.value)}
                    placeholder="የትምህርት ኃላፊ ስም"
                  />
                </div>

                {/* Signatory 3: Church Administrator */}
                <div className="p-2.5 rounded-lg border border-gray-200 space-y-1.5 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ink">{lang === 'am' ? '3. የሰ/ት/ቤቱ ዋና አስተዳዳሪ' : '3. Church Administration'}</span>
                    {signatory3Signature && (
                      <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                        <Check size={11} /> ፊርማ ተያይዟል
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    className="input text-[11px]"
                    value={signatory3Name}
                    onChange={(e) => setSignatory3Name(e.target.value)}
                    placeholder="የዋና አስተዳዳሪ ስም"
                  />
                </div>
              </div>

              {isAdmin && (
                <button
                  type="button"
                  onClick={handleSaveSingleCertificate}
                  disabled={saving}
                  className="btn-primary w-full text-xs font-semibold mt-2"
                >
                  <FileCheck2 size={15} />
                  {saving ? t('saving') : lang === 'am' ? 'ሰርተፊኬቱን መዝግብ (Save Record)' : 'Save Record'}
                </button>
              )}
            </div>
          </div>

          {/* Right Panel: Live Certificate Preview & Print Target (7 cols) */}
          <div className="lg:col-span-7">
            <div className="sticky top-6 space-y-3">
              <div className="no-print flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-amber-50 p-1 rounded-xl border border-amber-200 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setDesignerPreviewType('two_page')}
                      className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                        designerPreviewType === 'two_page'
                          ? 'bg-gold text-ink shadow-2xs font-extrabold'
                          : 'text-slate hover:text-ink'
                      }`}
                    >
                      <span>📄 የሁለት ገጽ ምስክር ወረቀት</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDesignerPreviewType('top3_honor')}
                      className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                        designerPreviewType === 'top3_honor'
                          ? 'bg-amber-600 text-white shadow-2xs font-extrabold'
                          : 'text-amber-800 hover:text-amber-950'
                      }`}
                    >
                      <Trophy size={13} />
                      <span>🏆 የደረጃ 1-3 የክብር ሰርተፊኬት</span>
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="btn-gold flex items-center gap-1.5 text-xs py-1.5 px-3.5 font-bold shadow-sm"
                >
                  <Printer size={14} />
                  <span>
                    {designerPreviewType === 'two_page'
                      ? 'የሁለት ገጽ ሰርተፊኬት አትም (Duplex Print)'
                      : 'የክብር ሰርተፊኬት አትም (Print)'}
                  </span>
                </button>
              </div>

              {/* The Actual Printable Certificate Frame (Two-Page or Top 3 Honor) */}
              {designerPreviewType === 'two_page' ? (
                <div className="print-certificate-target w-full">
                  <TwoPageCertificate
                    cert={activeDesignerCert}
                    systemSettings={systemSettings}
                    viewMode="both"
                  />
                </div>
              ) : (
                <div
                  className="print-certificate-target w-full bg-[#FCFBF7] text-[#111111] rounded-2xl shadow-xl overflow-hidden border border-gray-200 relative select-none"
                  style={{
                    aspectRatio: '1.414 / 1', // A4 Landscape ratio
                    minHeight: '520px',
                  }}
                >
                  {/* Outer Ethiopian Border with Rosettes */}
                  <div
                    className="absolute inset-3 border-4 rounded-xl pointer-events-none"
                    style={{ borderColor: themeColor }}
                  >
                    {/* Inner Fillet Line */}
                    <div
                      className="absolute inset-1.5 border border-dashed rounded-lg"
                      style={{ borderColor: themeColor }}
                    />

                    {/* Corner Ethiopian Cross Ornaments */}
                    <div className="absolute -top-3.5 -left-3.5 w-7 h-7 bg-[#FCFBF7] flex items-center justify-center font-bold text-base" style={{ color: themeColor }}>
                      ☩
                    </div>
                    <div className="absolute -top-3.5 -right-3.5 w-7 h-7 bg-[#FCFBF7] flex items-center justify-center font-bold text-base" style={{ color: themeColor }}>
                      ☩
                    </div>
                    <div className="absolute -bottom-3.5 -left-3.5 w-7 h-7 bg-[#FCFBF7] flex items-center justify-center font-bold text-base" style={{ color: themeColor }}>
                      ☩
                    </div>
                    <div className="absolute -bottom-3.5 -right-3.5 w-7 h-7 bg-[#FCFBF7] flex items-center justify-center font-bold text-base" style={{ color: themeColor }}>
                      ☩
                    </div>
                  </div>

                  {/* Certificate Core Content */}
                  <div className="relative h-full flex flex-col justify-between p-6 sm:p-8 text-center">
                    {/* Top Header */}
                    <div>
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <span className="text-[11px] sm:text-xs font-bold tracking-widest text-[#555] uppercase">
                          በስመ አብ ወወልድ ወመንፈስ ቅዱስ አሐዱ አምላክ አሜን
                        </span>
                      </div>

                      <div className="flex items-center justify-center gap-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border border-amber-300 bg-white/50 shrink-0">
                          <Image src="/logo.jpg" alt="Logo" width={48} height={48} className="object-cover w-full h-full" />
                        </div>
                        <div>
                          <h2 className="text-xs sm:text-sm font-bold tracking-wide text-ink">
                            {systemSettings?.churchNameAmharic || 'በኢትዮጵያ ኦርቶዶክስ ተዋሕዶ ቤተ ክርስቲያን'}
                          </h2>
                          <h1 className="text-sm sm:text-base font-extrabold tracking-wider" style={{ color: themeColor }}>
                            {systemSettings?.systemNameAmharic || 'ደብረ አሚን መርሃ ህይወት ሰንበት ትምህርት ቤት'}
                          </h1>
                          <p className="text-[9px] sm:text-[11px] text-slate font-medium">
                            {systemSettings?.systemNameEnglish || 'Merha Hiwot Sunday School'}
                          </p>
                        </div>
                      </div>

                      {/* Certificate Title Badge */}
                      <div className="mt-2 inline-block">
                        <div
                          className="px-5 py-1 rounded-full border-2 inline-flex flex-col items-center shadow-2xs"
                          style={{
                            borderColor: themeColor,
                            backgroundColor: `${themeColor}12`,
                          }}
                        >
                          <span className="text-xs sm:text-sm font-black tracking-wide" style={{ color: themeColor }}>
                            {titleAmharic}
                          </span>
                          <span className="text-[9px] font-semibold text-slate uppercase tracking-wider">
                            {titleEnglish}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Middle Body: Recipient & Citation */}
                    <div className="my-auto py-1 space-y-1.5">
                      <p className="text-[10px] sm:text-[11px] text-slate tracking-wide">
                        ይህ የምስክር ወረቀት በመንፈሳዊ ትምህርቱ ላሳየው ከፍተኛ ትጋትና የላቀ ውጤት ለተማሪ
                      </p>

                      <div>
                        <h3 className="text-lg sm:text-xl font-black text-ink tracking-wide font-serif">
                          {recipientNameAmharic || 'ተማሪ ስም'}
                        </h3>
                        {recipientNameEnglish && (
                          <p className="text-[10px] font-semibold text-slate font-sans tracking-wider uppercase">
                            {recipientNameEnglish}
                          </p>
                        )}
                      </div>

                      <p className="text-[11px] font-bold text-slate">
                        {courseOrClass}
                      </p>

                      {/* 4 Multi-Course Metric Cards (Item 4 Requirements) */}
                      <div className="max-w-xl mx-auto grid grid-cols-4 gap-2 pt-1">
                        <div className="p-1.5 bg-white border border-gray-200 rounded-lg shadow-2xs">
                          <span className="text-[9px] text-slate block leading-tight">የትምህርት ብዛት</span>
                          <strong className="text-xs font-black text-ink">{numberOfCourses || 4}</strong>
                        </div>
                        <div className="p-1.5 bg-white border border-gray-200 rounded-lg shadow-2xs">
                          <span className="text-[9px] text-slate block leading-tight">ድምር ውጤት</span>
                          <strong className="text-xs font-black text-ink">{totalScore || 368}</strong>
                        </div>
                        <div className="p-1.5 bg-white border border-gray-200 rounded-lg shadow-2xs">
                          <span className="text-[9px] text-slate block leading-tight">አማካይ ውጤት</span>
                          <strong className="text-xs font-black text-gold">{averageScore || 92.0}%</strong>
                        </div>
                        <div className="p-1.5 bg-white border border-gray-200 rounded-lg shadow-2xs">
                          <span className="text-[9px] text-slate block leading-tight">ከክፍሉ ደረጃ</span>
                          <strong className="text-xs font-black text-ink">{rankText?.split('(')[0] || '1ኛ ደረጃ'}</strong>
                        </div>
                      </div>

                      {/* Citation text */}
                      <p className="max-w-xl mx-auto text-[10px] text-ink/80 leading-relaxed px-4">
                        {customMessageAmharic}
                      </p>

                      {/* Bible Verse Box */}
                      {bibleVerseAmharic && (
                        <div className="max-w-lg mx-auto pt-0.5">
                          <p className="text-[9px] italic font-serif text-slate border-t border-b border-gray-200 py-0.5 px-4">
                            {bibleVerseAmharic}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Bottom: Date, Gold Stamp & 3 Digital Signatures (Item 5) */}
                    <div className="pt-2">
                      <div className="grid grid-cols-4 items-end text-center gap-2">
                        {/* Signatory 1: Course / Class Teacher Signature */}
                        <div className="flex flex-col items-center">
                          <div className="h-10 flex items-center justify-center">
                            {signatory1Signature ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={signatory1Signature}
                                alt="Teacher Signature"
                                className="max-h-9 max-w-[100px] object-contain"
                              />
                            ) : (
                              <div className="w-16 h-4" />
                            )}
                          </div>
                          <div className="w-24 sm:w-28 mx-auto border-b border-dashed border-gray-400 mb-0.5" />
                          <p className="text-[9px] sm:text-[10px] font-bold text-ink">{signatory1Name}</p>
                          <p className="text-[8px] text-slate">{signatory1Title}</p>
                        </div>

                        {/* Official Gold Seal Stamp */}
                        <div className="flex flex-col items-center justify-center">
                          <div
                            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-double flex flex-col items-center justify-center text-center shadow-xs"
                            style={{
                              borderColor: themeColor,
                              color: themeColor,
                              backgroundColor: `${themeColor}15`,
                            }}
                          >
                            <span className="text-xs font-bold">☩</span>
                            <span className="text-[6.5px] font-bold tracking-tighter uppercase leading-tight">
                              መርሃ ህይወት<br />ማኅተም
                            </span>
                          </div>
                          <span className="text-[7.5px] font-mono text-slate mt-0.5">{issueDateEthiopian}</span>
                        </div>

                        {/* Signatory 2: Education Dept Head Signature */}
                        <div className="flex flex-col items-center">
                          <div className="h-10 flex items-center justify-center">
                            {signatory2Signature ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={signatory2Signature}
                                alt="Education Admin Signature"
                                className="max-h-9 max-w-[100px] object-contain"
                              />
                            ) : (
                              <div className="w-16 h-4" />
                            )}
                          </div>
                          <div className="w-24 sm:w-28 mx-auto border-b border-dashed border-gray-400 mb-0.5" />
                          <p className="text-[9px] sm:text-[10px] font-bold text-ink">{signatory2Name}</p>
                          <p className="text-[8px] text-slate">{signatory2Title}</p>
                        </div>

                        {/* Signatory 3: Church Sunday School President Signature */}
                        <div className="flex flex-col items-center">
                          <div className="h-10 flex items-center justify-center">
                            {signatory3Signature ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={signatory3Signature}
                                alt="President Signature"
                                className="max-h-9 max-w-[100px] object-contain"
                              />
                            ) : (
                              <div className="w-16 h-4" />
                            )}
                          </div>
                          <div className="w-24 sm:w-28 mx-auto border-b border-dashed border-gray-400 mb-0.5" />
                          <p className="text-[9px] sm:text-[10px] font-bold text-ink">{signatory3Name}</p>
                          <p className="text-[8px] text-slate">{signatory3Title}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* TAB 3: CERTIFICATES HISTORY & PRINT DIRECTORY                             */
        /* ========================================================================= */
        <div className="card overflow-hidden no-print">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-mist/30">
            <h3 className="font-bold text-sm text-ink flex items-center gap-2">
              <Scroll size={18} className="text-gold" />
              <span>{lang === 'am' ? 'የተሰጡ የምስክር ወረቀቶች ታሪክ' : 'Issued Certificate History'}</span>
            </h3>
            <span className="text-xs text-slate font-bold">{certificates.length} {lang === 'am' ? 'ሰርተፊኬቶች' : 'certificates'}</span>
          </div>

          {certificates.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate">
              {lang === 'am' ? 'ምንም የተሰጠ ሰርተፊኬት የለም' : 'No certificates issued yet'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr className="bg-mist/40">
                    <th>{lang === 'am' ? 'ቁጥር' : 'Cert No'}</th>
                    <th>{lang === 'am' ? 'የተማሪው ስም' : 'Student Name'}</th>
                    <th>{lang === 'am' ? 'ክፍል' : 'Class'}</th>
                    <th className="text-center">{lang === 'am' ? 'ትምህርቶች' : 'Courses'}</th>
                    <th className="text-center">{lang === 'am' ? 'ድምር' : 'Total'}</th>
                    <th className="text-center">{lang === 'am' ? 'አማካይ' : 'Average'}</th>
                    <th className="text-center">{lang === 'am' ? 'ደረጃ' : 'Rank'}</th>
                    <th>{lang === 'am' ? 'የተሰጠበት ቀን' : 'Issue Date'}</th>
                    <th className="text-center">{lang === 'am' ? 'እርምጃ' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {certificates.map((c) => (
                    <tr key={c.id} className="hover:bg-amber-50/20">
                      <td className="font-mono text-xs font-bold text-gold">{c.certificateNumber}</td>
                      <td>
                        <p className="font-semibold text-xs text-ink">{c.recipientNameAmharic || c.recipientNameEnglish}</p>
                        <p className="text-[10px] text-slate">{c.student?.studentCode} • {c.recipientNameEnglish}</p>
                      </td>
                      <td className="text-xs text-slate">{c.courseOrClass}</td>
                      <td className="text-center text-xs font-bold text-ink">
                        {c.numberOfCourses || '—'}
                      </td>
                      <td className="text-center text-xs font-bold text-ink">
                        {c.totalScore !== undefined && c.totalScore !== null ? Number(c.totalScore) : '—'}
                      </td>
                      <td className="text-center text-xs font-extrabold text-gold">
                        {c.averageScore !== undefined && c.averageScore !== null ? `${c.averageScore}%` : c.overallGrade || '—'}
                      </td>
                      <td className="text-center">
                        <span className="font-bold text-xs bg-gold/15 text-gold border border-gold/30 px-2 py-0.5 rounded-full">
                          {c.rankText || (c.rankInClass ? `${c.rankInClass}ኛ` : '—')}
                        </span>
                      </td>
                      <td className="text-xs text-slate">{c.issueDateEthiopian}</td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openPreviewCertificate(c)}
                            className="btn-outline px-2.5 py-1 text-xs flex items-center gap-1"
                            title="Preview & Print"
                          >
                            <Eye size={13} />
                            {lang === 'am' ? 'እይና አትም' : 'Preview'}
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteCertificate(c.id)}
                              className="p-1 text-slate hover:text-red-600"
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal for Previewing and Printing an Individual Certificate from History */}
      <Modal
        open={previewModalOpen}
        title={
          previewCert
            ? `${previewCert.recipientNameAmharic} (${previewCert.student?.studentCode || '—'}) — ${previewCert.certificateNumber}`
            : 'Certificate'
        }
        onClose={() => setPreviewModalOpen(false)}
      >
        {previewCert && (
          <div className="space-y-4">
            {/* Top Modal Controls */}
            <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                {previewCert.rankInClass && previewCert.rankInClass <= 3 ? (
                  <div className="flex items-center gap-1.5 p-1 bg-amber-50 rounded-xl border border-amber-200">
                    <button
                      type="button"
                      onClick={() => setModalCertTab('two_page')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        modalCertTab === 'two_page'
                          ? 'bg-gold text-ink shadow-sm'
                          : 'text-slate hover:text-ink'
                      }`}
                    >
                      <span>📄 የሁለት ገጽ ምስክር ወረቀት</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalCertTab('top3_honor')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                        modalCertTab === 'top3_honor'
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'text-amber-800 hover:text-amber-950'
                      }`}
                    >
                      <Trophy size={13} />
                      <span>🏆 የደረጃ {previewCert.rankInClass} የክብር ሰርተፊኬት</span>
                    </button>
                  </div>
                ) : (
                  <span className="text-xs font-bold text-ink flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-lg">
                    <span>📄 የሁለት ገጽ ምስክር ወረቀትና የውጤት መግለጫ (Front & Back)</span>
                  </span>
                )}
              </div>

              {/* View options and Print button */}
              <div className="flex items-center gap-2">
                {modalCertTab === 'two_page' && (
                  <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg text-xs">
                    <button
                      type="button"
                      onClick={() => setTwoPageView('both')}
                      className={`px-2 py-1 rounded font-bold ${
                        twoPageView === 'both' ? 'bg-white text-ink shadow-xs' : 'text-slate'
                      }`}
                    >
                      ሁለቱም
                    </button>
                    <button
                      type="button"
                      onClick={() => setTwoPageView('front')}
                      className={`px-2 py-1 rounded font-bold ${
                        twoPageView === 'front' ? 'bg-white text-ink shadow-xs' : 'text-slate'
                      }`}
                    >
                      የፊት ገጽ
                    </button>
                    <button
                      type="button"
                      onClick={() => setTwoPageView('back')}
                      className={`px-2 py-1 rounded font-bold ${
                        twoPageView === 'back' ? 'bg-white text-ink shadow-xs' : 'text-slate'
                      }`}
                    >
                      የጀርባ ገጽ
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn-gold flex items-center gap-1.5 text-xs py-1.5 px-3.5 font-bold shadow-sm"
                >
                  <Printer size={14} />
                  <span>
                    {modalCertTab === 'top3_honor'
                      ? 'የክብር ሰርተፊኬት አትም'
                      : 'የሁለት ገጽ ሰርተፊኬት አትም (Duplex Print)'}
                  </span>
                </button>
              </div>
            </div>

            {/* Print Container */}
            <div className="print-printable-area w-full">
              {modalCertTab === 'two_page' ? (
                <TwoPageCertificate
                  cert={previewCert}
                  systemSettings={systemSettings}
                  viewMode={twoPageView}
                />
              ) : (
                /* Top 3 Single-Page Honor Certificate */
                <div
                  className="print-certificate-target w-full bg-[#FCFBF7] text-[#111111] rounded-2xl shadow-xl overflow-hidden border border-gray-200 relative select-none p-6 sm:p-8 text-center"
                  style={{
                    aspectRatio: '1.414 / 1',
                    minHeight: '520px',
                  }}
                >
                  {/* Ornate Border */}
                  <div
                    className="absolute inset-3 border-4 rounded-xl pointer-events-none"
                    style={{ borderColor: previewCert.themeColor || '#D4AF37' }}
                  >
                    <div
                      className="absolute inset-1.5 border border-dashed rounded-lg"
                      style={{ borderColor: previewCert.themeColor || '#D4AF37' }}
                    />
                    <div className="absolute -top-3.5 -left-3.5 w-7 h-7 bg-[#FCFBF7] flex items-center justify-center font-bold text-base" style={{ color: previewCert.themeColor || '#D4AF37' }}>
                      ☩
                    </div>
                    <div className="absolute -top-3.5 -right-3.5 w-7 h-7 bg-[#FCFBF7] flex items-center justify-center font-bold text-base" style={{ color: previewCert.themeColor || '#D4AF37' }}>
                      ☩
                    </div>
                    <div className="absolute -bottom-3.5 -left-3.5 w-7 h-7 bg-[#FCFBF7] flex items-center justify-center font-bold text-base" style={{ color: previewCert.themeColor || '#D4AF37' }}>
                      ☩
                    </div>
                    <div className="absolute -bottom-3.5 -right-3.5 w-7 h-7 bg-[#FCFBF7] flex items-center justify-center font-bold text-base" style={{ color: previewCert.themeColor || '#D4AF37' }}>
                      ☩
                    </div>
                  </div>

                  <div className="relative h-full flex flex-col justify-between p-4 text-center">
                    <div>
                      <span className="text-[11px] font-bold tracking-widest text-[#555] uppercase block font-serif">
                        በስመ አብ ወወልድ ወመንፈስ ቅዱስ አሐዱ አምላክ አሜን
                      </span>
                      <div className="flex items-center justify-center gap-3 mt-1">
                        <div className="w-12 h-12 rounded-full overflow-hidden border border-amber-300 bg-white/50 shrink-0">
                          <Image src={systemSettings?.logoUrl || '/logo.jpg'} alt="Logo" width={48} height={48} className="object-cover w-full h-full" />
                        </div>
                        <div>
                          <h2 className="text-xs sm:text-sm font-bold tracking-wide text-ink">
                            {systemSettings?.churchNameAmharic || 'በኢትዮጵያ ኦርቶዶክስ ተዋሕዶ ቤተ ክርስቲያን'}
                          </h2>
                          <h1 className="text-sm sm:text-base font-extrabold tracking-wider" style={{ color: previewCert.themeColor || '#D4AF37' }}>
                            {systemSettings?.systemNameAmharic || 'ደብረ አሚን መርሃ ህይወት ሰንበት ትምህርት ቤት'}
                          </h1>
                          <p className="text-[9px] text-slate font-medium">
                            {systemSettings?.systemNameEnglish || 'Merha Hiwot Sunday School'}
                          </p>
                        </div>
                      </div>

                      {/* Title Badge */}
                      <div className="mt-2 inline-block">
                        <div
                          className="px-5 py-1 rounded-full border-2 inline-flex flex-col items-center shadow-2xs"
                          style={{
                            borderColor: previewCert.themeColor || '#D4AF37',
                            backgroundColor: `${previewCert.themeColor || '#D4AF37'}15`,
                          }}
                        >
                          <span className="text-xs sm:text-sm font-black tracking-wide flex items-center gap-1.5" style={{ color: previewCert.themeColor || '#D4AF37' }}>
                            <Trophy size={14} />
                            <span>{previewCert.titleAmharic || 'የክብርና የላቀ ውጤት ምስክር ወረቀት'}</span>
                          </span>
                          <span className="text-[8.5px] font-semibold text-slate uppercase tracking-wider">
                            {previewCert.titleEnglish || 'Certificate of Academic Excellence'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Recipient */}
                    <div className="my-auto py-2 space-y-1">
                      <p className="text-[10px] text-slate">ይህ የምስክር ወረቀት በመንፈሳዊ ትምህርቱ ላሳየው ከፍተኛ ትጋትና የላቀ ውጤት ለተማሪ</p>
                      <h3 className="text-xl font-black text-ink tracking-wide font-serif">
                        {previewCert.recipientNameAmharic}
                      </h3>
                      <p className="text-[11px] font-bold text-slate">{previewCert.courseOrClass}</p>

                      {/* 4 Metric Badges */}
                      <div className="max-w-md mx-auto grid grid-cols-4 gap-2 pt-1">
                        <div className="p-1.5 bg-white border border-gray-200 rounded text-center">
                          <span className="text-[9px] text-slate block">የትምህርት ብዛት</span>
                          <strong className="text-xs font-bold text-ink">{previewCert.numberOfCourses || '—'}</strong>
                        </div>
                        <div className="p-1.5 bg-white border border-gray-200 rounded text-center">
                          <span className="text-[9px] text-slate block">ድምር ነጥብ</span>
                          <strong className="text-xs font-bold text-ink">{previewCert.totalScore ? Number(previewCert.totalScore) : '—'}</strong>
                        </div>
                        <div className="p-1.5 bg-white border border-gray-200 rounded text-center">
                          <span className="text-[9px] text-slate block">አማካይ ውጤት</span>
                          <strong className="text-xs font-bold text-gold">{previewCert.averageScore ? `${previewCert.averageScore}%` : '—'}</strong>
                        </div>
                        <div className="p-1.5 bg-white border border-gray-200 rounded text-center">
                          <span className="text-[9px] text-slate block">ከክፍሉ ደረጃ</span>
                          <strong className="text-xs font-bold text-ink flex items-center justify-center gap-0.5">
                            <Trophy size={11} className="text-gold" />
                            <span>{previewCert.rankText?.split('(')[0] || '1ኛ ደረጃ'}</span>
                          </strong>
                        </div>
                      </div>

                      {previewCert.customMessageAmharic && (
                        <p className="max-w-lg mx-auto text-[10.5px] text-ink/80 leading-relaxed px-4 pt-1">
                          {previewCert.customMessageAmharic}
                        </p>
                      )}
                    </div>

                    {/* 3 Signatures & Seal */}
                    <div className="pt-2">
                      <div className="grid grid-cols-4 items-end text-center gap-2">
                        <div className="flex flex-col items-center">
                          <div className="h-8 flex items-center justify-center">
                            {previewCert.signatory1Signature ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={previewCert.signatory1Signature} alt="Sig" className="max-h-7 max-w-[90px] object-contain" />
                            ) : null}
                          </div>
                          <div className="w-24 border-b border-dashed border-gray-400 mb-0.5" />
                          <p className="text-[9px] font-bold text-ink">{previewCert.signatory1Name}</p>
                          <p className="text-[8px] text-slate">{previewCert.signatory1Title}</p>
                        </div>

                        <div className="flex flex-col items-center justify-center">
                          <div
                            className="w-11 h-11 rounded-full border-2 border-double flex flex-col items-center justify-center text-center shadow-xs"
                            style={{
                              borderColor: previewCert.themeColor || '#D4AF37',
                              color: previewCert.themeColor || '#D4AF37',
                              backgroundColor: `${previewCert.themeColor || '#D4AF37'}15`,
                            }}
                          >
                            <span className="text-[9px] font-bold">☩</span>
                            <span className="text-[5.5px] font-bold tracking-tighter uppercase leading-tight">
                              መርሃ ህይወት<br />ማኅተም
                            </span>
                          </div>
                          <span className="text-[7px] font-mono text-slate mt-0.5">{previewCert.issueDateEthiopian}</span>
                        </div>

                        <div className="flex flex-col items-center">
                          <div className="h-8 flex items-center justify-center">
                            {previewCert.signatory2Signature ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={previewCert.signatory2Signature} alt="Sig" className="max-h-7 max-w-[90px] object-contain" />
                            ) : null}
                          </div>
                          <div className="w-24 border-b border-dashed border-gray-400 mb-0.5" />
                          <p className="text-[9px] font-bold text-ink">{previewCert.signatory2Name}</p>
                          <p className="text-[8px] text-slate">{previewCert.signatory2Title}</p>
                        </div>

                        <div className="flex flex-col items-center">
                          <div className="h-8 flex items-center justify-center">
                            {previewCert.signatory3Signature ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={previewCert.signatory3Signature} alt="Sig" className="max-h-7 max-w-[90px] object-contain" />
                            ) : null}
                          </div>
                          <div className="w-24 border-b border-dashed border-gray-400 mb-0.5" />
                          <p className="text-[9px] font-bold text-ink">{previewCert.signatory3Name}</p>
                          <p className="text-[8px] text-slate">{previewCert.signatory3Title}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
