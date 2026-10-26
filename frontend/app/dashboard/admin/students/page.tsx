'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useLang } from '@/lib/i18n';
import { getCurrentUser } from '@/lib/auth';
import { Topbar } from '@/components/layout/Topbar';
import { StatCard } from '@/components/ui/StatCard';
import { Modal } from '@/components/ui/Modal';
import {
  Users,
  GraduationCap,
  UserPlus,
  Search,
  Edit2,
  CheckCircle2,
  XCircle,
  Phone,
  Calendar,
  Award,
  BookOpen,
  Scroll,
  Eye,
  Plus,
  Trash2,
  FileCheck,
  Check,
  AlertTriangle,
  ShieldAlert,
  HeartHandshake,
  FileText,
  Clock,
  Upload,
  Download,
  FileSpreadsheet,
} from 'lucide-react';

interface ClassGroup {
  id: string;
  level: string;
  name: string;
}

interface StudentGradeSummary {
  id: string;
  totalScore: number;
  letterGrade: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED';
  course: { nameAmharic: string; code: string };
}

interface BehaviorRecord {
  id: string;
  type: 'COMMENDATION' | 'WARNING' | 'INFRACTION' | 'SUSPENSION' | 'GENERAL_NOTE';
  title: string;
  description: string;
  actionTaken?: string | null;
  incidentDate: string;
  ethiopianYear: number;
  reportedBy?: { id: string; fullName: string; role?: string };
}

interface Student {
  id: string;
  studentCode: string;
  fullName: string;
  fullNameAmharic: string | null;
  gender: 'MALE' | 'FEMALE';
  dateOfBirth: string;
  age: number;
  avgScore?: number | null;
  studentPhone: string | null;
  parentName: string;
  parentPhone: string;
  registrationDate: string;
  classId: string;
  class: ClassGroup;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  behaviorStatus?: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'SUSPENDED';
  isSuspended?: boolean;
  suspensionReason?: string | null;
  suspensionDate?: string | null;
  suspensionEndDate?: string | null;
  photoUrl: string | null;
  isWorkingMember: boolean;
  monthlySalary?: number | null;
  grades?: StudentGradeSummary[];
  behaviorRecords?: BehaviorRecord[];
  _count?: { grades: number; certificates: number; behaviorRecords?: number };
}

interface DetailedStudentGrade {
  id: string;
  ethiopianYear: number;
  semester: string;
  assessmentScore: number;
  midExamScore: number;
  finalExamScore: number;
  conductScore: number;
  totalScore: number;
  letterGrade: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED';
  remarks: string | null;
  course: {
    id: string;
    code: string;
    name: string;
    nameAmharic: string;
    targetGrade: string | null;
    scheduleTime: string | null;
  };
  submittedBy?: { id: string; fullName: string };
  approvedBy?: { id: string; fullName: string };
}

interface DetailedStudentCertificate {
  id: string;
  certificateNumber: string;
  titleAmharic: string;
  issueDateEthiopian: string;
  overallGrade: string | null;
  rankText: string | null;
}

interface DetailedStudent extends Student {
  grades: DetailedStudentGrade[];
  certificates: DetailedStudentCertificate[];
}

interface CourseOption {
  id: string;
  code: string;
  name: string;
  nameAmharic: string;
  targetGrade?: string | null;
}

export default function AdminStudentsPage() {
  const { lang, t } = useLang();
  const currentUser = getCurrentUser();

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Register / Edit Modal State
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [fullName, setFullName] = useState('');
  const [fullNameAmharic, setFullNameAmharic] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [classId, setClassId] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [isWorkingMember, setIsWorkingMember] = useState(false);
  const [monthlySalary, setMonthlySalary] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Profile Detail & Grades Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [activeStudentDetail, setActiveStudentDetail] = useState<DetailedStudent | null>(null);
  const [detailTab, setDetailTab] = useState<'grades' | 'info' | 'certificates' | 'behavior'>('grades');
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Suspension Modal State
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [suspending, setSuspending] = useState(false);

  // Behavior Record Modal State
  const [behaviorModalOpen, setBehaviorModalOpen] = useState(false);
  const [behaviorType, setBehaviorType] = useState<BehaviorRecord['type']>('COMMENDATION');
  const [behaviorTitle, setBehaviorTitle] = useState('');
  const [behaviorDescription, setBehaviorDescription] = useState('');
  const [behaviorActionTaken, setBehaviorActionTaken] = useState('');
  const [savingBehavior, setSavingBehavior] = useState(false);

  // Behavior filter
  const [behaviorFilter, setBehaviorFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED' | 'WARNING'>('ALL');

  // Add Grade inside Student Modal State
  const [gradeModalOpen, setGradeModalOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [gradeSemester, setGradeSemester] = useState('SEMESTER_1');
  const [ethYear, setEthYear] = useState(2018);
  const [assessmentScore, setAssessmentScore] = useState(18);
  const [midExamScore, setMidExamScore] = useState(27);
  const [finalExamScore, setFinalExamScore] = useState(45);
  const [conductScore, setConductScore] = useState(5);
  const [gradeRemarks, setGradeRemarks] = useState('');
  const [savingGrade, setSavingGrade] = useState(false);

  // Bulk Registration State
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkTargetClassId, setBulkTargetClassId] = useState('');
  const [bulkMode, setBulkMode] = useState<'table' | 'csv'>('table');
  const [bulkRows, setBulkRows] = useState<Array<{
    fullNameAmharic: string;
    fullName: string;
    gender: 'MALE' | 'FEMALE';
    dateOfBirth: string;
    parentName: string;
    parentPhone: string;
  }>>([
    { fullNameAmharic: '', fullName: '', gender: 'MALE', dateOfBirth: '2016-01-01', parentName: '', parentPhone: '09' },
    { fullNameAmharic: '', fullName: '', gender: 'FEMALE', dateOfBirth: '2016-01-01', parentName: '', parentPhone: '09' },
    { fullNameAmharic: '', fullName: '', gender: 'MALE', dateOfBirth: '2016-01-01', parentName: '', parentPhone: '09' },
  ]);
  const [submittingBulk, setSubmittingBulk] = useState(false);
  const [bulkError, setBulkError] = useState('');

  // Calculated Age for DOB input preview
  const calculatedAgePreview = useMemo(() => {
    if (!dateOfBirth) return null;
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
    return age >= 0 ? age : null;
  }, [dateOfBirth]);

  async function loadData() {
    setLoading(true);
    try {
      const [studentsRes, classesRes, coursesRes] = await Promise.all([
        api.get<any>('/students?pageSize=500'),
        api.get<ClassGroup[]>('/students/classes'),
        api.get<CourseOption[]>('/education/courses'),
      ]);
      const list = Array.isArray(studentsRes) ? studentsRes : studentsRes?.data || [];
      setStudents(list);
      setClasses(classesRes || []);
      setCourses(coursesRes || []);
      if (classesRes && classesRes.length > 0 && !classId) {
        setClassId(classesRes[0].id);
      }
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleOpenCreate() {
    setEditingStudent(null);
    setFullName('');
    setFullNameAmharic('');
    setGender('MALE');
    setDateOfBirth('2011-01-01');
    setClassId(classes[0]?.id || '');
    setParentName('');
    setParentPhone('09');
    setStudentPhone('');
    setIsWorkingMember(false);
    setMonthlySalary('');
    setPhotoUrl('');
    setErrorMessage('');
    setFormModalOpen(true);
  }

  function handleOpenEdit(s: Student) {
    setEditingStudent(s);
    setFullName(s.fullName);
    setFullNameAmharic(s.fullNameAmharic || '');
    setGender(s.gender);
    setDateOfBirth(s.dateOfBirth.slice(0, 10));
    setClassId(s.classId);
    setParentName(s.parentName);
    setParentPhone(s.parentPhone);
    setStudentPhone(s.studentPhone || '');
    setIsWorkingMember(s.isWorkingMember);
    setMonthlySalary(s.monthlySalary ? String(s.monthlySalary) : '');
    setPhotoUrl(s.photoUrl || '');
    setErrorMessage('');
    setFormModalOpen(true);
  }

  async function handleSaveStudent(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage('');
    setSubmitting(true);
    try {
      const payload: any = {
        fullName: fullName.trim(),
        fullNameAmharic: fullNameAmharic.trim() || undefined,
        gender,
        dateOfBirth: new Date(dateOfBirth).toISOString(),
        classId,
        parentName: parentName.trim(),
        parentPhone: parentPhone.trim(),
        studentPhone: studentPhone.trim() || undefined,
        isWorkingMember,
        monthlySalary: isWorkingMember && monthlySalary ? Number(monthlySalary) : undefined,
        photoUrl: photoUrl.trim() || undefined,
      };

      if (editingStudent) {
        await api.patch(`/students/${editingStudent.id}`, payload);
      } else {
        await api.post('/students', payload);
      }
      setFormModalOpen(false);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err?.message || (lang === 'am' ? 'ተማሪውን መመዝገብ አልተቻለም' : 'Failed to save student'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(s: Student) {
    try {
      const nextStatus = s.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await api.patch(`/students/${s.id}/status`, { status: nextStatus });
      await loadData();
    } catch (err) {
      console.error('Failed to change student status:', err);
    }
  }

  async function handleOpenDetail(studentId: string) {
    setDetailModalOpen(true);
    setLoadingDetail(true);
    setDetailTab('grades');
    try {
      const detail = await api.get<DetailedStudent>(`/students/${studentId}`);
      setActiveStudentDetail(detail);
    } catch (err) {
      console.error('Failed to load student detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  }

  function handleOpenAddGrade() {
    if (!activeStudentDetail) return;
    setSelectedCourseId(courses[0]?.id || '');
    setGradeSemester('SEMESTER_1');
    setEthYear(2018);
    setAssessmentScore(18);
    setMidExamScore(27);
    setFinalExamScore(45);
    setConductScore(5);
    setGradeRemarks('');
    setGradeModalOpen(true);
  }

  async function handleSaveGrade(e: React.FormEvent) {
    e.preventDefault();
    if (!activeStudentDetail || !selectedCourseId) return;
    setSavingGrade(true);
    try {
      await api.post('/education/grades/submit', {
        studentId: activeStudentDetail.id,
        courseId: selectedCourseId,
        ethiopianYear: ethYear,
        semester: gradeSemester,
        assessmentScore: Number(assessmentScore),
        midExamScore: Number(midExamScore),
        finalExamScore: Number(finalExamScore),
        conductScore: Number(conductScore),
        remarks: gradeRemarks.trim() || undefined,
      });

      // Refresh student details
      const refreshed = await api.get<DetailedStudent>(`/students/${activeStudentDetail.id}`);
      setActiveStudentDetail(refreshed);
      setGradeModalOpen(false);
      await loadData();
    } catch (err) {
      console.error('Failed to submit grade:', err);
      alert(lang === 'am' ? 'ውጤት መመዝገብ አልተቻለም' : 'Failed to record grade');
    } finally {
      setSavingGrade(false);
    }
  }

  async function handleLiftSuspension(studentId: string) {
    if (!confirm(lang === 'am' ? 'የተማሪውን እገዳ ማንሳት ይፈልጋሉ?' : 'Are you sure you want to lift this suspension?')) return;
    setSuspending(true);
    try {
      await api.post(`/students/${studentId}/suspension`, { isSuspended: false });
      const refreshed = await api.get<DetailedStudent>(`/students/${studentId}`);
      setActiveStudentDetail(refreshed);
      await loadData();
    } catch (err) {
      console.error('Failed to lift suspension:', err);
    } finally {
      setSuspending(false);
    }
  }

  async function handleConfirmSuspension(e: React.FormEvent) {
    e.preventDefault();
    if (!activeStudentDetail || !suspensionReason.trim()) return;
    setSuspending(true);
    try {
      await api.post(`/students/${activeStudentDetail.id}/suspension`, {
        isSuspended: true,
        suspensionReason: suspensionReason.trim(),
      });
      const refreshed = await api.get<DetailedStudent>(`/students/${activeStudentDetail.id}`);
      setActiveStudentDetail(refreshed);
      setSuspendModalOpen(false);
      setSuspensionReason('');
      await loadData();
    } catch (err) {
      console.error('Failed to suspend student:', err);
      alert(lang === 'am' ? 'ተማሪውን ማገድ አልተቻለም' : 'Failed to suspend student');
    } finally {
      setSuspending(false);
    }
  }

  async function handleSaveBehaviorRecord(e: React.FormEvent) {
    e.preventDefault();
    if (!activeStudentDetail || !behaviorTitle.trim() || !behaviorDescription.trim()) return;
    setSavingBehavior(true);
    try {
      await api.post(`/students/${activeStudentDetail.id}/behavior`, {
        type: behaviorType,
        title: behaviorTitle.trim(),
        description: behaviorDescription.trim(),
        actionTaken: behaviorActionTaken.trim() || undefined,
      });
      const refreshed = await api.get<DetailedStudent>(`/students/${activeStudentDetail.id}`);
      setActiveStudentDetail(refreshed);
      setBehaviorModalOpen(false);
      setBehaviorTitle('');
      setBehaviorDescription('');
      setBehaviorActionTaken('');
      await loadData();
    } catch (err) {
      console.error('Failed to record behavior:', err);
      alert(lang === 'am' ? 'የስነ-ምግባር መዝገብ ማስቀመጥ አልተቻለም' : 'Failed to save behavior record');
    } finally {
      setSavingBehavior(false);
    }
  }

  async function handleUpdateBehaviorStatus(newStatus: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'SUSPENDED') {
    if (!activeStudentDetail) return;
    try {
      await api.patch(`/students/${activeStudentDetail.id}/behavior-status`, { behaviorStatus: newStatus });
      const refreshed = await api.get<DetailedStudent>(`/students/${activeStudentDetail.id}`);
      setActiveStudentDetail(refreshed);
      await loadData();
    } catch (err) {
      console.error('Failed to update behavior status:', err);
    }
  }

  function handleAddBulkRow() {
    setBulkRows([
      ...bulkRows,
      { fullNameAmharic: '', fullName: '', gender: 'MALE', dateOfBirth: '2016-01-01', parentName: '', parentPhone: '09' },
    ]);
  }

  function handleRemoveBulkRow(idx: number) {
    if (bulkRows.length <= 1) return;
    setBulkRows(bulkRows.filter((_, i) => i !== idx));
  }

  function handleUpdateBulkRow(idx: number, field: string, value: string) {
    const updated = [...bulkRows];
    updated[idx] = { ...updated[idx], [field]: value };
    setBulkRows(updated);
  }

  function handleDownloadSampleCsv() {
    const sample = `Amharic Name,English Name,Gender,Birth Date,Parent Name,Parent Phone\n"ዮሐንስ ተስፋዬ","Yohannes Tesfaye",MALE,2015-05-12,"ተስፋዬ ገብሬ","0911223344"\n"ሳራ በቀለ","Sara Bekele",FEMALE,2016-08-20,"በቀለ ደሳለኝ","0922334455"`;
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'MH_Students_Sample_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleCsvFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      parseAndSetCsv(text);
    };
    reader.readAsText(file);
  }

  function parseAndSetCsv(text: string) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return;
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length >= 6) {
        rows.push({
          fullNameAmharic: parts[0] || '',
          fullName: parts[1] || parts[0] || '',
          gender: (parts[2].toUpperCase() === 'FEMALE' || parts[2] === 'ሴት' ? 'FEMALE' : 'MALE') as 'MALE' | 'FEMALE',
          dateOfBirth: parts[3] || '2016-01-01',
          parentName: parts[4] || '',
          parentPhone: parts[5] || '09',
        });
      }
    }
    if (rows.length > 0) {
      setBulkRows(rows);
      setBulkMode('table');
    }
  }

  async function handleSaveBulk(e: React.FormEvent) {
    e.preventDefault();
    const classIdToUse = bulkTargetClassId || classes[0]?.id;
    if (!classIdToUse) {
      setBulkError(lang === 'am' ? 'እባክዎ መጀመሪያ ክፍል ይምረጡ' : 'Please select a class');
      return;
    }

    const validRows = bulkRows.filter((r) => (r.fullNameAmharic.trim() || r.fullName.trim()) && r.parentName.trim());
    if (validRows.length === 0) {
      setBulkError(lang === 'am' ? 'እባክዎ ቢያንስ የአንድ ተማሪ ሙሉ መረጃ ያስገቡ' : 'Please provide at least one valid student record');
      return;
    }

    setSubmittingBulk(true);
    setBulkError('');
    try {
      const studentsPayload = validRows.map((r) => ({
        fullName: (r.fullName.trim() || r.fullNameAmharic.trim()),
        fullNameAmharic: r.fullNameAmharic.trim() || undefined,
        gender: r.gender,
        dateOfBirth: new Date(r.dateOfBirth).toISOString(),
        classId: classIdToUse,
        parentName: r.parentName.trim(),
        parentPhone: r.parentPhone.trim(),
        isWorkingMember: false,
      }));

      await api.post('/students/bulk', { students: studentsPayload });
      setBulkModalOpen(false);
      await loadData();
    } catch (err: any) {
      console.error('Failed to bulk register students:', err);
      setBulkError(err?.message || (lang === 'am' ? 'ተማሪዎችን በቡድን መመዝገብ አልተቻለም' : 'Failed to bulk register students'));
    } finally {
      setSubmittingBulk(false);
    }
  }

  const filteredStudents = students.filter((s) => {
    if (selectedClassId !== 'ALL' && s.classId !== selectedClassId) return false;
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
    if (behaviorFilter === 'SUSPENDED' && !s.isSuspended && s.status !== 'SUSPENDED' && s.behaviorStatus !== 'SUSPENDED') return false;
    if (behaviorFilter === 'WARNING' && s.behaviorStatus !== 'WARNING') return false;
    if (behaviorFilter === 'ACTIVE' && (s.isSuspended || s.status === 'INACTIVE' || s.status === 'SUSPENDED')) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        s.studentCode.toLowerCase().includes(q) ||
        s.fullName.toLowerCase().includes(q) ||
        (s.fullNameAmharic && s.fullNameAmharic.toLowerCase().includes(q)) ||
        s.parentName.toLowerCase().includes(q) ||
        s.parentPhone.includes(q) ||
        (s.studentPhone && s.studentPhone.includes(q))
      );
    }
    return true;
  });

  // Calculate Aggregates
  const totalStudents = students.length;
  const activeStudents = students.filter((s) => s.status === 'ACTIVE').length;
  const avgAge =
    totalStudents > 0
      ? (students.reduce((sum, s) => sum + s.age, 0) / totalStudents).toFixed(1)
      : '0';
  const maleCount = students.filter((s) => s.gender === 'MALE').length;
  const femaleCount = students.filter((s) => s.gender === 'FEMALE').length;

  return (
    <div className="space-y-6">
      <Topbar
        title={lang === 'am' ? 'የተማሪዎች መዝገብና ምዝገባ (Administration)' : 'Student Directory & Records'}
        subtitle={
          lang === 'am'
            ? 'የሰንበት ት/ቤት ተማሪዎች ምዝገባ፣ ዕድሜ፣ የትምህርት ውጤትና የተሟላ መረጃ'
            : 'Register students, track grades, monitor age, and manage student files'
        }
      >
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/education/classes"
            className="btn-outline flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 bg-white"
          >
            <Users size={14} className="text-gold" />
            <span>{lang === 'am' ? 'የክፍል መዝገብ (Roster)' : 'Class Roster'}</span>
          </Link>
          <button
            onClick={() => setBulkModalOpen(true)}
            className="btn-outline flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 bg-white"
          >
            <Upload size={14} className="text-gold" />
            <span>{lang === 'am' ? 'በቡድን መዝግብ (Bulk / CSV)' : 'Bulk Register (CSV)'}</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="btn-gold flex items-center gap-1.5 text-xs font-semibold"
          >
            <UserPlus size={15} />
            {t('registerNewStudent')}
          </button>
        </div>
      </Topbar>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label={lang === 'am' ? 'ጠቅላላ ተማሪዎች' : 'Total Students'}
          value={totalStudents}
          sub={lang === 'am' ? `ንቁ፡ ${activeStudents} ተማሪዎች` : `Active: ${activeStudents}`}
        />
        <StatCard
          label={lang === 'am' ? 'አማካይ ዕድሜ' : 'Average Age'}
          value={`${avgAge} ${lang === 'am' ? 'ዓመት' : 'yrs'}`}
          accent="gold"
          sub={lang === 'am' ? 'የሰንበት ት/ቤት ተማሪዎች ዕድሜ' : 'Across all class levels'}
        />
        <StatCard
          label={lang === 'am' ? 'ወንድ / ሴት ተማሪዎች' : 'Male / Female'}
          value={`${maleCount} / ${femaleCount}`}
          sub={lang === 'am' ? `ወንድ: ${maleCount} · ሴት: ${femaleCount}` : `M: ${maleCount} · F: ${femaleCount}`}
        />
        <StatCard
          label={lang === 'am' ? 'የክፍል ደረጃዎች' : 'Class Divisions'}
          value={classes.length}
          sub={lang === 'am' ? 'ሕፃናት፣ ማዕከላውያን፣ ወጣቶች' : '3 Divisions Active'}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setSelectedClassId('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              selectedClassId === 'ALL' ? 'bg-gold text-ink' : 'bg-mist text-slate hover:bg-mist/70'
            }`}
          >
            {lang === 'am' ? 'ሁሉም ክፍሎች' : 'All Classes'} ({students.length})
          </button>
          {classes.map((c) => {
            const count = students.filter((s) => s.classId === c.id).length;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedClassId(c.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  selectedClassId === c.id ? 'bg-gold text-ink' : 'bg-mist text-slate hover:bg-mist/70'
                }`}
              >
                {c.name} ({count})
              </button>
            );
          })}

          {/* Behavior Filter Chips */}
          <div className="flex items-center gap-1 pl-2 border-l border-gray-200">
            <button
              onClick={() => setBehaviorFilter('ALL')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                behaviorFilter === 'ALL' ? 'bg-ink text-white' : 'bg-mist text-slate hover:bg-mist/70'
              }`}
            >
              {lang === 'am' ? 'ሁሉ' : 'All'}
            </button>
            <button
              onClick={() => setBehaviorFilter('ACTIVE')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                behaviorFilter === 'ACTIVE' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              {lang === 'am' ? 'ንቁ' : 'Active'}
            </button>
            <button
              onClick={() => setBehaviorFilter('SUSPENDED')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                behaviorFilter === 'SUSPENDED' ? 'bg-red-700 text-white' : 'bg-red-50 text-red-800 hover:bg-red-100 border border-red-200'
              }`}
            >
              <span>⚠️</span>
              {lang === 'am' ? 'የታገዱ' : 'Suspended'}
            </button>
            <button
              onClick={() => setBehaviorFilter('WARNING')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                behaviorFilter === 'WARNING' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              {lang === 'am' ? 'ማስጠንቀቂያ' : 'Warnings'}
            </button>
          </div>
        </div>

        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate" />
          <input
            type="text"
            className="input pl-9 text-xs w-full"
            placeholder={lang === 'am' ? 'በስም (አማርኛ/እንግሊዝኛ)፣ መለያ፣ ወላጅ…' : 'Search name, code, parent, phone…'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Students Directory Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate">{t('loading')}</div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate">
            {lang === 'am' ? 'ምንም ተማሪ አልተገኘም።' : 'No students found matching your criteria.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr className="bg-mist/30">
                  <th className="w-20">{lang === 'am' ? 'መለያ' : 'ID'}</th>
                  <th>{lang === 'am' ? 'የተማሪው ስም' : 'Student Name'}</th>
                  <th>{lang === 'am' ? 'ዕድሜና ጾታ' : 'Age & Gender'}</th>
                  <th>{lang === 'am' ? 'ክፍል' : 'Class'}</th>
                  <th>{lang === 'am' ? 'ወላጅና ስልክ' : 'Parent & Contact'}</th>
                  <th className="text-center">{lang === 'am' ? 'የትምህርት ውጤት' : 'Academic Marks'}</th>
                  <th className="text-center">{lang === 'am' ? 'ሁኔታ' : 'Status'}</th>
                  <th className="text-right">{lang === 'am' ? 'ድርጊት' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.map((s) => (
                  <tr key={s.id} className={`hover:bg-amber-50/20 transition-colors ${s.isSuspended || s.status === 'SUSPENDED' ? 'bg-red-50/30' : ''}`}>
                    <td className="font-mono text-xs font-bold text-gold">{s.studentCode}</td>
                    <td>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-semibold text-ink text-sm">
                            {lang === 'am' && s.fullNameAmharic ? s.fullNameAmharic : s.fullName}
                          </p>
                          {(s.isSuspended || s.status === 'SUSPENDED') && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                              ⚠️ {lang === 'am' ? 'የታገደ' : 'Suspended'}
                            </span>
                          )}
                          {s.behaviorStatus && s.behaviorStatus !== 'GOOD' && !s.isSuspended && s.status !== 'SUSPENDED' && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              s.behaviorStatus === 'EXCELLENT' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                              {s.behaviorStatus === 'EXCELLENT' ? (lang === 'am' ? 'የላቀ' : 'Excellent') : (lang === 'am' ? 'ማስጠንቀቂያ' : 'Warning')}
                            </span>
                          )}
                        </div>
                        {s.fullNameAmharic && (
                          <p className="text-[11px] text-slate">{s.fullName}</p>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="text-xs">
                        <span className="font-bold text-ink">
                          {s.age} {lang === 'am' ? 'ዓመት' : 'yrs'}
                        </span>
                        <span className="text-slate text-[11px] ml-1">
                          ({s.gender === 'MALE' ? (lang === 'am' ? 'ወንድ' : 'M') : (lang === 'am' ? 'ሴት' : 'F')})
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="text-xs font-medium text-ink bg-mist/60 px-2 py-0.5 rounded border border-gray-200">
                        {s.class?.name || s.classId}
                      </span>
                    </td>
                    <td>
                      <div className="text-xs space-y-0.5">
                        <p className="font-medium text-ink">{s.parentName}</p>
                        <p className="text-slate text-[11px] flex items-center gap-1 font-mono">
                          <Phone size={11} className="text-gold" /> {s.parentPhone}
                        </p>
                      </div>
                    </td>
                    <td className="text-center">
                      {s.avgScore !== null && s.avgScore !== undefined ? (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gold/15 text-gold font-bold text-xs border border-gold/40">
                          <Award size={12} />
                          <span>{s.avgScore}%</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate italic">
                          {lang === 'am' ? 'ውጤት አልገባም' : 'No grades'}
                        </span>
                      )}
                    </td>
                    <td className="text-center">
                      <button
                        onClick={() => handleToggleStatus(s)}
                        title="Click to toggle status"
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.status === 'ACTIVE'
                            ? 'bg-status-present/15 text-status-present'
                            : 'bg-gray-200 text-slate'
                        }`}
                      >
                        {s.status === 'ACTIVE' ? (
                          <>
                            <CheckCircle2 size={12} /> {t('active')}
                          </>
                        ) : (
                          <>
                            <XCircle size={12} /> {t('inactive')}
                          </>
                        )}
                      </button>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenDetail(s.id)}
                          className="btn-gold text-xs px-2.5 py-1 inline-flex items-center gap-1 font-semibold"
                          title="View Profile, Grades & Certificates"
                        >
                          <Eye size={13} />
                          {lang === 'am' ? 'ውጤትና መገለጫ' : 'Profile & Marks'}
                        </button>
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="btn-outline text-xs p-1 text-slate hover:text-gold"
                          title="Edit Student Info"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Register / Edit Student Modal */}
      <Modal
        open={formModalOpen}
        title={
          editingStudent
            ? `${lang === 'am' ? 'የተማሪ መረጃ አሻሽል' : 'Edit Student'}: ${editingStudent.fullName}`
            : lang === 'am'
            ? 'አዲስ ተማሪ መዝግብ (Student Registration)'
            : 'Register New Student'
        }
        onClose={() => setFormModalOpen(false)}
      >
        <form onSubmit={handleSaveStudent} className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">{lang === 'am' ? 'ሙሉ ስም (በእንግሊዝኛ)' : 'Full Name (English)'} *</label>
              <input
                type="text"
                required
                className="input text-xs w-full"
                placeholder="e.g. Bereket Hailu"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div>
              <label className="label">{lang === 'am' ? 'ሙሉ ስም (በአማርኛ)' : 'Full Name (Amharic)'}</label>
              <input
                type="text"
                className="input text-xs w-full"
                placeholder="ለምሳሌ፡ በረከት ኃይሉ"
                value={fullNameAmharic}
                onChange={(e) => setFullNameAmharic(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label">{lang === 'am' ? 'ጾታ (Gender)' : 'Gender'} *</label>
              <select
                className="select text-xs w-full"
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
              >
                <option value="MALE">{lang === 'am' ? 'ወንድ (Male)' : 'Male'}</option>
                <option value="FEMALE">{lang === 'am' ? 'ሴት (Female)' : 'Female'}</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">{lang === 'am' ? 'የትውልድ ቀን' : 'Date of Birth'} *</label>
                {calculatedAgePreview !== null && (
                  <span className="text-[11px] font-bold text-gold bg-ink px-1.5 rounded">
                    {calculatedAgePreview} {lang === 'am' ? 'ዓመት' : 'yrs'}
                  </span>
                )}
              </div>
              <input
                type="date"
                required
                className="input text-xs w-full"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </div>

            <div>
              <label className="label">{lang === 'am' ? 'ክፍል (Class Group)' : 'Class Group'} *</label>
              <select
                className="select text-xs w-full"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                required
              >
                {classes.length === 0 ? (
                  <option value="" disabled>
                    {lang === 'am' ? 'ምንም ክፍል አልተመዘገበም፤ እባክዎ መጀመሪያ ክፍል ይመዝግቡ' : 'No class found; please create a class first'}
                  </option>
                ) : (
                  classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>
              {classes.length === 0 && (
                <Link
                  href="/dashboard/education/classes"
                  className="text-[11px] text-gold hover:underline mt-1 font-semibold inline-block"
                >
                  + {lang === 'am' ? 'አዲስ ክፍል ለመመዝገብ እዚህ ይጫኑ' : 'Click here to add a class'}
                </Link>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100">
            <div>
              <label className="label">{lang === 'am' ? 'የወላጅ / አሳዳጊ ስም' : 'Parent / Guardian Name'} *</label>
              <input
                type="text"
                required
                className="input text-xs w-full"
                placeholder="ለምሳሌ፡ ኃይሉ ወልደማርያም"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
              />
            </div>
            <div>
              <label className="label">{lang === 'am' ? 'የወላጅ ስልክ ቁጥር' : 'Parent Phone'} *</label>
              <input
                type="tel"
                required
                className="input text-xs w-full font-mono"
                placeholder="0911223344"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">{lang === 'am' ? 'የተማሪው ስልክ (ከተፈለገ)' : 'Student Phone (Optional)'}</label>
              <input
                type="tel"
                className="input text-xs w-full font-mono"
                placeholder="0922334455"
                value={studentPhone}
                onChange={(e) => setStudentPhone(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="workingMemberCheck"
                checked={isWorkingMember}
                onChange={(e) => setIsWorkingMember(e.target.checked)}
                className="rounded text-gold focus:ring-gold"
              />
              <label htmlFor="workingMemberCheck" className="text-xs text-ink font-medium cursor-pointer">
                {lang === 'am' ? 'ሰራተኛ አባል (Working Member)' : 'Is Working Member'}
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setFormModalOpen(false)}
              className="btn-outline text-xs"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting || !fullName.trim() || !parentName.trim() || !parentPhone.trim()}
              className="btn-gold text-xs font-semibold"
            >
              {submitting ? t('saving') : t('save')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Student Profile & Grades Modal */}
      <Modal
        open={detailModalOpen}
        title={
          activeStudentDetail
            ? `${lang === 'am' ? 'የተማሪ መገለጫና ውጤቶች' : 'Student Profile & Academic Marks'}: ${
                lang === 'am' && activeStudentDetail.fullNameAmharic
                  ? activeStudentDetail.fullNameAmharic
                  : activeStudentDetail.fullName
              }`
            : lang === 'am' ? 'የተማሪ መገለጫ' : 'Student Detail'
        }
        onClose={() => setDetailModalOpen(false)}
      >
        {loadingDetail || !activeStudentDetail ? (
          <div className="p-8 text-center text-xs text-slate">{t('loading')}</div>
        ) : (
          <div className="space-y-4">
            {/* Student Header Card */}
            <div className="p-4 rounded-xl bg-ink text-white border border-gold/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gold/20 border border-gold/40 text-gold flex items-center justify-center font-bold text-lg shrink-0">
                  {activeStudentDetail.fullName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-gold font-bold">
                      {activeStudentDetail.studentCode}
                    </span>
                    <span className="text-[11px] bg-white/10 px-2 py-0.5 rounded text-white/80">
                      {activeStudentDetail.class?.name}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    {lang === 'am' && activeStudentDetail.fullNameAmharic
                      ? activeStudentDetail.fullNameAmharic
                      : activeStudentDetail.fullName}
                  </h3>
                  <p className="text-xs text-white/70">{activeStudentDetail.fullName}</p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-[10px] text-white/60">{lang === 'am' ? 'ዕድሜ' : 'Age'}</p>
                <p className="text-xl font-bold text-gold">
                  {activeStudentDetail.age} {lang === 'am' ? 'ዓመት' : 'years'}
                </p>
                <p className="text-[10px] text-white/60 mt-0.5 font-mono">
                  {new Date(activeStudentDetail.dateOfBirth).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Suspension Alert & Status Banner */}
            {activeStudentDetail.isSuspended || activeStudentDetail.status === 'SUSPENDED' ? (
              <div className="p-4 bg-red-50 border-2 border-red-500 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-red-950 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0 font-bold text-xl">
                    ⚠️
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-extrabold text-sm text-red-900">
                        {lang === 'am' ? 'ማስጠንቀቂያ፡ ይህ ተማሪ በአሁኑ ወቅት ከሰንበት ት/ቤት የታገደ ነው!' : 'Warning: This Student is Currently Suspended!'}
                      </p>
                      <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-bold">
                        {lang === 'am' ? 'የታገደ' : 'SUSPENDED'}
                      </span>
                    </div>
                    <p className="text-xs text-red-800 mt-1">
                      <span className="font-bold">{lang === 'am' ? 'የእገዳ ምክንያት፡ ' : 'Reason: '}</span>
                      <span>{activeStudentDetail.suspensionReason || (lang === 'am' ? 'የዲሲፕሊን ጥሰት' : 'Disciplinary violation')}</span>
                    </p>
                    {activeStudentDetail.suspensionDate && (
                      <p className="text-[10px] text-red-700 mt-0.5 font-mono">
                        {lang === 'am' ? 'የታገደበት ቀን፡ ' : 'Suspended Date: '}
                        {new Date(activeStudentDetail.suspensionDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleLiftSuspension(activeStudentDetail.id)}
                  disabled={suspending}
                  className="btn-gold bg-green-700 hover:bg-green-800 text-white font-bold text-xs py-2 px-3.5 shadow-sm whitespace-nowrap self-end sm:self-center"
                >
                  {suspending ? t('saving') : lang === 'am' ? 'እገዳ አንሳ (Lift Suspension)' : 'Lift Suspension'}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 bg-amber-50/50 rounded-lg border border-amber-200/60 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate font-medium">{lang === 'am' ? 'የስነ-ምግባር ደረጃ፡' : 'Conduct Status:'}</span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    activeStudentDetail.behaviorStatus === 'EXCELLENT' ? 'bg-emerald-100 text-emerald-800' :
                    activeStudentDetail.behaviorStatus === 'WARNING' ? 'bg-amber-100 text-amber-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {activeStudentDetail.behaviorStatus === 'EXCELLENT' ? (lang === 'am' ? 'የላቀ (Excellent)' : 'Excellent') :
                     activeStudentDetail.behaviorStatus === 'WARNING' ? (lang === 'am' ? 'ማስጠንቀቂያ (Warning)' : 'Warning') :
                     (lang === 'am' ? 'ጥሩ (Good)' : 'Good')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSuspendModalOpen(true)}
                  className="text-xs text-rose-600 hover:text-rose-800 font-bold hover:underline flex items-center gap-1"
                >
                  <AlertTriangle size={13} />
                  {lang === 'am' ? 'ተማሪ እገድ (Suspend)' : 'Suspend Student'}
                </button>
              </div>
            )}

            {/* Modal Tabs */}
            <div className="flex border-b border-gray-100 gap-4 text-xs font-semibold overflow-x-auto">
              <button
                onClick={() => setDetailTab('grades')}
                className={`pb-2 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  detailTab === 'grades' ? 'border-gold text-gold font-bold' : 'border-transparent text-slate'
                }`}
              >
                <Award size={14} />
                {lang === 'am' ? 'የትምህርት ውጤቶች (Grades)' : 'Academic Grades'} ({activeStudentDetail.grades?.length || 0})
              </button>
              <button
                onClick={() => setDetailTab('info')}
                className={`pb-2 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  detailTab === 'info' ? 'border-gold text-gold font-bold' : 'border-transparent text-slate'
                }`}
              >
                <Calendar size={14} />
                {lang === 'am' ? 'የግልና ወላጅ መረጃ' : 'Personal Info'}
              </button>
              <button
                onClick={() => setDetailTab('certificates')}
                className={`pb-2 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  detailTab === 'certificates' ? 'border-gold text-gold font-bold' : 'border-transparent text-slate'
                }`}
              >
                <Scroll size={14} />
                {lang === 'am' ? 'ምስክር ወረቀቶች' : 'Certificates'} ({activeStudentDetail.certificates?.length || 0})
              </button>
              <button
                onClick={() => setDetailTab('behavior')}
                className={`pb-2 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  detailTab === 'behavior' ? 'border-gold text-gold font-bold' : 'border-transparent text-slate'
                }`}
              >
                <ShieldAlert size={14} className={activeStudentDetail.isSuspended ? 'text-red-600' : 'text-gold'} />
                {lang === 'am' ? 'ሥነ-ምግባርና ዲሲፕሊን' : 'Behavior & Conduct'} ({activeStudentDetail.behaviorRecords?.length || 0})
                {activeStudentDetail.isSuspended && (
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
                )}
              </button>
            </div>

            {/* Tab 1: Grades Worksheet for Student */}
            {detailTab === 'grades' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-ink">
                      {lang === 'am' ? 'የትምህርት ውጤት መዝገብ' : 'Recorded Course Grades'}
                    </h4>
                    <p className="text-[11px] text-slate">
                      {lang === 'am' ? 'የምዘና፣ አጋማሽ፣ ማጠቃለያ እና ሥነ ምግባር ነጥቦች' : 'Breakdown across assessment, exams, and conduct'}
                    </p>
                  </div>
                  <button
                    onClick={handleOpenAddGrade}
                    className="btn-gold flex items-center gap-1 text-xs py-1 px-2.5 font-semibold"
                  >
                    <Plus size={13} />
                    {lang === 'am' ? 'ውጤት መዝግብ' : 'Add Marks'}
                  </button>
                </div>

                {activeStudentDetail.grades && activeStudentDetail.grades.length > 0 ? (
                  <div className="overflow-x-auto border border-gray-100 rounded-lg">
                    <table className="table-base">
                      <thead>
                        <tr className="bg-mist/30 text-[11px]">
                          <th>{lang === 'am' ? 'የትምህርት ዓይነት' : 'Course'}</th>
                          <th className="text-center">{lang === 'am' ? 'ምዘና (20)' : 'Assess'}</th>
                          <th className="text-center">{lang === 'am' ? 'አጋማሽ (30)' : 'Mid'}</th>
                          <th className="text-center">{lang === 'am' ? 'ማጠቃለያ (40)' : 'Final'}</th>
                          <th className="text-center">{lang === 'am' ? 'ሥነ ምግባር (10)' : 'Conduct'}</th>
                          <th className="text-center font-bold text-ink">{lang === 'am' ? 'ድምር' : 'Total'}</th>
                          <th className="text-center">{lang === 'am' ? 'ደረጃ' : 'Grade'}</th>
                          <th className="text-center">{lang === 'am' ? 'ሁኔታ' : 'Status'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-xs">
                        {activeStudentDetail.grades.map((g) => (
                          <tr key={g.id}>
                            <td>
                              <p className="font-semibold text-ink text-xs">
                                {lang === 'am' ? g.course.nameAmharic : g.course.name}
                              </p>
                              <p className="text-[10px] text-slate font-mono">{g.course.code}</p>
                            </td>
                            <td className="text-center text-xs">{g.assessmentScore}</td>
                            <td className="text-center text-xs">{g.midExamScore}</td>
                            <td className="text-center text-xs">{g.finalExamScore}</td>
                            <td className="text-center text-xs">{g.conductScore}</td>
                            <td className="text-center font-bold text-xs text-ink">{g.totalScore}%</td>
                            <td className="text-center font-bold text-gold text-xs">{g.letterGrade}</td>
                            <td className="text-center">
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                  g.status === 'APPROVED'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {g.status === 'APPROVED'
                                  ? lang === 'am' ? 'የፀደቀ' : 'Approved'
                                  : lang === 'am' ? 'የቀረበ' : 'Submitted'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-slate border border-dashed rounded-lg">
                    {lang === 'am' ? 'እስካሁን ምንም የትምህርት ውጤት አልተመዘገበም።' : 'No grades recorded yet.'}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Personal & Contact Info */}
            {detailTab === 'info' && (
              <div className="grid grid-cols-2 gap-4 p-3 bg-mist/20 rounded-xl text-xs">
                <div>
                  <p className="text-slate">{lang === 'am' ? 'የወላጅ / አሳዳጊ ስም' : 'Parent / Guardian'}</p>
                  <p className="font-bold text-ink mt-0.5">{activeStudentDetail.parentName}</p>
                </div>
                <div>
                  <p className="text-slate">{lang === 'am' ? 'የወላጅ ስልክ ቁጥር' : 'Parent Phone'}</p>
                  <p className="font-mono font-bold text-ink mt-0.5">{activeStudentDetail.parentPhone}</p>
                </div>
                <div>
                  <p className="text-slate">{lang === 'am' ? 'የተማሪ ስልክ ቁጥር' : 'Student Phone'}</p>
                  <p className="font-mono text-ink mt-0.5">{activeStudentDetail.studentPhone || '—'}</p>
                </div>
                <div>
                  <p className="text-slate">{lang === 'am' ? 'የምዝገባ ቀን' : 'Registration Date'}</p>
                  <p className="font-mono text-ink mt-0.5">
                    {new Date(activeStudentDetail.registrationDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-slate">{lang === 'am' ? 'ሰራተኛ አባል' : 'Working Member'}</p>
                  <p className="font-semibold text-ink mt-0.5">
                    {activeStudentDetail.isWorkingMember
                      ? `${lang === 'am' ? 'አዎ' : 'Yes'} (ደመወዝ፡ ${activeStudentDetail.monthlySalary ?? 0} ETB)`
                      : lang === 'am' ? 'አይደለም' : 'No'}
                  </p>
                </div>
                <div>
                  <p className="text-slate">{lang === 'am' ? 'የክፍያ ሁኔታ' : 'Fee Status'}</p>
                  <p className="font-semibold text-ink mt-0.5">
                    {(activeStudentDetail as any).feeStatus?.status || 'UNPAID'}
                  </p>
                </div>
              </div>
            )}

            {/* Tab 3: Issued Certificates */}
            {detailTab === 'certificates' && (
              <div className="space-y-3">
                {activeStudentDetail.certificates && activeStudentDetail.certificates.length > 0 ? (
                  <div className="divide-y divide-gray-100 border rounded-lg">
                    {activeStudentDetail.certificates.map((c) => (
                      <div key={c.id} className="p-3 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-ink">{c.titleAmharic}</p>
                          <p className="text-[11px] text-slate font-mono">
                            {c.certificateNumber} · {c.issueDateEthiopian}
                          </p>
                        </div>
                        <Link
                          href="/dashboard/education/certificates"
                          className="btn-outline text-xs px-2.5 py-1"
                        >
                          {lang === 'am' ? 'በእትም ቅርጽ እይ' : 'View Certificate'}
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-slate border border-dashed rounded-lg">
                    {lang === 'am' ? 'የተሰጠ ሰርተፊኬት የለም' : 'No certificates issued yet'}
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: Behavior & Conduct Records */}
            {detailTab === 'behavior' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-mist/30 rounded-lg border border-gray-200">
                  <div>
                    <h4 className="text-xs font-bold text-ink">
                      {lang === 'am' ? 'የተማሪው የሥነ-ምግባር አጠቃላይ ሁኔታ' : 'Student Conduct Status'}
                    </h4>
                    <p className="text-[11px] text-slate mt-0.5">
                      {lang === 'am' ? 'የክርስቲያናዊ ሥነ-ምግባር፣ ክትትልና ዲሲፕሊን ማስተካከያ' : 'Track Christian conduct, commendations, warnings, and suspension'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBehaviorModalOpen(true)}
                      className="btn-gold text-xs py-1 px-3 font-semibold flex items-center gap-1.5"
                    >
                      <Plus size={13} />
                      {lang === 'am' ? 'መዝገብ አስገባ' : 'Log Incident'}
                    </button>
                    {!activeStudentDetail.isSuspended && (
                      <button
                        type="button"
                        onClick={() => setSuspendModalOpen(true)}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-bold transition-all flex items-center gap-1"
                      >
                        <AlertTriangle size={12} />
                        {lang === 'am' ? 'እገድ' : 'Suspend'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Status Switcher */}
                <div className="p-3 bg-white rounded-lg border border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-ink">{lang === 'am' ? 'ደረጃ አሻሽል / ለውጥ፡' : 'Update Status:'}</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { id: 'EXCELLENT', labelAm: 'የላቀ (Excellent)', color: 'border-emerald-500 text-emerald-800 bg-emerald-50' },
                      { id: 'GOOD', labelAm: 'ጥሩ (Good)', color: 'border-blue-500 text-blue-800 bg-blue-50' },
                      { id: 'WARNING', labelAm: 'ማስጠንቀቂያ (Warning)', color: 'border-amber-500 text-amber-800 bg-amber-50' },
                      { id: 'SUSPENDED', labelAm: 'የታገደ (Suspended)', color: 'border-red-500 text-red-800 bg-red-50' },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => handleUpdateBehaviorStatus(st.id as any)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-all ${
                          activeStudentDetail.behaviorStatus === st.id
                            ? `${st.color} ring-2 ring-offset-1 ring-gold`
                            : 'border-gray-200 text-slate hover:bg-gray-50'
                        }`}
                      >
                        {st.labelAm}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Behavior Timeline */}
                <div className="space-y-2">
                  <h5 className="font-bold text-xs text-ink flex items-center gap-1.5">
                    <Clock size={13} className="text-gold" />
                    <span>{lang === 'am' ? 'የሥነ-ምግባር ክትትል ታሪክ' : 'Conduct & Disciplinary History'}</span>
                  </h5>

                  {activeStudentDetail.behaviorRecords && activeStudentDetail.behaviorRecords.length > 0 ? (
                    <div className="space-y-2">
                      {activeStudentDetail.behaviorRecords.map((rec) => (
                        <div
                          key={rec.id}
                          className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                            rec.type === 'SUSPENSION'
                              ? 'bg-red-50/60 border-red-300'
                              : rec.type === 'WARNING'
                              ? 'bg-amber-50/60 border-amber-300'
                              : rec.type === 'COMMENDATION'
                              ? 'bg-emerald-50/60 border-emerald-300'
                              : 'bg-mist/30 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  rec.type === 'SUSPENSION'
                                    ? 'bg-red-600 text-white'
                                    : rec.type === 'WARNING'
                                    ? 'bg-amber-500 text-white'
                                    : rec.type === 'COMMENDATION'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-gray-200 text-slate'
                                }`}
                              >
                                {rec.type === 'SUSPENSION'
                                  ? 'እገዳ'
                                  : rec.type === 'WARNING'
                                  ? 'ማስጠንቀቂያ'
                                  : rec.type === 'COMMENDATION'
                                  ? 'ምስጋና'
                                  : 'ማስታወሻ'}
                              </span>
                              <span className="font-bold text-ink">{rec.title}</span>
                            </div>
                            <span className="text-[10px] text-slate font-mono">
                              {new Date(rec.incidentDate).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-slate text-[11px]">{rec.description}</p>
                          {rec.actionTaken && (
                            <p className="text-[11px] font-medium text-ink">
                              <span className="text-slate font-normal">{lang === 'am' ? 'የተወሰደ እርምጃ፡ ' : 'Action Taken: '}</span>
                              {rec.actionTaken}
                            </p>
                          )}
                          {rec.reportedBy && (
                            <p className="text-[10px] text-slate/70 pt-1 border-t border-gray-100 font-mono">
                              {lang === 'am' ? 'የመዘገበው፡ ' : 'Logged by: '} {rec.reportedBy.fullName}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-slate border border-dashed rounded-lg">
                      {lang === 'am' ? 'የተመዘገበ የዲሲፕሊን ወይም የምስጋና መዝገብ የለም' : 'No behavior or disciplinary records logged yet'}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-gray-100">
              <button onClick={() => setDetailModalOpen(false)} className="btn-primary text-xs">
                {t('close')}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Enter Grade Modal */}
      <Modal
        open={gradeModalOpen}
        title={
          lang === 'am'
            ? `የትምህርት ውጤት መዝግብ: ${activeStudentDetail?.fullNameAmharic || activeStudentDetail?.fullName}`
            : `Record Grade: ${activeStudentDetail?.fullName}`
        }
        onClose={() => setGradeModalOpen(false)}
      >
        <form onSubmit={handleSaveGrade} className="space-y-4">
          <div>
            <label className="label">{lang === 'am' ? 'የትምህርት ዓይነት (Course)' : 'Course / Subject'} *</label>
            <select
              className="select text-xs w-full font-medium"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.targetGrade ? `[${c.targetGrade}] ` : ''}{c.code} - {lang === 'am' ? c.nameAmharic : c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{lang === 'am' ? 'ዓ.ም (Ethiopian Year)' : 'Year'}</label>
              <select
                className="select text-xs w-full"
                value={ethYear}
                onChange={(e) => setEthYear(Number(e.target.value))}
              >
                <option value={2018}>2018 ዓ.ም</option>
                <option value={2017}>2017 ዓ.ም</option>
              </select>
            </div>
            <div>
              <label className="label">{lang === 'am' ? 'መንፈቀ ዓመት (Semester)' : 'Semester'}</label>
              <select
                className="select text-xs w-full"
                value={gradeSemester}
                onChange={(e) => setGradeSemester(e.target.value)}
              >
                <option value="SEMESTER_1">{lang === 'am' ? '1ኛ መንፈቀ ዓመት' : '1st Semester'}</option>
                <option value="SEMESTER_2">{lang === 'am' ? '2ኛ መንፈቀ ዓመት' : '2nd Semester'}</option>
                <option value="YEAR_ROUND">{lang === 'am' ? 'ዓመታዊ' : 'Year Round'}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-gray-100">
            <div>
              <label className="label text-[11px]">{lang === 'am' ? 'ምዘና (20)' : 'Assess (20)'}</label>
              <input
                type="number"
                min={0}
                max={20}
                className="input text-xs text-center font-bold"
                value={assessmentScore}
                onChange={(e) => setAssessmentScore(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label text-[11px]">{lang === 'am' ? 'አጋማሽ (30)' : 'Mid (30)'}</label>
              <input
                type="number"
                min={0}
                max={30}
                className="input text-xs text-center font-bold"
                value={midExamScore}
                onChange={(e) => setMidExamScore(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label text-[11px]">{lang === 'am' ? 'ማጠቃለያ (40)' : 'Final (40)'}</label>
              <input
                type="number"
                min={0}
                max={40}
                className="input text-xs text-center font-bold"
                value={finalExamScore}
                onChange={(e) => setFinalExamScore(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label text-[11px]">{lang === 'am' ? 'ሥነ ምግባር (10)' : 'Conduct (10)'}</label>
              <input
                type="number"
                min={0}
                max={10}
                className="input text-xs text-center font-bold"
                value={conductScore}
                onChange={(e) => setConductScore(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="p-3 bg-amber-50/60 border border-gold/30 rounded-lg flex items-center justify-between text-xs">
            <span className="font-semibold text-ink">{lang === 'am' ? 'ጠቅላላ ድምር' : 'Total Score'}:</span>
            <span className="text-base font-extrabold text-gold">
              {Number(assessmentScore) + Number(midExamScore) + Number(finalExamScore) + Number(conductScore)}%
            </span>
          </div>

          <div>
            <label className="label">{lang === 'am' ? 'አስተያየት (Remark)' : 'Remark'}</label>
            <input
              type="text"
              className="input text-xs w-full"
              placeholder={lang === 'am' ? 'ለምሳሌ፡ የላቀ ተሳትፎ…' : 'e.g. Excellent conduct…'}
              value={gradeRemarks}
              onChange={(e) => setGradeRemarks(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setGradeModalOpen(false)}
              className="btn-outline text-xs"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={savingGrade || !selectedCourseId}
              className="btn-gold text-xs font-semibold"
            >
              {savingGrade ? t('saving') : lang === 'am' ? 'ውጤት መዝግብ' : 'Save Marks'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Suspend Student Modal */}
      <Modal
        open={suspendModalOpen}
        title={
          lang === 'am'
            ? `ተማሪ እገድ: ${activeStudentDetail?.fullNameAmharic || activeStudentDetail?.fullName}`
            : `Suspend Student: ${activeStudentDetail?.fullName}`
        }
        onClose={() => setSuspendModalOpen(false)}
      >
        <form onSubmit={handleConfirmSuspension} className="space-y-4 text-xs">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-900 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-600 shrink-0" />
            <span>
              {lang === 'am'
                ? 'ተማሪውን ማገድ ውጤት እንዳይገባላቸው ወይም ሰርተፊኬት እንዳይዘጋጅላቸው በሲስተሙ ውስጥ ያሳውቃል። እገዳውን በማንኛውም ጊዜ ማንሳት ይችላሉ።'
                : 'Suspending a student flags them across grade entry and certificate issuance. You can lift the suspension at any time.'}
            </span>
          </div>

          <div>
            <label className="label">{lang === 'am' ? 'የእገዳ ምክንያት (Reason for Suspension)' : 'Reason'} *</label>
            <textarea
              required
              rows={3}
              className="input w-full"
              placeholder={lang === 'am' ? 'ለምሳሌ፡ ተደጋጋሚ ያልተፈቀደ መቅረትና የስነ-ምግባር ግድፈት…' : 'Reason for suspension…'}
              value={suspensionReason}
              onChange={(e) => setSuspensionReason(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button type="button" onClick={() => setSuspendModalOpen(false)} className="btn-outline text-xs">
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={suspending || !suspensionReason.trim()}
              className="btn-gold bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
            >
              {suspending ? t('saving') : lang === 'am' ? 'እገዳ ጣል (Confirm Suspension)' : 'Confirm Suspension'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Behavior Record Modal */}
      <Modal
        open={behaviorModalOpen}
        title={
          lang === 'am'
            ? `የስነ-ምግባር መዝገብ አስገባ: ${activeStudentDetail?.fullNameAmharic || activeStudentDetail?.fullName}`
            : `Log Behavior Record: ${activeStudentDetail?.fullName}`
        }
        onClose={() => setBehaviorModalOpen(false)}
      >
        <form onSubmit={handleSaveBehaviorRecord} className="space-y-3.5 text-xs">
          <div>
            <label className="label">{lang === 'am' ? 'የመዝገብ ዓይነት' : 'Record Type'} *</label>
            <select
              className="select w-full"
              value={behaviorType}
              onChange={(e) => setBehaviorType(e.target.value as any)}
            >
              <option value="COMMENDATION">{lang === 'am' ? 'ምስጋና እና ማበረታቻ (Commendation)' : 'Commendation'}</option>
              <option value="WARNING">{lang === 'am' ? 'የጽሁፍ ማስጠንቀቂያ (Warning)' : 'Warning'}</option>
              <option value="INFRACTION">{lang === 'am' ? 'ቀላል ጥፋት (Infraction)' : 'Infraction'}</option>
              <option value="SUSPENSION">{lang === 'am' ? 'እገዳ (Suspension)' : 'Suspension'}</option>
              <option value="GENERAL_NOTE">{lang === 'am' ? 'አጠቃላይ ማስታወሻ (General Note)' : 'General Note'}</option>
            </select>
          </div>

          <div>
            <label className="label">{lang === 'am' ? 'ርዕስ (Title)' : 'Title'} *</label>
            <input
              type="text"
              required
              className="input w-full"
              placeholder={lang === 'am' ? 'ለምሳሌ፡ በመዝሙርና ትምህርት የላቀ ተሳትፎ' : 'e.g. Excellent liturgical participation'}
              value={behaviorTitle}
              onChange={(e) => setBehaviorTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="label">{lang === 'am' ? 'ዝርዝር ማብራሪያ (Description)' : 'Description'} *</label>
            <textarea
              required
              rows={3}
              className="input w-full"
              placeholder={lang === 'am' ? 'የተፈጠረውን ሁኔታ በዝርዝር ይግለጹ…' : 'Details of incident or commendation…'}
              value={behaviorDescription}
              onChange={(e) => setBehaviorDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="label">{lang === 'am' ? 'የተወሰደ እርምጃ (Action Taken - Optional)' : 'Action Taken'}</label>
            <input
              type="text"
              className="input w-full"
              placeholder={lang === 'am' ? 'ለምሳሌ፡ ለወላጆች በስልክ ተነግሯል' : 'e.g. Parents notified by phone'}
              value={behaviorActionTaken}
              onChange={(e) => setBehaviorActionTaken(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button type="button" onClick={() => setBehaviorModalOpen(false)} className="btn-outline text-xs">
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={savingBehavior || !behaviorTitle.trim() || !behaviorDescription.trim()}
              className="btn-gold text-xs font-bold"
            >
              {savingBehavior ? t('saving') : lang === 'am' ? 'መዝገብ አስቀምጥ' : 'Save Record'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Bulk / CSV Registration Modal */}
      <Modal
        open={bulkModalOpen}
        title={lang === 'am' ? 'ተማሪዎችን በቡድን መዝግብ (Bulk / CSV Registration)' : 'Bulk Student Registration'}
        onClose={() => setBulkModalOpen(false)}
      >
        <form onSubmit={handleSaveBulk} className="space-y-4">
          {bulkError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold">
              {bulkError}
            </div>
          )}

          {/* Class target selector */}
          <div className="p-3 bg-mist/30 rounded-xl border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex-1 w-full sm:w-auto">
              <label className="label">{lang === 'am' ? 'ተማሪዎቹ የሚመዘገቡበት ክፍል (Target Class) *' : 'Target Class *'}</label>
              <select
                className="select text-xs w-full font-bold"
                value={bulkTargetClassId || classes[0]?.id || ''}
                onChange={(e) => setBulkTargetClassId(e.target.value)}
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.level})
                  </option>
                ))}
              </select>
            </div>

            {/* Mode switch */}
            <div className="flex items-center gap-1.5 self-end sm:self-center">
              <button
                type="button"
                onClick={() => setBulkMode('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  bulkMode === 'table' ? 'bg-ink text-gold' : 'bg-gray-100 text-slate hover:bg-gray-200'
                }`}
              >
                {lang === 'am' ? 'በሠንጠረዥ (Table Entry)' : 'Table Entry'}
              </button>
              <button
                type="button"
                onClick={() => setBulkMode('csv')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  bulkMode === 'csv' ? 'bg-ink text-gold' : 'bg-gray-100 text-slate hover:bg-gray-200'
                }`}
              >
                <Upload size={12} />
                <span>{lang === 'am' ? 'CSV ፋይል አስገባ' : 'Import CSV'}</span>
              </button>
            </div>
          </div>

          {/* Mode 1: Table multi-row entry */}
          {bulkMode === 'table' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate">
                  {lang === 'am' ? `ጠቅላላ ረድፎች፡ ${bulkRows.length} ተማሪዎች` : `Total Rows: ${bulkRows.length} students`}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadSampleCsv}
                    className="text-xs text-gold hover:underline font-semibold flex items-center gap-1"
                  >
                    <Download size={12} />
                    <span>{lang === 'am' ? 'የናሙና CSV አውርድ' : 'Sample CSV'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddBulkRow}
                    className="btn-gold text-xs py-1 px-2.5 font-semibold flex items-center gap-1"
                  >
                    <Plus size={12} />
                    <span>{lang === 'am' ? 'ረድፍ ጨምር' : 'Add Row'}</span>
                  </button>
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto border border-gray-200 rounded-xl">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100 text-ink sticky top-0">
                    <tr>
                      <th className="py-2 px-2 text-left w-6">#</th>
                      <th className="py-2 px-2 text-left">{lang === 'am' ? 'ሙሉ ስም (አማርኛ)' : 'Amharic Name'} *</th>
                      <th className="py-2 px-2 text-left">{lang === 'am' ? 'እንግሊዝኛ ስም' : 'English Name'}</th>
                      <th className="py-2 px-2 text-center w-20">{lang === 'am' ? 'ጾታ' : 'Gender'}</th>
                      <th className="py-2 px-2 text-left w-28">{lang === 'am' ? 'የልደት ቀን' : 'DOB'}</th>
                      <th className="py-2 px-2 text-left">{lang === 'am' ? 'የወላጅ ስም' : 'Parent'} *</th>
                      <th className="py-2 px-2 text-left w-28">{lang === 'am' ? 'ስልክ' : 'Phone'} *</th>
                      <th className="py-2 px-1 text-center w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {bulkRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gold/5">
                        <td className="py-1 px-2 font-mono text-slate text-center">{idx + 1}</td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            required
                            placeholder="ሙሉ ስም"
                            className="input py-1 px-2 text-xs w-full"
                            value={row.fullNameAmharic}
                            onChange={(e) => handleUpdateBulkRow(idx, 'fullNameAmharic', e.target.value)}
                          />
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="English Name"
                            className="input py-1 px-2 text-xs w-full"
                            value={row.fullName}
                            onChange={(e) => handleUpdateBulkRow(idx, 'fullName', e.target.value)}
                          />
                        </td>
                        <td className="py-1 px-1 text-center">
                          <select
                            className="select py-1 px-1 text-xs w-full"
                            value={row.gender}
                            onChange={(e) => handleUpdateBulkRow(idx, 'gender', e.target.value)}
                          >
                            <option value="MALE">{lang === 'am' ? 'ወንድ' : 'M'}</option>
                            <option value="FEMALE">{lang === 'am' ? 'ሴት' : 'F'}</option>
                          </select>
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="date"
                            className="input py-1 px-1 text-xs w-full font-mono"
                            value={row.dateOfBirth}
                            onChange={(e) => handleUpdateBulkRow(idx, 'dateOfBirth', e.target.value)}
                          />
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            required
                            placeholder="የወላጅ ስም"
                            className="input py-1 px-2 text-xs w-full"
                            value={row.parentName}
                            onChange={(e) => handleUpdateBulkRow(idx, 'parentName', e.target.value)}
                          />
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            required
                            placeholder="09..."
                            className="input py-1 px-1 text-xs w-full font-mono"
                            value={row.parentPhone}
                            onChange={(e) => handleUpdateBulkRow(idx, 'parentPhone', e.target.value)}
                          />
                        </td>
                        <td className="py-1 px-1 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveBulkRow(idx)}
                            className="text-slate hover:text-red-600 p-1"
                            title="Remove row"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Mode 2: CSV upload and parse */
            <div className="space-y-4 p-4 bg-mist/20 rounded-xl border border-dashed border-gray-300 text-center">
              <div className="space-y-2">
                <FileSpreadsheet className="mx-auto text-emerald-600" size={36} />
                <h4 className="font-bold text-xs text-ink">
                  {lang === 'am' ? 'የተማሪዎች CSV ፋይል ይጫኑ' : 'Upload Students CSV File'}
                </h4>
                <p className="text-[11px] text-slate max-w-md mx-auto">
                  {lang === 'am'
                    ? 'CSV ፋይሉ የሚከተሉትን ዓምዶች መያዝ አለበት፡ Amharic Name, English Name, Gender, Birth Date, Parent Name, Parent Phone'
                    : 'The CSV file should contain columns: Amharic Name, English Name, Gender, Birth Date, Parent Name, Parent Phone'}
                </p>
              </div>

              <div className="flex items-center justify-center gap-3">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvFileUpload}
                  className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gold file:text-ink hover:file:bg-gold/90 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={handleDownloadSampleCsv}
                  className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1"
                >
                  <Download size={13} />
                  <span>{lang === 'am' ? 'የናሙና CSV አውርድ' : 'Download Sample'}</span>
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setBulkModalOpen(false)}
              className="btn-outline text-xs"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={submittingBulk}
              className="btn-gold text-xs font-bold py-2 px-4"
            >
              {submittingBulk ? t('saving') : lang === 'am' ? 'ተማሪዎቹን በሙሉ መዝግብ' : 'Register All Students'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
