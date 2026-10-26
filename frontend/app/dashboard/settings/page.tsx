'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useLang } from '@/lib/i18n';
import { getCurrentUser } from '@/lib/auth';
import { Topbar } from '@/components/layout/Topbar';
import { Modal } from '@/components/ui/Modal';
import {
  Sliders,
  Palette,
  BookOpen,
  Users,
  Save,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  PenTool,
  Clock,
  Award,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

interface SystemSettingsData {
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

interface TeacherOption {
  id: string;
  fullName: string;
  email: string;
  role: string;
  signatureUrl?: string | null;
  titleAmharic?: string | null;
  phone?: string | null;
}

interface CourseItem {
  id: string;
  code: string;
  name: string;
  nameAmharic: string;
  classLevel: 'CLASS_1_3' | 'CLASS_4_6' | 'CLASS_7_12';
  targetGrade?: string | null;
  scheduleTime?: string | null;
  maxScore: number;
  passScore: number;
  description?: string | null;
  teacherId?: string | null;
  teacher?: { id: string; fullName: string; email: string };
  _count?: { grades: number };
}

const THEME_PRESETS = [
  { name: 'Imperial Gold & Royal Navy', primary: '#1E3A8A', accent: '#D4AF37' },
  { name: 'Debre Amin Traditional Gold', primary: '#0F172A', accent: '#EAB308' },
  { name: 'Ethiopian Emerald & Gold', primary: '#064E3B', accent: '#F59E0B' },
  { name: 'Deep Burgundy & Parchment', primary: '#7F1D1D', accent: '#FBBF24' },
];

export default function SettingsPage() {
  const { lang, t } = useLang();
  const currentUser = getCurrentUser();

  const [activeTab, setActiveTab] = useState<'branding' | 'courses' | 'staff'>('branding');
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // System Settings State
  const [settings, setSettings] = useState<SystemSettingsData>({
    id: 'default',
    systemNameAmharic: 'መርሃ ህይወት ሰንበት ትምህርት ቤት',
    systemNameEnglish: 'Merha Hiwot Sunday School',
    churchNameAmharic: 'ደብረ አሚን ተክለ ሃይማኖት ቤተ ክርስቲያን',
    churchNameEnglish: 'Debre Amin Teklehaimanot Church',
    mottoAmharic: '«ሕፃናትን ወደ እኔ ይመጡ ዘንድ ተዉአቸው፤ አትከልክሏቸውም፤ የእግዚአብሔር መንግሥት እንደ እነዚህ ላሉት ናትና።» (ማርቆስ 10:14)',
    primaryColorHex: '#1E3A8A',
    accentColorHex: '#D4AF37',
    logoUrl: null,
    currentAcademicYear: 2018,
    defaultPassingScore: 50,
    teachingAdminName: 'ዲ/ን ዮሐንስ',
    churchAdminName: 'መጋቤ ሐዲስ',
  });

  // Courses CRUD State
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseItem | null>(null);

  // Course Form State
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [courseNameAmharic, setCourseNameAmharic] = useState('');
  const [courseClassLevel, setCourseClassLevel] = useState<'CLASS_1_3' | 'CLASS_4_6' | 'CLASS_7_12'>('CLASS_7_12');
  const [courseTargetGrade, setCourseTargetGrade] = useState('');
  const [courseScheduleTime, setCourseScheduleTime] = useState('');
  const [courseTeacherId, setCourseTeacherId] = useState('');
  const [courseMaxScore, setCourseMaxScore] = useState(100);
  const [coursePassScore, setCoursePassScore] = useState(50);
  const [courseDescription, setCourseDescription] = useState('');
  const [savingCourse, setSavingCourse] = useState(false);
  const [courseError, setCourseError] = useState('');

  // Course filter
  const [courseClassFilter, setCourseClassFilter] = useState<string>('ALL');

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    try {
      setLoading(true);
      const [settingsRes, coursesRes, teachersRes] = await Promise.all([
        api.get<SystemSettingsData>('/settings'),
        api.get<CourseItem[]>('/education/courses'),
        api.get<TeacherOption[]>('/users'),
      ]);
      if (settingsRes) setSettings(settingsRes);
      if (coursesRes) setCourses(coursesRes);
      if (teachersRes) setTeachers(teachersRes);
    } catch (err) {
      console.error('Failed to load settings data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSavingSettings(true);
      setSuccessMsg(null);
      await api.patch('/settings', settings);
      setSuccessMsg(lang === 'am' ? 'የስርዓቱ ቅንብሮች በተሳካ ሁኔታ ተሻሽለዋል!' : 'System settings successfully updated!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err?.message || 'Failed to update settings');
    } finally {
      setSavingSettings(false);
    }
  }

  function handleOpenCreateCourse() {
    setEditingCourse(null);
    setCourseCode('');
    setCourseName('');
    setCourseNameAmharic('');
    setCourseClassLevel('CLASS_7_12');
    setCourseTargetGrade('');
    setCourseScheduleTime('');
    setCourseTeacherId('');
    setCourseMaxScore(100);
    setCoursePassScore(50);
    setCourseDescription('');
    setCourseError('');
    setCourseModalOpen(true);
  }

  function handleOpenEditCourse(c: CourseItem) {
    setEditingCourse(c);
    setCourseCode(c.code);
    setCourseName(c.name);
    setCourseNameAmharic(c.nameAmharic);
    setCourseClassLevel(c.classLevel);
    setCourseTargetGrade(c.targetGrade || '');
    setCourseScheduleTime(c.scheduleTime || '');
    setCourseTeacherId(c.teacherId || '');
    setCourseMaxScore(Number(c.maxScore) || 100);
    setCoursePassScore(Number(c.passScore) || 50);
    setCourseDescription(c.description || '');
    setCourseError('');
    setCourseModalOpen(true);
  }

  async function handleSaveCourse(e: React.FormEvent) {
    e.preventDefault();
    setCourseError('');
    setSavingCourse(true);
    try {
      const payload = {
        code: courseCode.trim().toUpperCase(),
        name: courseName.trim(),
        nameAmharic: courseNameAmharic.trim(),
        classLevel: courseClassLevel,
        targetGrade: courseTargetGrade.trim() || undefined,
        scheduleTime: courseScheduleTime.trim() || undefined,
        teacherId: courseTeacherId || undefined,
        maxScore: Number(courseMaxScore),
        passScore: Number(coursePassScore),
        description: courseDescription.trim() || undefined,
      };

      if (editingCourse) {
        await api.patch(`/education/courses/${editingCourse.id}`, payload);
      } else {
        await api.post('/education/courses', payload);
      }

      setCourseModalOpen(false);
      const updatedCourses = await api.get<CourseItem[]>('/education/courses');
      setCourses(updatedCourses);
    } catch (err: any) {
      setCourseError(err?.message || 'Failed to save course');
    } finally {
      setSavingCourse(false);
    }
  }

  async function handleDeleteCourse(id: string) {
    if (!confirm(lang === 'am' ? 'ይህን የትምህርት ዓይነት መሰረዝ እርግጠኛ ነዎት?' : 'Are you sure you want to delete this course?')) {
      return;
    }
    try {
      await api.delete(`/education/courses/${id}`);
      setCourses(courses.filter((c) => c.id !== id));
    } catch (err: any) {
      alert(err?.message || 'Failed to delete course');
    }
  }

  const filteredCourses = courses.filter((c) => {
    if (courseClassFilter !== 'ALL' && c.classLevel !== courseClassFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <Topbar
        title={lang === 'am' ? 'የስርዓት ቅንብሮች እና አስተዳደር' : 'System Settings & Adjustments'}
        subtitle={
          lang === 'am'
            ? 'የሰንበት ትምህርት ቤቱን ስም፣ የቀለም ገጽታ፣ የትምህርት ዓይነቶች (CRUD) እና የመምህራን አስተዳደር'
            : 'Configure church system name, theme colors, courses CRUD, and teacher management'
        }
      />

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            {successMsg}
          </span>
          <button onClick={() => setSuccessMsg(null)} className="text-xs font-bold">✕</button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 gap-2">
        <button
          onClick={() => setActiveTab('branding')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'branding'
              ? 'border-gold text-ink'
              : 'border-transparent text-slate hover:text-ink'
          }`}
        >
          <Palette size={15} className={activeTab === 'branding' ? 'text-gold' : ''} />
          {lang === 'am' ? '1. የስርዓቱ ስያሜና የቀለም ገጽታ' : '1. Branding & Colors'}
        </button>

        <button
          onClick={() => setActiveTab('courses')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'courses'
              ? 'border-gold text-ink'
              : 'border-transparent text-slate hover:text-ink'
          }`}
        >
          <BookOpen size={15} className={activeTab === 'courses' ? 'text-gold' : ''} />
          {lang === 'am' ? '2. የትምህርት ዓይነቶች (Courses CRUD)' : '2. Courses Management'}
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-gold/20 text-gold font-bold">
            {courses.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('staff')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'staff'
              ? 'border-gold text-ink'
              : 'border-transparent text-slate hover:text-ink'
          }`}
        >
          <Users size={15} className={activeTab === 'staff' ? 'text-gold' : ''} />
          {lang === 'am' ? '3. መምህራንና ይፋዊ ፊርማዎች' : '3. Teachers & Signatures'}
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-gray-100 text-slate font-bold">
            {teachers.length}
          </span>
        </button>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-xs text-slate">{t('loading')}</div>
      ) : activeTab === 'branding' ? (
        /* TAB 1: BRANDING & COLORS */
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Column */}
            <div className="lg:col-span-2 space-y-4">
              <div className="card p-5 space-y-4">
                <h3 className="text-sm font-bold text-ink border-b border-gray-100 pb-2">
                  {lang === 'am' ? 'የሰንበት ትምህርት ቤት እና የቤተክርስቲያን ስያሜ' : 'System & Church Names'}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">{lang === 'am' ? 'የሰ/ት/ቤት ስም (በአማርኛ)' : 'Sunday School Name (Amharic)'} *</label>
                    <input
                      type="text"
                      required
                      className="input text-xs w-full font-semibold"
                      value={settings.systemNameAmharic}
                      onChange={(e) => setSettings({ ...settings, systemNameAmharic: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">{lang === 'am' ? 'የሰ/ት/ቤት ስም (በእንግሊዝኛ)' : 'Sunday School Name (English)'} *</label>
                    <input
                      type="text"
                      required
                      className="input text-xs w-full"
                      value={settings.systemNameEnglish}
                      onChange={(e) => setSettings({ ...settings, systemNameEnglish: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">{lang === 'am' ? 'የቤተክርስቲያን ስም (በአማርኛ)' : 'Church Name (Amharic)'} *</label>
                    <input
                      type="text"
                      required
                      className="input text-xs w-full font-semibold"
                      value={settings.churchNameAmharic}
                      onChange={(e) => setSettings({ ...settings, churchNameAmharic: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">{lang === 'am' ? 'የቤተክርስቲያን ስም (በእንግሊዝኛ)' : 'Church Name (English)'} *</label>
                    <input
                      type="text"
                      required
                      className="input text-xs w-full"
                      value={settings.churchNameEnglish}
                      onChange={(e) => setSettings({ ...settings, churchNameEnglish: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">{lang === 'am' ? 'መሪ ጥቅስ / መሪ ቃል' : 'Motto / Bible Verse'}</label>
                  <textarea
                    rows={2}
                    className="input text-xs w-full py-2"
                    value={settings.mottoAmharic || ''}
                    onChange={(e) => setSettings({ ...settings, mottoAmharic: e.target.value })}
                  />
                </div>
              </div>

              {/* Theme & Colors Card */}
              <div className="card p-5 space-y-4">
                <h3 className="text-sm font-bold text-ink border-b border-gray-100 pb-2">
                  {lang === 'am' ? 'የቀለም ገጽታና አርማ (Theme Colors & Palette)' : 'Theme Colors & Presets'}
                </h3>

                <div>
                  <label className="label">{lang === 'am' ? 'ዝግጁ የቀለም ቅንብሮች (Presets)' : 'Preset Color Schemes'}</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {THEME_PRESETS.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() =>
                          setSettings({
                            ...settings,
                            primaryColorHex: p.primary,
                            accentColorHex: p.accent,
                          })
                        }
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          settings.primaryColorHex === p.primary && settings.accentColorHex === p.accent
                            ? 'border-gold ring-2 ring-gold/30 bg-gold/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="w-4 h-4 rounded-full border border-white shadow-sm" style={{ backgroundColor: p.primary }} />
                          <span className="w-4 h-4 rounded-full border border-white shadow-sm" style={{ backgroundColor: p.accent }} />
                        </div>
                        <p className="text-[10px] font-semibold text-ink line-clamp-1">{p.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="label">{lang === 'am' ? 'ዋና ቀለም (Primary Hex)' : 'Primary Color'}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.primaryColorHex}
                        onChange={(e) => setSettings({ ...settings, primaryColorHex: e.target.value })}
                        className="w-10 h-9 rounded cursor-pointer border border-gray-200 p-0.5"
                      />
                      <input
                        type="text"
                        className="input text-xs font-mono uppercase"
                        value={settings.primaryColorHex}
                        onChange={(e) => setSettings({ ...settings, primaryColorHex: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">{lang === 'am' ? 'የክብር ቀለም (Accent / Gold Hex)' : 'Accent / Gold Color'}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.accentColorHex}
                        onChange={(e) => setSettings({ ...settings, accentColorHex: e.target.value })}
                        className="w-10 h-9 rounded cursor-pointer border border-gray-200 p-0.5"
                      />
                      <input
                        type="text"
                        className="input text-xs font-mono uppercase"
                        value={settings.accentColorHex}
                        onChange={(e) => setSettings({ ...settings, accentColorHex: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Academic Defaults */}
              <div className="card p-5 space-y-4">
                <h3 className="text-sm font-bold text-ink border-b border-gray-100 pb-2">
                  {lang === 'am' ? 'የትምህርት ዘመን እና የውጤት ህግጋት' : 'Academic Defaults'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">{lang === 'am' ? 'የአሁኑ የትምህርት ዘመን (ዓ.ም)' : 'Current Academic Year'} *</label>
                    <input
                      type="number"
                      required
                      className="input text-xs w-full font-bold"
                      value={settings.currentAcademicYear}
                      onChange={(e) => setSettings({ ...settings, currentAcademicYear: Number(e.target.value) })}
                    />
                  </div>

                  <div>
                    <label className="label">{lang === 'am' ? 'ነባሪ ማለፊያ ነጥብ (%)' : 'Default Passing Score (%)'} *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={100}
                      className="input text-xs w-full font-bold"
                      value={settings.defaultPassingScore}
                      onChange={(e) => setSettings({ ...settings, defaultPassingScore: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">{lang === 'am' ? 'የትምህርት ክፍል ኃላፊ ስም' : 'Head of Education Name'}</label>
                    <input
                      type="text"
                      className="input text-xs w-full"
                      value={settings.teachingAdminName || ''}
                      onChange={(e) => setSettings({ ...settings, teachingAdminName: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="label">{lang === 'am' ? 'የሰንበት ት/ቤት ሰብሳቢ ስም' : 'Church Sunday School President'}</label>
                    <input
                      type="text"
                      className="input text-xs w-full"
                      value={settings.churchAdminName || ''}
                      onChange={(e) => setSettings({ ...settings, churchAdminName: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="btn-gold flex items-center gap-2 text-xs font-semibold px-6 py-2.5 shadow-md"
                >
                  <Save size={16} />
                  {savingSettings ? t('saving') : (lang === 'am' ? 'ቅንብሮችን መዝግብ' : 'Save System Settings')}
                </button>
              </div>
            </div>

            {/* Live Preview Column */}
            <div className="space-y-4">
              <div className="card p-5 border-2 border-gold/40 shadow-lg">
                <span className="text-[10px] font-bold tracking-wider uppercase text-gold block mb-3">
                  {lang === 'am' ? 'ቀጥታ እይታ (Live Church Letterhead Preview)' : 'Live Preview'}
                </span>

                <div
                  className="p-5 rounded-2xl text-white shadow-xl transition-all"
                  style={{ backgroundColor: settings.primaryColorHex }}
                >
                  <div className="text-center space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: settings.accentColorHex }}>
                      {settings.churchNameAmharic}
                    </p>
                    <h2 className="text-lg font-extrabold text-white leading-tight">
                      {settings.systemNameAmharic}
                    </h2>
                    <p className="text-xs text-white/80 font-serif">
                      {settings.systemNameEnglish}
                    </p>
                    {settings.mottoAmharic && (
                      <p className="text-[10px] italic text-white/60 pt-2 border-t border-white/10 mt-2">
                        {settings.mottoAmharic}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-[11px]">
                    <span className="text-white/70">
                      {lang === 'am' ? 'የትምህርት ዘመን' : 'Year'}: <strong className="text-white">{settings.currentAcademicYear} ዓ.ም</strong>
                    </span>
                    <span className="text-white/70">
                      {lang === 'am' ? 'ማለፊያ' : 'Pass'}: <strong className="text-white">{settings.defaultPassingScore}%</strong>
                    </span>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-mist/40 rounded-xl text-xs space-y-2 text-slate">
                  <div className="flex items-center justify-between">
                    <span>{lang === 'am' ? 'የትምህርት ኃላፊ' : 'Education Head'}:</span>
                    <strong className="text-ink">{settings.teachingAdminName || '—'}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{lang === 'am' ? 'የሰ/ት/ቤት ሰብሳቢ' : 'President'}:</span>
                    <strong className="text-ink">{settings.churchAdminName || '—'}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      ) : activeTab === 'courses' ? (
        /* TAB 2: COURSES CRUD */
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate">{lang === 'am' ? 'ክፍል ምረጥ:' : 'Filter Level:'}</span>
              <div className="flex gap-1.5">
                {[
                  { id: 'ALL', labelAm: 'ሁሉም (All)', labelEn: 'All' },
                  { id: 'CLASS_1_3', labelAm: 'ክፍል 1-3', labelEn: '1-3' },
                  { id: 'CLASS_4_6', labelAm: 'ክፍል 4-6', labelEn: '4-6' },
                  { id: 'CLASS_7_12', labelAm: 'ክፍል 7-12', labelEn: '7-12' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setCourseClassFilter(f.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      courseClassFilter === f.id
                        ? 'bg-ink text-white'
                        : 'bg-gray-100 text-slate hover:bg-gray-200'
                    }`}
                  >
                    {lang === 'am' ? f.labelAm : f.labelEn}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleOpenCreateCourse}
              className="btn-gold flex items-center gap-1.5 text-xs font-semibold shadow-sm"
            >
              <Plus size={15} />
              {lang === 'am' ? 'አዲስ ትምህርት መዝግብ (Add Course)' : 'Add New Course'}
            </button>
          </div>

          {/* Courses Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr className="bg-mist/30">
                    <th className="w-20">{lang === 'am' ? 'ኮድ' : 'Code'}</th>
                    <th>{lang === 'am' ? 'የትምህርት ዓይነት ስም' : 'Course Name'}</th>
                    <th>{lang === 'am' ? 'የክፍል ደረጃ' : 'Class Level'}</th>
                    <th>{lang === 'am' ? 'ዒላማ ክፍል' : 'Target Grade'}</th>
                    <th>{lang === 'am' ? 'የክፍለ ጊዜ ሰዓት' : 'Schedule'}</th>
                    <th>{lang === 'am' ? 'የተመደበለት መምህር' : 'Assigned Teacher'}</th>
                    <th className="text-center">{lang === 'am' ? 'ማለፊያ' : 'Pass'}</th>
                    <th className="text-right">{lang === 'am' ? 'ድርጊት' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCourses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-xs text-slate">
                        {lang === 'am' ? 'ምንም የትምህርት ዓይነት አልተገኘም' : 'No courses found'}
                      </td>
                    </tr>
                  ) : (
                    filteredCourses.map((c) => (
                      <tr key={c.id} className="hover:bg-amber-50/20">
                        <td className="font-mono font-bold text-xs text-gold">{c.code}</td>
                        <td>
                          <p className="font-semibold text-xs text-ink">{c.nameAmharic}</p>
                          <p className="text-[10px] text-slate">{c.name}</p>
                        </td>
                        <td>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800">
                            {c.classLevel}
                          </span>
                        </td>
                        <td className="text-xs font-medium text-slate">
                          {c.targetGrade || '—'}
                        </td>
                        <td className="text-xs text-slate">
                          {c.scheduleTime ? (
                            <span className="flex items-center gap-1">
                              <Clock size={11} className="text-gold" />
                              {c.scheduleTime}
                            </span>
                          ) : '—'}
                        </td>
                        <td>
                          {c.teacher ? (
                            <span className="font-medium text-xs text-ink">
                              {c.teacher.fullName}
                            </span>
                          ) : (
                            <span className="text-xs text-slate italic">
                              {lang === 'am' ? 'መምህር አልተመደበም' : 'Unassigned'}
                            </span>
                          )}
                        </td>
                        <td className="text-center text-xs font-semibold text-ink">
                          {c.passScore}%
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEditCourse(c)}
                              className="p-1.5 hover:text-gold text-slate transition-colors"
                              title="Edit Course"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteCourse(c.id)}
                              className="p-1.5 hover:text-rose-600 text-slate transition-colors"
                              title="Delete Course"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* TAB 3: TEACHERS & SIGNATURES */
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate">
              {lang === 'am'
                ? 'በሰንበት ትምህርት ቤቱ የሚያስተምሩ መምህራን እና በሰርተፊኬት ላይ የሚፈርሙ አስተዳዳሪዎች ዝርዝር'
                : 'Sunday School teachers and administrative signatories'}
            </p>
            <Link
              href="/dashboard/users"
              className="btn-gold flex items-center gap-1.5 text-xs font-semibold"
            >
              <Users size={15} />
              {lang === 'am' ? 'መምህራንን በሙሉ እይና አዲስ መዝግብ' : 'Manage All Staff & Register'}
              <ExternalLink size={12} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teachers.map((t) => (
              <div key={t.id} className="card p-4 space-y-3 relative overflow-hidden">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gold/15 text-gold font-bold flex items-center justify-center text-sm border border-gold/30">
                      {t.fullName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-ink">{t.fullName}</h4>
                      <p className="text-xs text-slate">{t.email}</p>
                      {t.titleAmharic && (
                        <p className="text-[11px] text-gold font-medium mt-0.5">{t.titleAmharic}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-mist text-slate">
                    {t.role}
                  </span>
                </div>

                {t.phone && (
                  <p className="text-xs text-slate flex items-center gap-1">
                    <span>ስልክ:</span> <strong className="text-ink">{t.phone}</strong>
                  </p>
                )}

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {t.signatureUrl ? (
                      <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                        <CheckCircle2 size={12} className="text-emerald-600" />
                        {lang === 'am' ? 'ዲጂታል ፊርማ አለው' : 'Signature Attached'}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate/70 italic flex items-center gap-1">
                        <PenTool size={11} /> {lang === 'am' ? 'ፊርማ አልተመዘገበም' : 'No signature'}
                      </span>
                    )}
                  </div>
                  <Link
                    href="/dashboard/users"
                    className="text-xs text-gold hover:underline font-semibold flex items-center gap-0.5"
                  >
                    {lang === 'am' ? 'አስተካክል' : 'Edit'}
                    <ChevronRight size={13} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Course Create/Edit Modal */}
      <Modal
        open={courseModalOpen}
        title={
          editingCourse
            ? `${lang === 'am' ? 'የትምህርት ዓይነት አሻሽል' : 'Edit Course'}: ${editingCourse.nameAmharic}`
            : lang === 'am'
            ? 'አዲስ የትምህርት ዓይነት መዝግብ'
            : 'Add New Course / Curriculum'
        }
        onClose={() => setCourseModalOpen(false)}
      >
        <form onSubmit={handleSaveCourse} className="space-y-4 max-h-[80vh] overflow-y-auto px-1">
          {courseError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {courseError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">{lang === 'am' ? 'የትምህርት ኮድ (Code)' : 'Course Code'} *</label>
              <input
                type="text"
                required
                className="input text-xs w-full uppercase font-mono"
                placeholder="ለምሳሌ፡ ETH-101"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
              />
            </div>

            <div>
              <label className="label">{lang === 'am' ? 'የክፍል ደረጃ (Level)' : 'Class Level'} *</label>
              <select
                className="select text-xs w-full"
                value={courseClassLevel}
                onChange={(e) => setCourseClassLevel(e.target.value as any)}
              >
                <option value="CLASS_1_3">{lang === 'am' ? 'ክፍል 1-3' : 'Class 1-3'}</option>
                <option value="CLASS_4_6">{lang === 'am' ? 'ክፍል 4-6' : 'Class 4-6'}</option>
                <option value="CLASS_7_12">{lang === 'am' ? 'ክፍል 7-12' : 'Class 7-12'}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">{lang === 'am' ? 'የትምህርቱ ስም (በአማርኛ)' : 'Course Name (Amharic)'} *</label>
              <input
                type="text"
                required
                className="input text-xs w-full font-semibold"
                placeholder="ለምሳሌ፡ ስነ ምግባር ወይም መጽሐፍ ቅዱስ ጥናት"
                value={courseNameAmharic}
                onChange={(e) => setCourseNameAmharic(e.target.value)}
              />
            </div>

            <div>
              <label className="label">{lang === 'am' ? 'የትምህርቱ ስም (በእንግሊዝኛ)' : 'Course Name (English)'} *</label>
              <input
                type="text"
                required
                className="input text-xs w-full"
                placeholder="e.g. Christian Ethics or Bible Study"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">{lang === 'am' ? 'የሚያስተምረው መምህር' : 'Assigned Teacher'}</label>
              <select
                className="select text-xs w-full"
                value={courseTeacherId}
                onChange={(e) => setCourseTeacherId(e.target.value)}
              >
                <option value="">{lang === 'am' ? '-- መምህር ይምረጡ --' : '-- Select Teacher --'}</option>
                {teachers
                  .filter((t) => t.role === 'TEACHER' || t.role === 'ADMINISTRATOR')
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.email})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="label">{lang === 'am' ? 'ዒላማ ክፍል (Target Grade)' : 'Target Grade'}</label>
              <input
                type="text"
                className="input text-xs w-full"
                placeholder="ለምሳሌ፡ 7ኛ እና 8ኛ ክፍል"
                value={courseTargetGrade}
                onChange={(e) => setCourseTargetGrade(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">{lang === 'am' ? 'የክፍለ ጊዜ ሰዓት (Schedule)' : 'Schedule Time'}</label>
              <input
                type="text"
                className="input text-xs w-full"
                placeholder="ለምሳሌ፡ እሁድ 3:00 - 4:00"
                value={courseScheduleTime}
                onChange={(e) => setCourseScheduleTime(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">{lang === 'am' ? 'ከፍተኛ ነጥብ' : 'Max Score'}</label>
                <input
                  type="number"
                  required
                  min={10}
                  max={200}
                  className="input text-xs w-full font-bold"
                  value={courseMaxScore}
                  onChange={(e) => setCourseMaxScore(Number(e.target.value))}
                />
              </div>

              <div>
                <label className="label">{lang === 'am' ? 'ማለፊያ (%)' : 'Pass Score'}</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={100}
                  className="input text-xs w-full font-bold"
                  value={coursePassScore}
                  onChange={(e) => setCoursePassScore(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="label">{lang === 'am' ? 'የትምህርቱ ማብራሪያ / መግለጫ' : 'Description / Curriculum Syllabus'}</label>
            <textarea
              rows={2}
              className="input text-xs w-full py-2"
              placeholder={lang === 'am' ? 'የትምህርቱ አጭር መግለጫ…' : 'Brief curriculum summary…'}
              value={courseDescription}
              onChange={(e) => setCourseDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setCourseModalOpen(false)}
              className="btn-outline text-xs"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={savingCourse || !courseCode || !courseNameAmharic}
              className="btn-gold text-xs font-semibold"
            >
              {savingCourse ? t('saving') : t('save')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
