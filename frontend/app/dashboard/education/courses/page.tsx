'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useLang } from '@/lib/i18n';
import { getCurrentUser } from '@/lib/auth';
import { Topbar } from '@/components/layout/Topbar';
import { Modal } from '@/components/ui/Modal';
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  GraduationCap,
  Clock,
  User,
  Sparkles,
} from 'lucide-react';

interface TeacherUser {
  id: string;
  fullName: string;
  email: string;
}

interface Course {
  id: string;
  code: string;
  name: string;
  nameAmharic: string;
  classLevel: 'CLASS_1_3' | 'CLASS_4_6' | 'CLASS_7_12';
  targetGrade?: string | null;
  scheduleTime?: string | null;
  semester?: 'SEMESTER_1' | 'SEMESTER_2' | 'YEAR_ROUND';
  maxScore: number;
  passScore: number;
  description: string | null;
  isActive: boolean;
  teacherId?: string | null;
  teacher?: { id: string; fullName: string; email: string };
  _count?: { grades: number };
}

export default function CoursesPage() {
  const { t, lang } = useLang();
  const user = getCurrentUser();
  const isAdmin = user?.role === 'ADMINISTRATOR';
  const isTeacher = user?.role === 'TEACHER';

  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLevel, setActiveLevel] = useState<string>('ALL');
  const [onlyMyCourses, setOnlyMyCourses] = useState<boolean>(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [nameAmharic, setNameAmharic] = useState('');
  const [classLevel, setClassLevel] = useState<'CLASS_1_3' | 'CLASS_4_6' | 'CLASS_7_12'>('CLASS_4_6');
  const [targetGrade, setTargetGrade] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [semester, setSemester] = useState<'SEMESTER_1' | 'SEMESTER_2' | 'YEAR_ROUND'>('SEMESTER_1');
  const [teacherId, setTeacherId] = useState('');
  const [maxScore, setMaxScore] = useState(100);
  const [passScore, setPassScore] = useState(50);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    loadCourses();
    loadTeachers();
  }, []);

  async function loadCourses() {
    try {
      setLoading(true);
      const res = await api.get<Course[]>('/education/courses');
      setCourses(res);
    } catch (err) {
      console.error('Failed to load courses:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadTeachers() {
    try {
      const res = await api.get<TeacherUser[]>('/users?role=TEACHER');
      setTeachers(res);
    } catch (err) {
      console.error('Failed to load teachers:', err);
    }
  }

  function handleOpenCreate() {
    setEditingCourse(null);
    setCode('');
    setName('');
    setNameAmharic('');
    setClassLevel('CLASS_4_6');
    setTargetGrade('4ኛ ክፍል');
    setScheduleTime('እሁድ 3:30 - 4:30');
    setSemester('SEMESTER_1');
    setTeacherId('');
    setMaxScore(100);
    setPassScore(50);
    setDescription('');
    setModalOpen(true);
  }

  function handleOpenEdit(c: Course) {
    setEditingCourse(c);
    setCode(c.code);
    setName(c.name);
    setNameAmharic(c.nameAmharic);
    setClassLevel(c.classLevel);
    setTargetGrade(c.targetGrade || '');
    setScheduleTime(c.scheduleTime || '');
    setSemester(c.semester || 'SEMESTER_1');
    setTeacherId(c.teacherId || c.teacher?.id || '');
    setMaxScore(Number(c.maxScore));
    setPassScore(Number(c.passScore));
    setDescription(c.description || '');
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !nameAmharic.trim()) return;

    try {
      setSubmitting(true);
      if (editingCourse) {
        await api.patch(`/education/courses/${editingCourse.id}`, {
          name,
          nameAmharic,
          classLevel,
          targetGrade: targetGrade.trim() || undefined,
          scheduleTime: scheduleTime.trim() || undefined,
          semester,
          teacherId: teacherId || undefined,
          maxScore,
          passScore,
          description,
        });
        setNotification(lang === 'am' ? 'የትምህርት ዓይነት ተሻሽሏል' : 'Course updated successfully');
      } else {
        await api.post('/education/courses', {
          code,
          name,
          nameAmharic,
          classLevel,
          targetGrade: targetGrade.trim() || undefined,
          scheduleTime: scheduleTime.trim() || undefined,
          semester,
          teacherId: teacherId || undefined,
          maxScore,
          passScore,
          description,
        });
        setNotification(lang === 'am' ? 'አዲስ የትምህርት ዓይነት ተመዝግቧል' : 'Course created successfully');
      }
      setModalOpen(false);
      await loadCourses();
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error('Failed to save course:', err);
      alert(lang === 'am' ? 'ትምህርቱን መመዝገብ አልተቻለም' : 'Failed to save course');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (
      !confirm(
        lang === 'am'
          ? 'እርግጠኛ ነዎት ይህን የትምህርት ዓይነት ማቦዘን ይፈልጋሉ?'
          : 'Are you sure you want to deactivate this course?'
      )
    )
      return;

    try {
      await api.delete(`/education/courses/${id}`);
      await loadCourses();
      setNotification(lang === 'am' ? 'የትምህርት ዓይነት ተሰርዟል' : 'Course removed');
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error('Failed to delete course:', err);
      alert(lang === 'am' ? 'ማቦዘን አልተቻለም' : 'Failed to deactivate course');
    }
  }

  const filteredCourses = courses.filter((c) => {
    if (activeLevel !== 'ALL' && c.classLevel !== activeLevel) return false;
    if (onlyMyCourses && isTeacher) {
      return c.teacher?.email === user?.email;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <Topbar
        title={lang === 'am' ? 'ስርዓተ ትምህርት እና የሳምንቱ ፕሮግራም' : 'Curriculum & Course Schedule'}
        subtitle={
          lang === 'am'
            ? 'የሰንበት ትምህርት ቤት ሳምንታዊ የትምህርት ሰሌዳ፣ ክፍሎችና የተመደቡ መምህራን'
            : 'Sunday School official weekly courses, schedules, and assigned teachers'
        }
      >
        {isAdmin && (
          <button
            onClick={handleOpenCreate}
            className="btn-gold flex items-center gap-1.5 text-xs font-semibold"
          >
            <Plus size={15} />
            {lang === 'am' ? 'አዲስ ትምህርት መዝግብ' : 'Add Course'}
          </button>
        )}
      </Topbar>

      {/* Notification Toast */}
      {notification && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
          <CheckCircle size={15} className="text-emerald-600" />
          <span>{notification}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate font-medium mr-1">{lang === 'am' ? 'የክፍል ደረጃ' : 'Level'}:</span>
          {[
            { key: 'ALL', am: 'ሁሉም (All)', en: 'All' },
            { key: 'CLASS_4_6', am: 'ማዕከላውያን (4ኛ እና 5ኛ ክፍል)', en: 'Intermediate (Grades 4-5)' },
            { key: 'CLASS_7_12', am: 'ወጣቶች (7ኛ ክፍል)', en: 'Youth (Grade 7)' },
            { key: 'CLASS_1_3', am: 'ክፍል 1-3 (ሕፃናት)', en: 'Class 1-3' },
          ].map((lvl) => (
            <button
              key={lvl.key}
              onClick={() => setActiveLevel(lvl.key)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeLevel === lvl.key
                  ? 'bg-gold text-ink font-bold shadow-xs'
                  : 'bg-mist text-slate hover:text-ink'
              }`}
            >
              {lang === 'am' ? lvl.am : lvl.en}
            </button>
          ))}
        </div>

        {isTeacher && (
          <label className="flex items-center gap-2 text-xs font-medium text-ink cursor-pointer bg-gold/10 px-3 py-1.5 rounded-lg border border-gold/30">
            <input
              type="checkbox"
              checked={onlyMyCourses}
              onChange={(e) => setOnlyMyCourses(e.target.checked)}
              className="rounded text-gold focus:ring-gold"
            />
            <span>{t('myCourses')}</span>
          </label>
        )}
      </div>

      {/* Courses Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate">{t('loading')}</div>
      ) : filteredCourses.length === 0 ? (
        <div className="card p-12 text-center text-xs text-slate">
          {lang === 'am' ? 'ምንም የትምህርት ዓይነት አልተገኘም' : 'No courses found'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCourses.map((c) => {
            const isAssignedToMe = isTeacher && c.teacher?.email === user?.email;
            return (
              <div
                key={c.id}
                className={`card p-5 transition-all flex flex-col justify-between ${
                  isAssignedToMe
                    ? 'border-gold ring-1 ring-gold/40 bg-gold/5'
                    : 'hover:border-gold/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-bold text-gold bg-ink px-2 py-0.5 rounded">
                      {c.code}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {c.targetGrade && (
                        <span className="text-[11px] font-bold text-ink bg-gold/20 px-2 py-0.5 rounded border border-gold/40">
                          {c.targetGrade}
                        </span>
                      )}
                      {isAssignedToMe && (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
                          <Sparkles size={11} /> {lang === 'am' ? 'የእርስዎ' : 'Yours'}
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="font-bold text-base text-ink">{c.nameAmharic}</h3>
                  <p className="text-xs text-slate font-medium mt-0.5">{c.name}</p>

                  {/* Schedule Time Pill */}
                  {c.scheduleTime && (
                    <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 bg-ink text-white rounded text-xs font-medium">
                      <Clock size={12} className="text-gold" />
                      <span>{c.scheduleTime}</span>
                    </div>
                  )}

                  {c.description && (
                    <p className="text-xs text-slate/80 mt-2 line-clamp-2 leading-relaxed">
                      {c.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-slate">
                  <div className="space-y-0.5">
                    <p>
                      {lang === 'am' ? 'ማለፊያ ነጥብ' : 'Pass'}:{' '}
                      <strong className="text-ink">{c.passScore}%</strong> / {c.maxScore}%
                    </p>
                    <div className="flex items-center gap-1 text-[11px] text-slate">
                      <User size={12} className="text-gold" />
                      {c.teacher ? (
                        <strong className="text-ink">{c.teacher.fullName}</strong>
                      ) : (
                        <span className="italic">{lang === 'am' ? 'የጋራ / መዝሙር' : 'General / Hymns'}</span>
                      )}
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="p-1 text-slate hover:text-gold"
                        title="Edit"
                      >
                        <Edit size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-1 text-slate hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Course Modal */}
      <Modal
        open={modalOpen}
        title={
          editingCourse
            ? lang === 'am' ? 'የትምህርት ዓይነት አሻሽል' : 'Edit Course'
            : lang === 'am' ? 'አዲስ የትምህርት ዓይነት መዝግብ' : 'Add New Course'
        }
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{lang === 'am' ? 'የትምህርት መለያ ኮድ (Code)' : 'Course Code'} *</label>
              <input
                type="text"
                required
                disabled={!!editingCourse}
                placeholder="e.g. ETH-G4"
                className="input uppercase text-xs w-full"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <div>
              <label className="label">{lang === 'am' ? 'የክፍል ደረጃ (Level)' : 'Class Level'} *</label>
              <select
                className="select text-xs w-full"
                value={classLevel}
                onChange={(e) => setClassLevel(e.target.value as any)}
              >
                <option value="CLASS_4_6">{lang === 'am' ? 'ማዕከላውያን (4ኛ - 5ኛ)' : 'Intermediate (Class 4-6)'}</option>
                <option value="CLASS_7_12">{lang === 'am' ? 'ወጣቶች (7ኛ ክፍል)' : 'Youth (Class 7-12)'}</option>
                <option value="CLASS_1_3">{lang === 'am' ? 'ሕፃናት (1ኛ - 3ኛ)' : 'Class 1-3'}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{lang === 'am' ? 'የክፍል መጠሪያ' : 'Target Grade'} *</label>
              <input
                type="text"
                placeholder="e.g. 4ኛ ክፍል or ወጣቶች"
                className="input text-xs w-full"
                value={targetGrade}
                onChange={(e) => setTargetGrade(e.target.value)}
              />
            </div>
            <div>
              <label className="label">{lang === 'am' ? 'የትምህርት ሰዓት' : 'Schedule Time'} *</label>
              <input
                type="text"
                placeholder="e.g. እሁድ 3:30 - 4:30"
                className="input text-xs w-full"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label">{lang === 'am' ? 'የትምህርቱ ስም (በአማርኛ)' : 'Course Name (Amharic)'} *</label>
            <input
              type="text"
              required
              placeholder="ለምሳሌ፡ ክርስቲያናዊ ስነምግባር"
              className="input text-xs w-full"
              value={nameAmharic}
              onChange={(e) => setNameAmharic(e.target.value)}
            />
          </div>

          <div>
            <label className="label">{lang === 'am' ? 'የትምህርቱ ስም (በእንግሊዝኛ)' : 'Course Name (English)'} *</label>
            <input
              type="text"
              required
              placeholder="e.g. Christian Ethics"
              className="input text-xs w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{lang === 'am' ? 'የተመደበ መምህር' : 'Assigned Teacher'}</label>
              <select
                className="select text-xs w-full"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
              >
                <option value="">{lang === 'am' ? '-- መምህር ምረጥ --' : '-- Select Teacher --'}</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{lang === 'am' ? 'መንፈቀ ዓመት (Semester)' : 'Semester'}</label>
              <select
                className="select text-xs w-full"
                value={semester}
                onChange={(e) => setSemester(e.target.value as any)}
              >
                <option value="SEMESTER_1">{lang === 'am' ? '1ኛ መንፈቀ ዓመት' : '1st Semester'}</option>
                <option value="SEMESTER_2">{lang === 'am' ? '2ኛ መንፈቀ ዓመት' : '2nd Semester'}</option>
                <option value="YEAR_ROUND">{lang === 'am' ? 'ዓመቱን ሙሉ' : 'Year Round'}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{lang === 'am' ? 'ጠቅላላ ነጥብ' : 'Max Score'}</label>
              <input
                type="number"
                className="input text-xs w-full"
                value={maxScore}
                onChange={(e) => setMaxScore(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label">{lang === 'am' ? 'ማለፊያ ነጥብ' : 'Pass Score'}</label>
              <input
                type="number"
                className="input text-xs w-full"
                value={passScore}
                onChange={(e) => setPassScore(Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label className="label">{lang === 'am' ? 'ማብራሪያ' : 'Description'}</label>
            <textarea
              rows={2}
              className="input text-xs w-full"
              placeholder={lang === 'am' ? 'ስለ ትምህርቱ ይዘት አጭር ማብራሪያ…' : 'Course description…'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="btn-outline text-xs"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting || !code.trim() || !name.trim() || !nameAmharic.trim()}
              className="btn-gold text-xs font-semibold"
            >
              {submitting ? t('saving') : t('save')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
