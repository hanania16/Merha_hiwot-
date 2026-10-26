'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useLang } from '@/lib/i18n';
import { getCurrentUser } from '@/lib/auth';
import { Topbar } from '@/components/layout/Topbar';
import { Modal } from '@/components/ui/Modal';
import {
  Users,
  Printer,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  Calendar,
  Building,
  UserCheck,
  Clock,
  ArrowUpDown,
  BookOpen,
  Eye,
  FileSpreadsheet,
  Plus,
  Edit,
  Trash2,
} from 'lucide-react';

interface ClassGroupItem {
  id: string;
  name: string;
  level: 'CLASS_1_3' | 'CLASS_4_6' | 'CLASS_7_12';
  description?: string | null;
  roomNumber?: string | null;
  academicYear: number;
  isActive: boolean;
  orderIndex: number;
  teachers?: { id: string; fullName: string; phone?: string | null }[];
  _count?: { students: number };
}

interface StudentItem {
  id: string;
  studentCode: string;
  fullName: string;
  fullNameAmharic?: string | null;
  gender: 'MALE' | 'FEMALE';
  dateOfBirth: string;
  age: number;
  parentName: string;
  parentPhone: string;
  studentPhone?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  behaviorStatus: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'SUSPENDED';
  isSuspended: boolean;
  suspensionReason?: string | null;
  classId: string;
  class?: { id: string; name: string; level: string };
}

export default function ClassListPage() {
  const { lang, t } = useLang();
  const currentUser = getCurrentUser();

  const [classes, setClasses] = useState<ClassGroupItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // View mode: 'table' (interactive) or 'printSheet' (official attendance roll-call)
  const [viewMode, setViewMode] = useState<'table' | 'printSheet'>('table');

  // Filters
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'MALE' | 'FEMALE'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');

  // Class CRUD modal state
  const [teachers, setTeachers] = useState<{ id: string; fullName: string }[]>([]);
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassGroupItem | null>(null);
  const [className, setClassName] = useState('');
  const [classLevel, setClassLevel] = useState<'CLASS_1_3' | 'CLASS_4_6' | 'CLASS_7_12'>('CLASS_1_3');
  const [classRoomNumber, setClassRoomNumber] = useState('');
  const [classDescription, setClassDescription] = useState('');
  const [classAcademicYear, setClassAcademicYear] = useState(2018);
  const [classTeacherIds, setClassTeacherIds] = useState<string[]>([]);
  const [savingClass, setSavingClass] = useState(false);
  const [classError, setClassError] = useState('');

  useEffect(() => {
    loadClasses();
    loadTeachers();
  }, []);

  async function loadTeachers() {
    try {
      const res = await api.get<any[]>('/users?role=TEACHER');
      setTeachers(res || []);
    } catch {}
  }

  function handleOpenCreateClass() {
    setEditingClass(null);
    setClassName('');
    setClassLevel('CLASS_1_3');
    setClassRoomNumber('');
    setClassDescription('');
    setClassAcademicYear(2018);
    setClassTeacherIds([]);
    setClassError('');
    setClassModalOpen(true);
  }

  function handleOpenEditClass(c: ClassGroupItem) {
    setEditingClass(c);
    setClassName(c.name);
    setClassLevel(c.level);
    setClassRoomNumber(c.roomNumber || '');
    setClassDescription(c.description || '');
    setClassAcademicYear(c.academicYear || 2018);
    setClassTeacherIds((c.teachers || []).map((t) => t.id));
    setClassError('');
    setClassModalOpen(true);
  }

  async function handleSaveClass(e: React.FormEvent) {
    e.preventDefault();
    if (!className.trim()) {
      setClassError(lang === 'am' ? 'እባክዎ የክፍሉን ስም ያስገቡ' : 'Please enter class name');
      return;
    }

    try {
      setSavingClass(true);
      setClassError('');
      if (editingClass) {
        await api.patch(`/students/classes/${editingClass.id}`, {
          name: className.trim(),
          level: classLevel,
          roomNumber: classRoomNumber.trim() || undefined,
          description: classDescription.trim() || undefined,
          academicYear: Number(classAcademicYear),
          teacherIds: classTeacherIds,
        });
      } else {
        const created = await api.post<ClassGroupItem>('/students/classes', {
          name: className.trim(),
          level: classLevel,
          roomNumber: classRoomNumber.trim() || undefined,
          description: classDescription.trim() || undefined,
          academicYear: Number(classAcademicYear),
          teacherIds: classTeacherIds,
        });
        setSelectedClassId(created.id);
      }
      setClassModalOpen(false);
      await loadClasses();
    } catch (err: any) {
      setClassError(err?.message || (lang === 'am' ? 'ክፍሉን ማስቀመጥ አልተቻለም' : 'Failed to save class'));
    } finally {
      setSavingClass(false);
    }
  }

  async function handleDeleteClass(id: string) {
    if (
      !confirm(
        lang === 'am'
          ? 'እርግጠኛ ነዎት ይህን ክፍል ማጥፋት ይፈልጋሉ?'
          : 'Are you sure you want to delete this class?'
      )
    )
      return;

    try {
      await api.delete(`/students/classes/${id}`);
      setSelectedClassId('');
      await loadClasses();
    } catch (err: any) {
      alert(err?.message || (lang === 'am' ? 'ክፍሉን ማጥፋት አልተቻለም' : 'Failed to delete class'));
    }
  }

  async function loadClasses() {
    try {
      setLoading(true);
      const res = await api.get<ClassGroupItem[]>('/students/classes');
      setClasses(res || []);
      if (res && res.length > 0 && !selectedClassId) {
        setSelectedClassId(res[0].id);
      }
    } catch (err) {
      console.error('Failed to load classes:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedClassId) {
      loadClassStudents(selectedClassId);
    }
  }, [selectedClassId]);

  async function loadClassStudents(classId: string) {
    try {
      setLoadingStudents(true);
      // Fetch all students for this specific class
      const res = await api.get<any>(`/students?classId=${classId}&pageSize=500`);
      const list = Array.isArray(res) ? res : res?.data || [];
      setStudents(list);
    } catch (err) {
      console.error('Failed to load class students:', err);
    } finally {
      setLoadingStudents(false);
    }
  }

  const selectedClass = classes.find((c) => c.id === selectedClassId) || classes[0];

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (genderFilter !== 'ALL' && s.gender !== genderFilter) return false;
      if (statusFilter === 'ACTIVE' && (s.isSuspended || s.status !== 'ACTIVE')) return false;
      if (statusFilter === 'SUSPENDED' && !s.isSuspended && s.status !== 'SUSPENDED') return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          s.studentCode.toLowerCase().includes(q) ||
          s.fullName.toLowerCase().includes(q) ||
          (s.fullNameAmharic && s.fullNameAmharic.toLowerCase().includes(q)) ||
          s.parentName.toLowerCase().includes(q) ||
          s.parentPhone.includes(q)
        );
      }
      return true;
    });
  }, [students, genderFilter, statusFilter, search]);

  // Statistics
  const totalInClass = students.length;
  const maleCount = students.filter((s) => s.gender === 'MALE').length;
  const femaleCount = students.filter((s) => s.gender === 'FEMALE').length;
  const suspendedCount = students.filter((s) => s.isSuspended || s.status === 'SUSPENDED').length;
  const avgAge =
    totalInClass > 0
      ? (students.reduce((sum, s) => sum + s.age, 0) / totalInClass).toFixed(1)
      : '0';

  function handlePrint() {
    window.print();
  }

  function handleExportCsv() {
    if (!students.length) return;
    const headers = [
      'No',
      'Student Code',
      'Amharic Name',
      'English Name',
      'Gender',
      'Age',
      'Parent Name',
      'Parent Phone',
      'Status',
      'Conduct',
    ];

    const rows = filteredStudents.map((s, idx) => [
      idx + 1,
      s.studentCode,
      `"${s.fullNameAmharic || ''}"`,
      `"${s.fullName}"`,
      s.gender,
      s.age,
      `"${s.parentName}"`,
      s.parentPhone,
      s.isSuspended ? 'SUSPENDED' : s.status,
      s.behaviorStatus,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `${selectedClass ? selectedClass.name.replace(/\s+/g, '_') : 'Class'}_Roster.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-6">
      {/* Non-print Topbar */}
      <div className="print:hidden">
        <Topbar
          title={lang === 'am' ? 'የክፍል ተማሪዎች ዝርዝርና መዝገብ' : 'Class Roster & Attendance List'}
          subtitle={
            lang === 'am'
              ? 'የተማሪዎችን ሙሉ መረጃ በክፍል ለይቶ መመልከቻ፣ መከታተያና ለህትመት የተዘጋጀ የሰንበት ት/ቤት መዝገብ'
              : 'View class rosters, student counts, and print attendance tracking sheets'
          }
        >
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenCreateClass}
              className="btn-gold flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3"
            >
              <Plus size={14} />
              <span>{lang === 'am' ? 'አዲስ ክፍል መዝግብ' : 'Add Class'}</span>
            </button>
            <button
              onClick={handleExportCsv}
              disabled={filteredStudents.length === 0}
              className="btn-outline flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3"
            >
              <FileSpreadsheet size={14} className="text-emerald-600" />
              <span>{lang === 'am' ? 'ወደ CSV አውርድ' : 'Export CSV'}</span>
            </button>
            <button
              onClick={handlePrint}
              disabled={filteredStudents.length === 0}
              className="btn-outline flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3"
            >
              <Printer size={14} />
              <span>{lang === 'am' ? 'መዝገብ አትም' : 'Print Roster'}</span>
            </button>
          </div>
        </Topbar>
      </div>

      {/* Class Selector Tabs (print:hidden) */}
      <div className="print:hidden bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <GraduationCap className="text-gold" size={18} />
            <span className="font-bold text-xs text-ink uppercase tracking-wider">
              {lang === 'am' ? 'ክፍል ይምረጡ (Select Class):' : 'Select Class:'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {selectedClass && (
              <>
                <button
                  type="button"
                  onClick={() => handleOpenEditClass(selectedClass)}
                  className="text-xs text-slate hover:text-ink font-semibold flex items-center gap-1 border border-gray-200 px-2.5 py-1 rounded-lg hover:bg-gray-50 transition"
                  title={lang === 'am' ? 'የተመረጠውን ክፍል አርትዕ' : 'Edit Selected Class'}
                >
                  <Edit size={13} className="text-blue-600" />
                  <span>{lang === 'am' ? 'ክፍል አርትዕ' : 'Edit Class'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteClass(selectedClass.id)}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 border border-rose-200 px-2.5 py-1 rounded-lg hover:bg-rose-50 transition"
                  title={lang === 'am' ? 'ይህን ክፍል አጥፋ' : 'Delete Selected Class'}
                >
                  <Trash2 size={13} />
                  <span>{lang === 'am' ? 'አጥፋ' : 'Delete'}</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={handleOpenCreateClass}
              className="text-xs text-gold hover:underline font-semibold flex items-center gap-1 ml-1"
            >
              <Plus size={13} />
              <span>{lang === 'am' ? 'አዲስ ክፍል' : 'Add Class'}</span>
            </button>
          </div>
        </div>

        {classes.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-xl space-y-3">
            <Building className="mx-auto text-slate/40" size={36} />
            <p className="text-sm font-bold text-ink">
              {lang === 'am' ? 'ምንም ክፍሎች እስካሁን አልተመዘገቡም' : 'No classes registered yet'}
            </p>
            <p className="text-xs text-slate max-w-md mx-auto">
              {lang === 'am'
                ? 'ተማሪዎችን ለመመዝገብ መጀመሪያ ክፍሎችን ማዘጋጀት ያስፈልጋል። ከዚህ በታች ያለውን ቁልፍ በመጫን አዲስ ክፍል ይመዝግቡ።'
                : 'To register students, you first need to configure classes. Click below to add your first class.'}
            </p>
            <button
              type="button"
              onClick={handleOpenCreateClass}
              className="btn-gold text-xs font-bold py-2 px-4 inline-flex items-center gap-1.5"
            >
              <Plus size={15} />
              <span>{lang === 'am' ? '+ አዲስ ክፍል መዝግብ' : '+ Add New Class'}</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {classes.map((cls) => {
              const isSelected = cls.id === selectedClassId;
              return (
                <button
                  key={cls.id}
                  onClick={() => setSelectedClassId(cls.id)}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                    isSelected
                      ? 'bg-ink text-gold border-gold shadow-md'
                      : 'bg-mist/30 text-slate hover:bg-gray-100 border-gray-200'
                  }`}
                >
                  <span>{cls.name}</span>
                  {cls.roomNumber && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-gray-200 text-slate'
                      }`}
                    >
                      {cls.roomNumber}
                    </span>
                  )}
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isSelected ? 'bg-gold text-ink' : 'bg-gray-200 text-slate'
                    }`}
                  >
                    {cls._count?.students ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Class Statistics Overview Cards (print:hidden) */}
      <div className="print:hidden grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 bg-white rounded-xl border border-gray-100 shadow-sm">
          <p className="text-[11px] text-slate font-medium">{lang === 'am' ? 'በክፍሉ ያሉ ተማሪዎች' : 'Enrolled Students'}</p>
          <p className="text-xl font-black text-ink mt-1">{totalInClass}</p>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-gray-100 shadow-sm">
          <p className="text-[11px] text-slate font-medium">{lang === 'am' ? 'ወንዶች' : 'Male Students'}</p>
          <p className="text-xl font-black text-blue-700 mt-1">{maleCount}</p>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-gray-100 shadow-sm">
          <p className="text-[11px] text-slate font-medium">{lang === 'am' ? 'ሴቶች' : 'Female Students'}</p>
          <p className="text-xl font-black text-rose-700 mt-1">{femaleCount}</p>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-gray-100 shadow-sm">
          <p className="text-[11px] text-slate font-medium">{lang === 'am' ? 'አማካይ ዕድሜ' : 'Average Age'}</p>
          <p className="text-xl font-black text-ink mt-1">{avgAge} <span className="text-xs font-normal text-slate">{lang === 'am' ? 'ዓመት' : 'yrs'}</span></p>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-gray-100 shadow-sm col-span-2 sm:col-span-1">
          <p className="text-[11px] text-slate font-medium">{lang === 'am' ? 'የታገዱ ተማሪዎች' : 'Suspended'}</p>
          <p className={`text-xl font-black mt-1 ${suspendedCount > 0 ? 'text-red-600' : 'text-slate'}`}>
            {suspendedCount}
          </p>
        </div>
      </div>

      {/* Suspension Alert if any in this class */}
      {suspendedCount > 0 && (
        <div className="print:hidden p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-rose-600 shrink-0" size={17} />
            <div>
              <span className="font-bold">
                {lang === 'am'
                  ? `በዚህ ክፍል ${suspendedCount} የታገደ/ዱ ተማሪ አለ/አሉ!`
                  : `Attention: ${suspendedCount} suspended student(s) in this class!`}
              </span>
              <p className="text-[11px] text-rose-700 mt-0.5">
                {lang === 'am'
                  ? 'የታገደ ተማሪ በሰንበት ት/ቤት መዝገብ ላይ በቀይ ምልክት ይገለጻል።'
                  : 'Suspended students are highlighted with active red badges on the roster.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter(statusFilter === 'SUSPENDED' ? 'ALL' : 'SUSPENDED')}
            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[11px] font-bold shrink-0"
          >
            {statusFilter === 'SUSPENDED'
              ? lang === 'am' ? 'ሁሉንም አሳይ' : 'Show All'
              : lang === 'am' ? 'የታገዱትን ብቻ ለይ' : 'Filter Suspended'}
          </button>
        </div>
      )}

      {/* View Switcher & Search Bar (print:hidden) */}
      <div className="print:hidden flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-gray-200">
        {/* View Toggle */}
        <div className="flex items-center p-1 bg-mist/40 rounded-lg border border-gray-200">
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              viewMode === 'table' ? 'bg-white text-ink shadow-sm' : 'text-slate hover:text-ink'
            }`}
          >
            {lang === 'am' ? 'የተማሪዎች ሙሉ ዝርዝር' : 'Interactive Table'}
          </button>
          <button
            onClick={() => setViewMode('printSheet')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'printSheet' ? 'bg-white text-ink shadow-sm' : 'text-slate hover:text-ink'
            }`}
          >
            <Printer size={13} className="text-gold" />
            <span>{lang === 'am' ? 'የሳምንታዊ ክትትል መዝገብ (Print Roster)' : 'Roll-Call Sheet'}</span>
          </button>
        </div>

        {/* Search & Gender filter */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-slate" size={15} />
            <input
              type="text"
              placeholder={lang === 'am' ? 'በስም፣ ኮድ ወይም ስልክ ፈልግ…' : 'Search by name, code, phone…'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input text-xs pl-9 w-full"
            />
          </div>
          <select
            className="select text-xs font-medium w-28 shrink-0"
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value as any)}
          >
            <option value="ALL">{lang === 'am' ? 'ሁሉም ጾታ' : 'All Gender'}</option>
            <option value="MALE">{lang === 'am' ? 'ወንድ' : 'Male'}</option>
            <option value="FEMALE">{lang === 'am' ? 'ሴት' : 'Female'}</option>
          </select>
        </div>
      </div>

      {/* VIEW 1: INTERACTIVE TABLE */}
      {viewMode === 'table' && (
        <div className="print:hidden bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-mist/20">
            <div>
              <h3 className="font-bold text-sm text-ink flex items-center gap-2">
                <span>{selectedClass?.name || 'Class Roster'}</span>
                {selectedClass?.roomNumber && (
                  <span className="text-xs font-normal text-slate">({selectedClass.roomNumber})</span>
                )}
              </h3>
              <p className="text-xs text-slate mt-0.5">
                {lang === 'am'
                  ? `የተገኙ ተማሪዎች፡ ${filteredStudents.length} ከ ${totalInClass}`
                  : `Showing ${filteredStudents.length} of ${totalInClass} students`}
              </p>
            </div>
            <Link
              href="/dashboard/admin/students"
              className="btn-outline text-xs py-1 px-2.5 font-semibold"
            >
              + {lang === 'am' ? 'አዲስ ተማሪ መዝግብ' : 'Register Student'}
            </Link>
          </div>

          {loadingStudents ? (
            <div className="p-12 text-center text-xs text-slate">{t('loading')}</div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate">
              {lang === 'am' ? 'በዚህ ክፍል የተመዘገበ ተማሪ አልተገኘም' : 'No students registered in this class yet'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full text-xs">
                <thead>
                  <tr className="bg-ink text-white font-semibold">
                    <th className="py-2.5 px-3 text-left">#</th>
                    <th className="py-2.5 px-3 text-left">{lang === 'am' ? 'መለያ' : 'Code'}</th>
                    <th className="py-2.5 px-3 text-left">{lang === 'am' ? 'የተማሪው ሙሉ ስም' : 'Full Name'}</th>
                    <th className="py-2.5 px-3 text-center">{lang === 'am' ? 'ጾታ' : 'Gender'}</th>
                    <th className="py-2.5 px-3 text-center">{lang === 'am' ? 'ዕድሜ' : 'Age'}</th>
                    <th className="py-2.5 px-3 text-left">{lang === 'am' ? 'የወላጅ ስም እና ስልክ' : 'Parent Contact'}</th>
                    <th className="py-2.5 px-3 text-center">{lang === 'am' ? 'ሥነ-ምግባር' : 'Conduct'}</th>
                    <th className="py-2.5 px-3 text-center">{lang === 'am' ? 'ሁኔታ' : 'Status'}</th>
                    <th className="py-2.5 px-3 text-right">{lang === 'am' ? 'ተግባር' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredStudents.map((s, idx) => (
                    <tr
                      key={s.id}
                      className={`hover:bg-gold/5 transition-colors ${
                        s.isSuspended ? 'bg-red-50/40' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono text-slate text-center w-8">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-ink">{s.studentCode}</td>
                      <td className="py-2.5 px-3">
                        <p className="font-bold text-ink">{s.fullNameAmharic || s.fullName}</p>
                        {s.fullNameAmharic && s.fullName !== s.fullNameAmharic && (
                          <p className="text-[10px] text-slate">{s.fullName}</p>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.gender === 'MALE' ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {s.gender === 'MALE' ? (lang === 'am' ? 'ወንድ' : 'M') : (lang === 'am' ? 'ሴት' : 'F')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-ink">{s.age}</td>
                      <td className="py-2.5 px-3">
                        <p className="text-ink font-medium">{s.parentName}</p>
                        <p className="text-[10px] text-slate font-mono">{s.parentPhone}</p>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          s.behaviorStatus === 'EXCELLENT'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : s.behaviorStatus === 'GOOD'
                            ? 'bg-blue-50 text-blue-700 border-blue-300'
                            : s.behaviorStatus === 'WARNING'
                            ? 'bg-amber-50 text-amber-700 border-amber-300'
                            : 'bg-red-50 text-red-700 border-red-300'
                        }`}>
                          {s.behaviorStatus === 'EXCELLENT'
                            ? 'የላቀ'
                            : s.behaviorStatus === 'GOOD'
                            ? 'ጥሩ'
                            : s.behaviorStatus === 'WARNING'
                            ? 'ማስጠንቀቂያ'
                            : 'የታገደ'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {s.isSuspended || s.status === 'SUSPENDED' ? (
                          <span className="px-2 py-0.5 rounded bg-red-600 text-white font-bold text-[10px] flex items-center justify-center gap-1 mx-auto w-fit">
                            <AlertTriangle size={10} />
                            {lang === 'am' ? 'የታገደ' : 'Suspended'}
                          </span>
                        ) : s.status === 'ACTIVE' ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            {lang === 'am' ? 'ንቁ' : 'Active'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-gray-200 text-slate font-bold text-[10px]">
                            {lang === 'am' ? 'ያልነቃ' : 'Inactive'}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Link
                          href={`/dashboard/admin/students`}
                          className="btn-outline text-[11px] py-1 px-2 font-medium"
                        >
                          <Eye size={12} className="inline mr-1" />
                          {lang === 'am' ? 'መገለጫ' : 'Profile'}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: OFFICIAL PRINTABLE ROLL-CALL & ATTENDANCE SHEET */}
      <div className={`bg-white rounded-xl border border-gray-300 p-6 shadow-md print:border-none print:shadow-none print:p-0 ${
        viewMode === 'printSheet' ? 'block' : 'hidden print:block'
      }`}>
        {/* Printable Ethiopian Orthodox Header */}
        <div className="text-center pb-4 border-b-2 border-gold/60 space-y-1">
          <p className="text-xs tracking-widest text-slate font-serif uppercase">
            በስመ አብ ወወልድ ወመንፈስ ቅዱስ አሐዱ አምላክ አሜን
          </p>
          <h2 className="text-base sm:text-lg font-black text-ink">
            ደብረ አሚን ተክለ ሃይማኖት ቤተ ክርስቲያን
          </h2>
          <h1 className="text-lg sm:text-xl font-black text-gold">
            መርሐ ህይወት ሰንበት ትምህርት ቤት
          </h1>
          <p className="text-xs font-bold text-ink/80 pt-0.5">
            የሰንበት ት/ቤት ተማሪዎች የሳምንታዊ ክትትልና የስነ-ምግባር መመዝገቢያ ሠንጠረዥ (Attendance & Roll-Call Roster)
          </p>
        </div>

        {/* Metadata info strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-3 px-2 bg-mist/20 text-xs border-b border-gray-200 my-3 font-medium">
          <div>
            <span className="text-slate font-normal">ክፍል (Class): </span>
            <span className="font-bold text-ink">{selectedClass?.name}</span>
          </div>
          <div>
            <span className="text-slate font-normal">የመማሪያ ክፍል (Room): </span>
            <span className="font-bold text-ink">{selectedClass?.roomNumber || 'ክፍል 1'}</span>
          </div>
          <div>
            <span className="text-slate font-normal">የትምህርት ዘመን: </span>
            <span className="font-bold text-ink">2018 ዓ.ም (2025/2026)</span>
          </div>
          <div>
            <span className="text-slate font-normal">የክፍል ተጠሪ መምህር: </span>
            <span className="font-bold text-ink">
              {selectedClass?.teachers && selectedClass.teachers.length > 0
                ? selectedClass.teachers.map((t) => t.fullName).join(', ')
                : 'ተጠሪ መምህር'}
            </span>
          </div>
        </div>

        {/* Printable Grid Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] border-collapse border border-gray-400">
            <thead>
              <tr className="bg-gray-100 text-ink">
                <th className="border border-gray-400 py-1.5 px-2 text-center w-8">ተ.ቁ</th>
                <th className="border border-gray-400 py-1.5 px-2 text-left w-24">የተማሪ መለያ</th>
                <th className="border border-gray-400 py-1.5 px-2 text-left">የተማሪው ሙሉ ስም</th>
                <th className="border border-gray-400 py-1.5 px-1 text-center w-8">ጾታ</th>
                <th className="border border-gray-400 py-1.5 px-1 text-center w-8">ዕድሜ</th>
                {/* 12 Sunday session columns */}
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                  <th key={num} className="border border-gray-400 py-1 px-1 text-center w-7 text-[10px]">
                    ሳ{num}
                  </th>
                ))}
                <th className="border border-gray-400 py-1.5 px-1 text-center w-12 text-[10px]">ድምር</th>
                <th className="border border-gray-400 py-1.5 px-1 text-center w-12 text-[10px]">ስነ-ምግባር</th>
                <th className="border border-gray-400 py-1.5 px-2 text-left w-28">ምርመራ / ማስታወሻ</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={19} className="border border-gray-400 p-6 text-center text-xs text-slate">
                    በዚህ ክፍል የተመዘገበ ተማሪ የለም
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s, idx) => (
                  <tr key={s.id} className={s.isSuspended ? 'bg-red-50/60' : ''}>
                    <td className="border border-gray-400 py-1 px-1 text-center font-mono">{idx + 1}</td>
                    <td className="border border-gray-400 py-1 px-2 font-mono font-bold">{s.studentCode}</td>
                    <td className="border border-gray-400 py-1 px-2 font-bold text-ink">
                      {s.fullNameAmharic || s.fullName}
                      {s.isSuspended && (
                        <span className="text-[9px] text-red-600 ml-1 font-bold">[የታገደ]</span>
                      )}
                    </td>
                    <td className="border border-gray-400 py-1 px-1 text-center font-medium">
                      {s.gender === 'MALE' ? 'ወ' : 'ሴ'}
                    </td>
                    <td className="border border-gray-400 py-1 px-1 text-center font-medium">{s.age}</td>
                    {/* 12 empty cells for attendance marking */}
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                      <td key={num} className="border border-gray-400 py-1 px-1 text-center text-[10px] text-slate/40">
                        {s.isSuspended ? '—' : '☐'}
                      </td>
                    ))}
                    <td className="border border-gray-400 py-1 px-1 text-center"></td>
                    <td className="border border-gray-400 py-1 px-1 text-center text-[10px] font-bold">
                      {s.behaviorStatus === 'EXCELLENT'
                        ? '10'
                        : s.behaviorStatus === 'GOOD'
                        ? '9'
                        : s.behaviorStatus === 'WARNING'
                        ? '6'
                        : '4'}
                    </td>
                    <td className="border border-gray-400 py-1 px-2 text-[10px] text-slate">
                      {s.isSuspended ? s.suspensionReason || 'የታገደ' : ''}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Legend & Signatures Block */}
        <div className="pt-6 space-y-4">
          <div className="flex items-center justify-between text-[10px] text-slate border-b border-gray-200 pb-2">
            <span>የምልክቶች ትርጉም፡ ✔ = የተገኘ (Present) | ✖ = የቀረ (Absent) | ፈ = የፈቀደ (Permission)</span>
            <span>መርሐ ህይወት ሰንበት ትምህርት ቤት · ደብረ አሚን ተክለ ሃይማኖት</span>
          </div>

          <div className="grid grid-cols-3 gap-8 pt-4 text-center text-xs">
            <div>
              <p className="text-slate font-medium">የክፍል ተጠሪ መምህር</p>
              <div className="h-12 border-b border-dashed border-gray-400 flex items-end justify-center pb-1">
                <span className="text-[11px] font-serif text-slate/60">ፊርማ / Signature</span>
              </div>
              <p className="text-[11px] font-bold text-ink mt-1">ቀን፡ _______________</p>
            </div>

            <div>
              <p className="text-slate font-medium">የትምህርት ክፍል አስተዳዳሪ</p>
              <div className="h-12 border-b border-dashed border-gray-400 flex items-end justify-center pb-1">
                <span className="text-[11px] font-serif text-slate/60">ፊርማ / Signature</span>
              </div>
              <p className="text-[11px] font-bold text-ink mt-1">ቀን፡ _______________</p>
            </div>

            <div>
              <p className="text-slate font-medium">የሰንበት ት/ቤት ማኅተም</p>
              <div className="h-12 border border-dashed border-gray-400 rounded-lg flex items-center justify-center text-[10px] text-slate/50">
                ማኅተም (Seal)
              </div>
              <p className="text-[11px] font-bold text-ink mt-1">ይፋዊ ሰነድ</p>
            </div>
          </div>
        </div>
      </div>

      {/* Class Create / Edit Modal */}
      <Modal
        open={classModalOpen}
        onClose={() => setClassModalOpen(false)}
        title={
          editingClass
            ? lang === 'am'
              ? 'የክፍል መረጃ ማሻሻያ (Edit Class)'
              : 'Edit Class'
            : lang === 'am'
            ? 'አዲስ ክፍል መመዝገቢያ (Add New Class)'
            : 'Add New Class'
        }
      >
        <form onSubmit={handleSaveClass} className="space-y-4">
          {classError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
              {classError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-ink mb-1">
              {lang === 'am' ? 'የክፍሉ ስም *' : 'Class Name *'}
            </label>
            <input
              type="text"
              required
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder={lang === 'am' ? 'ለምሳሌ፡ ክፍል 1-3 (ሀ)' : 'e.g. Class 1-3 (A)'}
              className="input w-full text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                {lang === 'am' ? 'የትምህርት ደረጃ' : 'Level'}
              </label>
              <select
                value={classLevel}
                onChange={(e) => setClassLevel(e.target.value as any)}
                className="select w-full text-xs font-medium"
              >
                <option value="CLASS_1_3">{lang === 'am' ? 'ክፍል 1-3 (ሕፃናት)' : 'Class 1-3 (Children)'}</option>
                <option value="CLASS_4_6">{lang === 'am' ? 'ክፍል 4-6 (ማዕከላዊ)' : 'Class 4-6 (Intermediate)'}</option>
                <option value="CLASS_7_12">{lang === 'am' ? 'ክፍል 7-12 (ወጣቶች)' : 'Class 7-12 (Youth)'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                {lang === 'am' ? 'የትምህርት ዓመት (ዓ.ም)' : 'Academic Year'}
              </label>
              <input
                type="number"
                value={classAcademicYear}
                onChange={(e) => setClassAcademicYear(Number(e.target.value))}
                className="input w-full text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink mb-1">
              {lang === 'am' ? 'የክፍል / መማሪያ ክፍል ቁጥር (አማራጭ)' : 'Room Number (Optional)'}
            </label>
            <input
              type="text"
              value={classRoomNumber}
              onChange={(e) => setClassRoomNumber(e.target.value)}
              placeholder={lang === 'am' ? 'ለምሳሌ፡ ክፍል 101' : 'e.g. Room 101'}
              className="input w-full text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-ink mb-1">
              {lang === 'am' ? 'መግለጫ (አማራጭ)' : 'Description (Optional)'}
            </label>
            <textarea
              rows={2}
              value={classDescription}
              onChange={(e) => setClassDescription(e.target.value)}
              placeholder={lang === 'am' ? 'ስለ ክፍሉ አጭር መግለጫ…' : 'Brief description of the class…'}
              className="input w-full text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-ink mb-1">
              {lang === 'am' ? 'የክፍሉ አስተማሪ(ዎች)' : 'Assigned Teacher(s)'}
            </label>
            {teachers.length === 0 ? (
              <p className="text-xs text-slate italic">
                {lang === 'am' ? 'ምንም አስተማሪዎች አልተገኙም' : 'No teachers registered yet'}
              </p>
            ) : (
              <div className="max-h-36 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                {teachers.map((t) => {
                  const checked = classTeacherIds.includes(t.id);
                  return (
                    <label
                      key={t.id}
                      className="flex items-center gap-2 text-xs hover:bg-gray-50 p-1 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setClassTeacherIds([...classTeacherIds, t.id]);
                          } else {
                            setClassTeacherIds(classTeacherIds.filter((id) => id !== t.id));
                          }
                        }}
                        className="rounded text-gold focus:ring-gold"
                      />
                      <span>{t.fullName}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setClassModalOpen(false)}
              className="btn-outline text-xs py-2 px-4"
            >
              {lang === 'am' ? 'ይቅር' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={savingClass}
              className="btn-gold text-xs font-bold py-2 px-5"
            >
              {savingClass
                ? lang === 'am'
                  ? 'በመመዝገብ ላይ…'
                  : 'Saving…'
                : editingClass
                ? lang === 'am'
                  ? 'አሻሽል'
                  : 'Update'
                : lang === 'am'
                ? 'መዝግብ'
                : 'Save Class'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
