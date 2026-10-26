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
  status: 'ACTIVE' | 'INACTIVE';
  photoUrl: string | null;
  isWorkingMember: boolean;
  monthlySalary?: number | null;
  grades?: StudentGradeSummary[];
  _count?: { grades: number; certificates: number };
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
  const [detailTab, setDetailTab] = useState<'grades' | 'info' | 'certificates'>('grades');
  const [loadingDetail, setLoadingDetail] = useState(false);

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
        api.get<{ data: Student[] }>('/students?pageSize=100'),
        api.get<ClassGroup[]>('/students/classes'),
        api.get<CourseOption[]>('/education/courses'),
      ]);
      setStudents(studentsRes.data || []);
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

  const filteredStudents = students.filter((s) => {
    if (selectedClassId !== 'ALL' && s.classId !== selectedClassId) return false;
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
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
        <button
          onClick={handleOpenCreate}
          className="btn-gold flex items-center gap-1.5 text-xs font-semibold"
        >
          <UserPlus size={15} />
          {t('registerNewStudent')}
        </button>
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
                  <tr key={s.id} className="hover:bg-amber-50/20 transition-colors">
                    <td className="font-mono text-xs font-bold text-gold">{s.studentCode}</td>
                    <td>
                      <div>
                        <p className="font-semibold text-ink text-sm">
                          {lang === 'am' && s.fullNameAmharic ? s.fullNameAmharic : s.fullName}
                        </p>
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
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
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

            {/* Modal Tabs */}
            <div className="flex border-b border-gray-100 gap-4 text-xs font-semibold">
              <button
                onClick={() => setDetailTab('grades')}
                className={`pb-2 border-b-2 flex items-center gap-1.5 transition-colors ${
                  detailTab === 'grades' ? 'border-gold text-gold font-bold' : 'border-transparent text-slate'
                }`}
              >
                <Award size={14} />
                {lang === 'am' ? 'የትምህርት ውጤቶች (Grades)' : 'Academic Grades'} ({activeStudentDetail.grades?.length || 0})
              </button>
              <button
                onClick={() => setDetailTab('info')}
                className={`pb-2 border-b-2 flex items-center gap-1.5 transition-colors ${
                  detailTab === 'info' ? 'border-gold text-gold font-bold' : 'border-transparent text-slate'
                }`}
              >
                <Calendar size={14} />
                {lang === 'am' ? 'የግልና ወላጅ መረጃ' : 'Personal Info'}
              </button>
              <button
                onClick={() => setDetailTab('certificates')}
                className={`pb-2 border-b-2 flex items-center gap-1.5 transition-colors ${
                  detailTab === 'certificates' ? 'border-gold text-gold font-bold' : 'border-transparent text-slate'
                }`}
              >
                <Scroll size={14} />
                {lang === 'am' ? 'ምስክር ወረቀቶች' : 'Certificates'} ({activeStudentDetail.certificates?.length || 0})
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
    </div>
  );
}
