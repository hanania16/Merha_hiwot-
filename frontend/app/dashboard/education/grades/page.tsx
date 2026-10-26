'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useLang } from '@/lib/i18n';
import { getCurrentUser } from '@/lib/auth';
import { Topbar } from '@/components/layout/Topbar';
import { Modal } from '@/components/ui/Modal';
import {
  Award,
  CheckCircle2,
  Save,
  Send,
  FileCheck,
  Search,
  BookOpen,
  Filter,
  FileText,
  Printer,
  ChevronRight,
} from 'lucide-react';

interface Course {
  id: string;
  code: string;
  name: string;
  nameAmharic: string;
  classLevel: string;
  targetGrade?: string | null;
  scheduleTime?: string | null;
  teacher?: { id: string; fullName: string; email: string };
  maxScore: number;
  passScore: number;
}

interface Student {
  id: string;
  studentCode: string;
  fullName: string;
  fullNameAmharic: string | null;
  gender: string;
  classId: string;
  class: { id: string; name: string; level: string };
}

interface GradeRow {
  studentId: string;
  studentCode: string;
  fullName: string;
  fullNameAmharic: string | null;
  gender: string;
  gradeId?: string;
  assessmentScore: number | '';
  midExamScore: number | '';
  finalExamScore: number | '';
  conductScore: number | '';
  totalScore: number;
  letterGrade: string;
  rank?: number;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'NEW';
  remarks: string;
}

interface ReportCardData {
  student: Student;
  ethiopianYear: number;
  semester: string;
  grades: any[];
  totalCourses: number;
  totalScoreSum: number;
  averageScore: number;
  overallGrade: string;
  conductScore: number;
}

export default function GradesSubmissionPage() {
  const { t, lang } = useLang();
  const user = getCurrentUser();
  const isAdmin = user?.role === 'ADMINISTRATOR';

  const [classLevel, setClassLevel] = useState<string>('CLASS_7_12');
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [ethiopianYear, setEthiopianYear] = useState<number>(2018);
  const [semester, setSemester] = useState<string>('SEMESTER_1');

  const [gradeRows, setGradeRows] = useState<GradeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Report card modal state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportData, setReportData] = useState<ReportCardData | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    loadCourses();
  }, [classLevel]);

  useEffect(() => {
    if (selectedCourseId) {
      loadRosterAndGrades();
    }
  }, [selectedCourseId, ethiopianYear, semester]);

  async function loadCourses() {
    try {
      const res = await api.get<Course[]>(`/education/courses?classLevel=${classLevel}`);
      setCourses(res);
      if (res.length > 0) {
        setSelectedCourseId(res[0].id);
      } else {
        setSelectedCourseId('');
        setGradeRows([]);
      }
    } catch (err) {
      console.error('Failed to load courses:', err);
    }
  }

  function computeGradeLetter(total: number): string {
    if (total >= 95) return 'A+';
    if (total >= 90) return 'A';
    if (total >= 85) return 'A-';
    if (total >= 80) return 'B+';
    if (total >= 75) return 'B';
    if (total >= 70) return 'B-';
    if (total >= 65) return 'C+';
    if (total >= 50) return 'C';
    if (total >= 40) return 'D';
    return 'F';
  }

  async function loadRosterAndGrades() {
    if (!selectedCourseId) return;
    try {
      setLoading(true);
      setMessage(null);

      // 1. Fetch students in this class level
      const studentsRes = await api.get<{ data: Student[] }>(`/students?limit=100`);
      const studentsInClass = (studentsRes.data || []).filter(
        (s) => s.class?.level === classLevel,
      );

      // 2. Fetch existing grades for course, year, and semester
      const gradesRes = await api.get<any[]>(
        `/education/grades?courseId=${selectedCourseId}&ethiopianYear=${ethiopianYear}&semester=${semester}`,
      );
      const gradeMap = new Map<string, any>();
      gradesRes.forEach((g) => gradeMap.set(g.studentId, g));

      // 3. Build unified rows
      const rows: GradeRow[] = studentsInClass.map((s) => {
        const existing = gradeMap.get(s.id);
        if (existing) {
          return {
            studentId: s.id,
            studentCode: s.studentCode,
            fullName: s.fullName,
            fullNameAmharic: s.fullNameAmharic,
            gender: s.gender,
            gradeId: existing.id,
            assessmentScore: existing.assessmentScore !== null ? Number(existing.assessmentScore) : '',
            midExamScore: existing.midExamScore !== null ? Number(existing.midExamScore) : '',
            finalExamScore: existing.finalExamScore !== null ? Number(existing.finalExamScore) : '',
            conductScore: existing.conductScore !== null ? Number(existing.conductScore) : '',
            totalScore: Number(existing.totalScore),
            letterGrade: existing.letterGrade || computeGradeLetter(Number(existing.totalScore)),
            rank: existing.rank,
            status: existing.status,
            remarks: existing.remarks || '',
          };
        } else {
          return {
            studentId: s.id,
            studentCode: s.studentCode,
            fullName: s.fullName,
            fullNameAmharic: s.fullNameAmharic,
            gender: s.gender,
            assessmentScore: '',
            midExamScore: '',
            finalExamScore: '',
            conductScore: '',
            totalScore: 0,
            letterGrade: 'F',
            status: 'NEW',
            remarks: '',
          };
        }
      });

      setGradeRows(rows);
    } catch (err) {
      console.error('Failed to load roster:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleScoreChange(
    index: number,
    field: 'assessmentScore' | 'midExamScore' | 'finalExamScore' | 'conductScore',
    value: string,
  ) {
    const num = value === '' ? '' : Math.max(0, Math.min(100, Number(value)));
    const updated = [...gradeRows];
    const row = { ...updated[index], [field]: num };

    // Calculate total
    const assess = typeof row.assessmentScore === 'number' ? row.assessmentScore : 0;
    const mid = typeof row.midExamScore === 'number' ? row.midExamScore : 0;
    const final = typeof row.finalExamScore === 'number' ? row.finalExamScore : 0;
    const conduct = typeof row.conductScore === 'number' ? row.conductScore : 0;
    const total = Math.min(100, assess + mid + final + conduct);

    row.totalScore = total;
    row.letterGrade = computeGradeLetter(total);
    if (row.status === 'APPROVED' && !isAdmin) {
      row.status = 'DRAFT';
    } else if (row.status === 'NEW') {
      row.status = 'DRAFT';
    }

    updated[index] = row;
    setGradeRows(updated);
  }

  function handleRemarkChange(index: number, text: string) {
    const updated = [...gradeRows];
    updated[index] = { ...updated[index], remarks: text };
    setGradeRows(updated);
  }

  async function handleBatchSave(submitForApproval: boolean) {
    if (!selectedCourseId) return;
    try {
      setSaving(true);
      setMessage(null);

      const payload = {
        courseId: selectedCourseId,
        ethiopianYear,
        semester,
        submitForApproval,
        grades: gradeRows.map((r) => ({
          studentId: r.studentId,
          assessmentScore: typeof r.assessmentScore === 'number' ? r.assessmentScore : 0,
          midExamScore: typeof r.midExamScore === 'number' ? r.midExamScore : 0,
          finalExamScore: typeof r.finalExamScore === 'number' ? r.finalExamScore : 0,
          conductScore: typeof r.conductScore === 'number' ? r.conductScore : 0,
          remarks: r.remarks,
        })),
      };

      await api.post('/education/grades/batch-submit', payload);
      setMessage({
        text: submitForApproval
          ? lang === 'am'
            ? 'የተማሪዎች ውጤት በተሳካ ሁኔታ ለውሳኔና ለማፅደቅ ተልኳል!'
            : 'Grades successfully submitted to administration for review!'
          : lang === 'am'
          ? 'ረቂቅ ውጤቶች በተሳካ ሁኔታ ተቀምጠዋል!'
          : 'Draft grades successfully saved!',
        type: 'success',
      });
      await loadRosterAndGrades();
    } catch (err: any) {
      setMessage({
        text: err?.message || 'Failed to save grades',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleApproveAll() {
    const gradeIds = gradeRows.map((r) => r.gradeId).filter(Boolean) as string[];
    if (gradeIds.length === 0) return;
    try {
      setSaving(true);
      await api.post('/education/grades/approve', { gradeIds });
      setMessage({
        text: lang === 'am' ? 'ሁሉም ውጤቶች ፀድቀዋል!' : 'All student marks approved!',
        type: 'success',
      });
      await loadRosterAndGrades();
    } catch (err: any) {
      setMessage({ text: err?.message || 'Approval failed', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function openReportCard(studentId: string) {
    try {
      setReportLoading(true);
      setReportModalOpen(true);
      const data = await api.get<ReportCardData>(
        `/education/grades/report-card/${studentId}?ethiopianYear=${ethiopianYear}&semester=${semester}`,
      );
      setReportData(data);
    } catch (err) {
      console.error('Failed to load report card:', err);
    } finally {
      setReportLoading(false);
    }
  }

  const filteredRows = gradeRows.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.fullName.toLowerCase().includes(term) ||
      (r.fullNameAmharic && r.fullNameAmharic.toLowerCase().includes(term)) ||
      r.studentCode.toLowerCase().includes(term)
    );
  });

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  return (
    <div className="space-y-6">
      <Topbar title={lang === 'am' ? 'የተማሪዎች ነጥብና ውጤት መመዝገቢያ' : 'Student Points & Grade Submission'}>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleBatchSave(false)}
            disabled={saving || gradeRows.length === 0}
            className="btn-outline flex items-center gap-1.5 text-xs sm:text-sm"
          >
            <Save size={16} />
            {lang === 'am' ? 'እንደ ረቂቅ አስቀምጥ' : 'Save Draft'}
          </button>
          <button
            onClick={() => handleBatchSave(true)}
            disabled={saving || gradeRows.length === 0}
            className="btn-gold flex items-center gap-1.5 text-xs sm:text-sm font-semibold"
          >
            <Send size={16} />
            {lang === 'am' ? 'ለውሳኔ ላክ (አስረክብ)' : 'Submit Points to Admin'}
          </button>
          {isAdmin && (
            <button
              onClick={handleApproveAll}
              disabled={saving || gradeRows.length === 0}
              className="btn-primary flex items-center gap-1.5 text-xs sm:text-sm"
            >
              <CheckCircle2 size={16} className="text-green-400" />
              {lang === 'am' ? 'ውጤቶችን አፅድቅ' : 'Approve Marks'}
            </button>
          )}
        </div>
      </Topbar>

      {/* Filter and Selection Card */}
      <div className="card p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label className="label">{lang === 'am' ? 'የክፍል ደረጃ' : 'Class Level'}</label>
            <select
              className="input font-medium"
              value={classLevel}
              onChange={(e) => setClassLevel(e.target.value)}
            >
              <option value="CLASS_1_3">{lang === 'am' ? 'ክፍል 1-3 (Class 1-3)' : 'Class 1-3'}</option>
              <option value="CLASS_4_6">{lang === 'am' ? 'ክፍል 4-6 (Class 4-6)' : 'Class 4-6'}</option>
              <option value="CLASS_7_12">{lang === 'am' ? 'ክፍል 7-12 (Class 7-12)' : 'Class 7-12'}</option>
            </select>
          </div>

          <div>
            <label className="label">{lang === 'am' ? 'የትምህርት ዓይነት (Subject)' : 'Subject / Course'}</label>
            <select
              className="input font-semibold text-gold bg-zinc-900 border-zinc-700"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
            >
              {courses.map((c) => {
                const isMine = user?.role === 'TEACHER' && c.teacher?.email === user?.email;
                return (
                  <option key={c.id} value={c.id}>
                    {c.targetGrade ? `[${c.targetGrade}] ` : ''}{c.code} - {lang === 'am' ? c.nameAmharic : c.name} {isMine ? (lang === 'am' ? '★ (የእርስዎ)' : '★ (Assigned to You)') : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="label">{lang === 'am' ? 'የትምህርት ዘመን (ዓ.ም)' : 'Academic Year'}</label>
            <select
              className="input"
              value={ethiopianYear}
              onChange={(e) => setEthiopianYear(Number(e.target.value))}
            >
              <option value={2018}>2018 ዓ.ም</option>
              <option value={2017}>2017 ዓ.ም</option>
              <option value={2019}>2019 ዓ.ም</option>
            </select>
          </div>

          <div>
            <label className="label">{lang === 'am' ? 'መንፈቀ ዓመት (Semester)' : 'Semester'}</label>
            <select
              className="input"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
            >
              <option value="SEMESTER_1">{lang === 'am' ? '1ኛ መንፈቀ ዓመት' : '1st Semester'}</option>
              <option value="SEMESTER_2">{lang === 'am' ? '2ኛ መንፈቀ ዓመት' : '2nd Semester'}</option>
              <option value="YEAR_ROUND">{lang === 'am' ? 'ዓመታዊ ማጠቃለያ' : 'Year Round'}</option>
            </select>
          </div>
        </div>

        {/* Selected Course Sub-Header */}
        {selectedCourse && (
          <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-ink">
                {selectedCourse.code}: {lang === 'am' ? selectedCourse.nameAmharic : selectedCourse.name}
              </span>
              <span className="text-slate">({selectedCourse.classLevel})</span>
            </div>
            <div className="flex items-center gap-4 text-slate">
              <span>{lang === 'am' ? 'ከፍተኛ ነጥብ' : 'Max Score'}: <strong className="text-ink">100%</strong></span>
              <span>{lang === 'am' ? 'ማለፊያ' : 'Passing'}: <strong className="text-ink">50%</strong></span>
              <span>{lang === 'am' ? 'ምዘና' : 'Assessment'}: <strong>20%</strong></span>
              <span>{lang === 'am' ? 'አጋማሽ' : 'Mid'}: <strong>30%</strong></span>
              <span>{lang === 'am' ? 'ማጠቃለያ' : 'Final'}: <strong>40%</strong></span>
              <span>{lang === 'am' ? 'ሥነ ምግባር' : 'Conduct'}: <strong>10%</strong></span>
            </div>
          </div>
        )}
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-lg text-xs font-medium flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs font-bold px-1.5 py-0.5">✕</button>
        </div>
      )}

      {/* Roster & Points Entry Worksheet */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-mist/20">
          <div className="flex items-center gap-2">
            <Award className="text-gold" size={18} />
            <h3 className="font-bold text-sm text-ink">
              {lang === 'am' ? 'የውጤት ማሟያ ዝርዝር' : 'Class Grade Worksheet'}
            </h3>
            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-slate">
              {filteredRows.length} {lang === 'am' ? 'ተማሪዎች' : 'students'}
            </span>
          </div>

          <div className="w-full sm:w-64 relative">
            <Search className="absolute left-3 top-2.5 text-slate" size={14} />
            <input
              type="text"
              placeholder={lang === 'am' ? 'በስም ወይም መለያ ፈልግ…' : 'Search student…'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-8 py-1.5 text-xs"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate">{t('loading')}</div>
        ) : filteredRows.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate">
            {lang === 'am' ? 'በዚህ ክፍል ውስጥ የተመዘገበ ተማሪ አልተገኘም' : 'No students registered in this class level'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr className="bg-mist/30">
                  <th className="w-16">{lang === 'am' ? 'መለያ' : 'ID'}</th>
                  <th className="min-w-[140px]">{lang === 'am' ? 'የተማሪው ስም' : 'Student Name'}</th>
                  <th className="w-24 text-center">{lang === 'am' ? 'ምዘና (20)' : 'Assess (20)'}</th>
                  <th className="w-24 text-center">{lang === 'am' ? 'አጋማሽ (30)' : 'Mid (30)'}</th>
                  <th className="w-24 text-center">{lang === 'am' ? 'ማጠቃለያ (40)' : 'Final (40)'}</th>
                  <th className="w-24 text-center">{lang === 'am' ? 'ሥነ ምግባር (10)' : 'Conduct (10)'}</th>
                  <th className="w-20 text-center font-bold text-ink">{lang === 'am' ? 'ድምር' : 'Total'}</th>
                  <th className="w-16 text-center">{lang === 'am' ? 'ደረጃ' : 'Grade'}</th>
                  <th className="w-16 text-center">{lang === 'am' ? 'ደረጃ' : 'Rank'}</th>
                  <th className="w-24 text-center">{lang === 'am' ? 'ሁኔታ' : 'Status'}</th>
                  <th className="min-w-[140px]">{lang === 'am' ? 'የመምህሩ አስተያየት' : 'Teacher Remark'}</th>
                  <th className="w-16 text-center">{lang === 'am' ? 'ሪፖርት' : 'Card'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredRows.map((row, idx) => {
                  const originalIdx = gradeRows.findIndex((r) => r.studentId === row.studentId);
                  return (
                    <tr key={row.studentId} className="hover:bg-amber-50/20">
                      <td className="font-mono text-xs text-slate">{row.studentCode}</td>
                      <td>
                        <p className="font-medium text-xs text-ink">
                          {lang === 'am' && row.fullNameAmharic ? row.fullNameAmharic : row.fullName}
                        </p>
                        {lang === 'am' && row.fullNameAmharic && (
                          <p className="text-[10px] text-slate">{row.fullName}</p>
                        )}
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          max={20}
                          className="input py-1 text-center font-semibold text-xs"
                          placeholder="0-20"
                          value={row.assessmentScore}
                          onChange={(e) => handleScoreChange(originalIdx, 'assessmentScore', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          max={30}
                          className="input py-1 text-center font-semibold text-xs"
                          placeholder="0-30"
                          value={row.midExamScore}
                          onChange={(e) => handleScoreChange(originalIdx, 'midExamScore', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          max={40}
                          className="input py-1 text-center font-semibold text-xs"
                          placeholder="0-40"
                          value={row.finalExamScore}
                          onChange={(e) => handleScoreChange(originalIdx, 'finalExamScore', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          max={10}
                          className="input py-1 text-center font-semibold text-xs"
                          placeholder="0-10"
                          value={row.conductScore}
                          onChange={(e) => handleScoreChange(originalIdx, 'conductScore', e.target.value)}
                        />
                      </td>
                      <td className="text-center">
                        <span
                          className={`font-bold text-sm ${
                            row.totalScore >= 50 ? 'text-ink' : 'text-red-600'
                          }`}
                        >
                          {row.totalScore}%
                        </span>
                      </td>
                      <td className="text-center">
                        <span className="inline-block px-2 py-0.5 font-bold text-xs bg-gold/20 text-gold rounded border border-gold/40">
                          {row.letterGrade}
                        </span>
                      </td>
                      <td className="text-center font-bold text-xs text-slate">
                        {row.rank ? `${row.rank}ኛ` : '-'}
                      </td>
                      <td className="text-center">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            row.status === 'APPROVED'
                              ? 'bg-green-100 text-green-800'
                              : row.status === 'SUBMITTED'
                              ? 'bg-amber-100 text-amber-800'
                              : row.status === 'DRAFT'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-slate'
                          }`}
                        >
                          {row.status === 'APPROVED'
                            ? lang === 'am' ? 'የፀደቀ' : 'Approved'
                            : row.status === 'SUBMITTED'
                            ? lang === 'am' ? 'የቀረበ' : 'Submitted'
                            : row.status === 'DRAFT'
                            ? lang === 'am' ? 'ረቂቅ' : 'Draft'
                            : lang === 'am' ? 'አዲስ' : 'New'}
                        </span>
                      </td>
                      <td>
                        <input
                          type="text"
                          className="input py-1 text-xs"
                          placeholder={lang === 'am' ? 'አስተያየት…' : 'Note…'}
                          value={row.remarks}
                          onChange={(e) => handleRemarkChange(originalIdx, e.target.value)}
                        />
                      </td>
                      <td className="text-center">
                        <button
                          onClick={() => openReportCard(row.studentId)}
                          className="p-1 text-slate hover:text-gold"
                          title={lang === 'am' ? 'የውጤት ካርድ እይ' : 'View Report Card'}
                        >
                          <FileText size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Report Card Modal */}
      <Modal
        open={reportModalOpen}
        title={lang === 'am' ? 'የተማሪ የትምህርት ውጤት መግለጫ (Report Card)' : 'Student Academic Report Card'}
        onClose={() => setReportModalOpen(false)}
      >
          {reportLoading || !reportData ? (
            <div className="p-8 text-center text-xs text-slate">{t('loading')}</div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-ink text-white border border-gold/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gold uppercase tracking-wider font-bold">
                    {lang === 'am' ? 'መርሃ ህይወት ሰንበት ትምህርት ቤት' : 'Merha Hiwot Sunday School'}
                  </span>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    {lang === 'am' && reportData.student.fullNameAmharic
                      ? reportData.student.fullNameAmharic
                      : reportData.student.fullName}
                  </h3>
                  <p className="text-xs text-white/70">
                    {reportData.student.studentCode} • {reportData.student.class?.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-white/50">{lang === 'am' ? 'አማካይ ውጤት' : 'Overall Average'}</p>
                  <p className="text-xl font-extrabold text-gold">{reportData.averageScore}%</p>
                  <span className="text-xs font-bold px-2 py-0.5 bg-gold/20 text-gold rounded border border-gold/40">
                    {reportData.overallGrade}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="table-base">
                  <thead>
                    <tr className="bg-mist/40">
                      <th>{lang === 'am' ? 'የትምህርት ዓይነት' : 'Subject'}</th>
                      <th className="text-center">{lang === 'am' ? 'ምዘና' : 'Assess'}</th>
                      <th className="text-center">{lang === 'am' ? 'አጋማሽ' : 'Mid'}</th>
                      <th className="text-center">{lang === 'am' ? 'ማጠቃለያ' : 'Final'}</th>
                      <th className="text-center">{lang === 'am' ? 'ሥነ ምግባር' : 'Conduct'}</th>
                      <th className="text-center font-bold text-ink">{lang === 'am' ? 'ጠቅላላ' : 'Total'}</th>
                      <th className="text-center">{lang === 'am' ? 'ደረጃ' : 'Grade'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.grades.map((g) => (
                      <tr key={g.id}>
                        <td className="font-medium text-xs text-ink">
                          {lang === 'am' ? g.course.nameAmharic : g.course.name}
                        </td>
                        <td className="text-center text-xs">{g.assessmentScore}</td>
                        <td className="text-center text-xs">{g.midExamScore}</td>
                        <td className="text-center text-xs">{g.finalExamScore}</td>
                        <td className="text-center text-xs">{g.conductScore}</td>
                        <td className="text-center text-xs font-bold text-ink">{g.totalScore}%</td>
                        <td className="text-center text-xs font-bold text-gold">{g.letterGrade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button onClick={() => window.print()} className="btn-outline flex items-center gap-1.5 text-xs">
                  <Printer size={14} /> {lang === 'am' ? 'አትም (Print)' : 'Print'}
                </button>
                <button onClick={() => setReportModalOpen(false)} className="btn-primary text-xs">
                  {t('close')}
                </button>
              </div>
            </div>
          )}
        </Modal>
    </div>
  );
}
