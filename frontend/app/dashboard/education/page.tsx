'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useLang } from '@/lib/i18n';
import { getCurrentUser } from '@/lib/auth';
import { Topbar } from '@/components/layout/Topbar';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import {
  GraduationCap,
  Award,
  Scroll,
  MessageSquare,
  BookOpen,
  Pin,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface Stats {
  totalStudents: number;
  totalCourses: number;
  totalGrades: number;
  approvedGrades: number;
  submittedGrades: number;
  draftGrades: number;
  totalCertificates: number;
  avgScore: number;
  passRate: number;
  recentMessages: {
    id: string;
    title: string;
    content: string;
    category: string;
    targetAudience: string;
    isPinned: boolean;
    createdAt: string;
    sender: { fullName: string; role: string };
  }[];
  recentGrades: {
    id: string;
    totalScore: number;
    letterGrade: string;
    status: 'DRAFT' | 'SUBMITTED' | 'APPROVED';
    remarks: string | null;
    student: { fullName: string; fullNameAmharic: string | null; studentCode: string };
    course: { name: string; nameAmharic: string; code: string };
  }[];
  classGroups: {
    id: string;
    name: string;
    level: string;
    studentCount: number;
  }[];
}

export default function EducationDashboardPage() {
  const { t, lang } = useLang();
  const user = getCurrentUser();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setLoading(true);
      const res = await api.get<Stats>('/education/dashboard/stats');
      setStats(res);
    } catch (err) {
      console.error('Failed to load education stats:', err);
    } finally {
      setLoading(false);
    }
  }

  const categoryLabels: Record<string, { am: string; en: string }> = {
    GENERAL: { am: 'አጠቃላይ', en: 'General' },
    CURRICULUM: { am: 'ስርዓተ ትምህርት', en: 'Curriculum' },
    EXAM_SCHEDULE: { am: 'የፈተና ሰሌዳ', en: 'Exam Schedule' },
    STUDENT_AFFAIR: { am: 'የተማሪዎች ጉዳይ', en: 'Student Affairs' },
    MEETING: { am: 'ስብሰባ', en: 'Meeting' },
    URGENT: { am: 'አስቸኳይ', en: 'Urgent' },
  };

  return (
    <div className="space-y-6">
      <Topbar title={lang === 'am' ? 'የትምህርት ክፍል ዳሽቦርድ' : 'Education Department Dashboard'}>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/education/grades"
            className="btn-gold flex items-center gap-1.5 text-xs sm:text-sm py-2 px-3 sm:px-4"
          >
            <Award size={16} />
            {lang === 'am' ? 'ነጥብ አስገባ' : 'Submit Points'}
          </Link>
          <Link
            href="/dashboard/education/certificates"
            className="btn-primary flex items-center gap-1.5 text-xs sm:text-sm py-2 px-3 sm:px-4"
          >
            <Scroll size={16} />
            {lang === 'am' ? 'ሰርተፊኬት አዘጋጅ' : 'Certificates & Print'}
          </Link>
          <Link
            href="/dashboard/education/communication"
            className="btn-outline flex items-center gap-1.5 text-xs sm:text-sm py-2 px-3 sm:px-4"
          >
            <MessageSquare size={16} />
            {lang === 'am' ? 'መልእክት / ማስታወቂያ' : 'Notice Board'}
          </Link>
        </div>
      </Topbar>

      {/* Role Banner */}
      <div className="bg-gradient-to-r from-ink via-zinc-900 to-black text-white p-5 rounded-card shadow-md border border-gold/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/40 flex items-center justify-center text-gold">
            <GraduationCap size={28} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>{lang === 'am' ? 'ደብረ መዊዕ መርሃ ህይወት ሰንበት ትምህርት ቤት' : 'Debre Mewee Merha Hiwot Sunday School'}</span>
              <span className="text-xs bg-gold/20 text-gold px-2.5 py-0.5 rounded-full border border-gold/30">
                {lang === 'am' ? 'የትምህርት ክፍል' : 'Academics'}
              </span>
            </h2>
            <p className="text-xs text-white/70 mt-0.5">
              {lang === 'am'
                ? 'በመምህራን እና በአስተዳደሩ መካከል የተማሪዎችን ውጤት ለመመዝገብ፣ ለመገናኘትና ሰርተፊኬቶችን ለማዘጋጀት የተዘጋጀ'
                : 'Dedicated academic system for teachers and administration to submit points, communicate, and generate certificates.'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/50">{lang === 'am' ? 'የገቡበት መለያ' : 'Logged in as'}:</p>
          <p className="text-sm font-semibold text-gold">{user?.fullName}</p>
          <span className="text-[11px] bg-white/10 px-2 py-0.5 rounded text-white/80">
            {user?.role ? t(user.role) : ''}
          </span>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label={lang === 'am' ? 'ጠቅላላ ተማሪዎች' : 'Total Students'}
          value={stats?.totalStudents ?? (loading ? '…' : 0)}
          sub={lang === 'am' ? 'በ3ቱ የክፍል ደረጃዎች' : 'Across 3 Class Levels'}
        />
        <StatCard
          label={lang === 'am' ? 'የትምህርት ዓይነቶች' : 'Active Courses'}
          value={stats?.totalCourses ?? (loading ? '…' : 0)}
          sub={lang === 'am' ? 'የሰንበት ት/ቤት ስርዓተ ትምህርት' : 'Sunday School Curriculum'}
        />
        <StatCard
          label={lang === 'am' ? 'አማካይ ውጤት' : 'Class Average Score'}
          value={stats ? `${stats.avgScore}%` : (loading ? '…' : '0%')}
          sub={stats ? `${lang === 'am' ? 'የማለፍ ምጣኔ' : 'Pass Rate'}: ${stats.passRate}%` : ''}
        />
        <StatCard
          label={lang === 'am' ? 'የተሰጡ ሰርተፊኬቶች' : 'Certificates Issued'}
          value={stats?.totalCertificates ?? (loading ? '…' : 0)}
          sub={lang === 'am' ? 'የክብርና የምረቃ ሰነዶች' : 'Honor & Graduation'}
        />
      </div>

      {/* Main Grid: Communications & Submissions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Announcements & Class Levels */}
        <div className="lg:col-span-2 space-y-6">
          {/* Official Schedule Timeline Card */}
          <div className="card p-5 border-l-4 border-l-gold">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gold/10 text-gold flex items-center justify-center">
                  <Clock size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-ink text-sm sm:text-base">
                    {lang === 'am' ? 'ይፋዊ የትምህርት ፕሮግራም (Official Timetable)' : 'Official Class Timetable'}
                  </h3>
                  <p className="text-xs text-slate">
                    {lang === 'am' ? 'የማዕከላውያን እና የወጣቶች ሳምንታዊ የትምህርት ክፍለ ጊዜያት' : 'Intermediate & Youth weekly curriculum schedule'}
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-gold bg-ink px-2.5 py-1 rounded">
                2018 ዓ.ም
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ማዕከላውያን */}
              <div className="bg-mist/30 rounded-xl p-3.5 border border-gray-100 space-y-3">
                <div className="flex items-center justify-between border-b border-gray-200/60 pb-2">
                  <span className="font-bold text-xs text-ink uppercase tracking-wider flex items-center gap-1.5">
                    <GraduationCap size={15} className="text-gold" />
                    {lang === 'am' ? 'ማዕከላውያን (4ኛ እና 5ኛ ክፍል)' : 'Intermediate (Grades 4-5)'}
                  </span>
                  <span className="text-[10px] font-semibold text-slate bg-white px-2 py-0.5 rounded border border-gray-200">
                    ቅዳሜና እሁድ
                  </span>
                </div>

                <div className="text-xs space-y-2">
                  <div className="flex items-center justify-between text-slate">
                    <span className="font-medium text-ink">ቅዳሜ 8:00 - 10:00</span>
                    <span className="text-gold font-semibold">መዝሙር</span>
                  </div>

                  <div className="pt-1.5 border-t border-dashed border-gray-200">
                    <p className="font-bold text-[11px] text-ink mb-1">እሁድ - 4ኛ ክፍል፡</p>
                    <div className="space-y-1 pl-2 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate">3:30 - 4:30 · ክርስቲያናዊ ስነምግባር</span>
                        <strong className="text-ink">ዳዊት አብርሃም</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate">4:30 - 5:30 · የመጽሃፍ ቅዱስ ጥናት</span>
                        <strong className="text-ink">አቤኔዘር ግደይ</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate">5:30 - 6:30 · መሰረተ ኃይማኖት</span>
                        <strong className="text-ink">ብሩክ ክብረአብ</strong>
                      </div>
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-dashed border-gray-200">
                    <p className="font-bold text-[11px] text-ink mb-1">እሁድ - 5ኛ ክፍል፡</p>
                    <div className="space-y-1 pl-2 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate">3:30 - 4:30 · ክርስቲያናዊ ስነምግባር</span>
                        <strong className="text-ink">ብሩክ ክብረአብ</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate">4:30 - 5:30 · የመጽሃፍ ቅዱስ ጥናት</span>
                        <strong className="text-ink">ዳዊት አብርሃም</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate">5:30 - 6:30 · መሰረተ ኃይማኖት</span>
                        <strong className="text-ink">አቤኔዘር ግደይ</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ወጣቶች */}
              <div className="bg-mist/30 rounded-xl p-3.5 border border-gray-100 space-y-3">
                <div className="flex items-center justify-between border-b border-gray-200/60 pb-2">
                  <span className="font-bold text-xs text-ink uppercase tracking-wider flex items-center gap-1.5">
                    <GraduationCap size={15} className="text-gold" />
                    {lang === 'am' ? 'ወጣቶች (7ኛ ክፍል)' : 'Youth (Grade 7)'}
                  </span>
                  <span className="text-[10px] font-semibold text-slate bg-white px-2 py-0.5 rounded border border-gray-200">
                    ቅዳሜና እሁድ
                  </span>
                </div>

                <div className="text-xs space-y-2">
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate">ቅዳሜ 7:30 - 10:00 · መዝሙር</span>
                      <span className="text-gold font-semibold">የጋራ</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate">ቅዳሜ 10:00 - 12:00 · ስርዓተ ቤ/ክ</span>
                      <strong className="text-ink">መ/ር ሮቤል</strong>
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-dashed border-gray-200">
                    <p className="font-bold text-[11px] text-ink mb-1">እሁድ - 7ኛ ክፍል (1ኛ ሴሚስተር)፡</p>
                    <div className="space-y-1 pl-2 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate">3:30 - 4:30 · ክርስቲያናዊ ስነምግባር</span>
                        <strong className="text-ink">መ/ር ባሻ</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate">4:30 - 5:30 · መሰረተ ኃይማኖት</span>
                        <strong className="text-ink">መ/ር መልካሙ</strong>
                      </div>
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-dashed border-gray-200">
                    <p className="font-bold text-[11px] text-ink mb-1">እሁድ - 7ኛ ክፍል (2ኛ ሴሚስተር)፡</p>
                    <div className="space-y-1 pl-2 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate">9:00 - 10:00 · ልሳነ ግዕዝ</span>
                        <strong className="text-ink">መ/ር መጋቤ ሐዲስ አበረሃም</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate">10:00 - 12:00 · የቤ/ክ ታሪክ</span>
                        <strong className="text-ink">መ/ር ሮቤል</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Teacher-Admin Notice Board */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gold/10 text-gold flex items-center justify-center">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-ink text-sm sm:text-base">
                    {lang === 'am' ? 'የመምህራን እና የአስተዳደር መገናኛ' : 'Staff Announcements & Notices'}
                  </h3>
                  <p className="text-xs text-slate">
                    {lang === 'am' ? 'ወቅታዊ የትምህርት መረጃዎች፣ የፈተና ሰሌዳና መልእክቶች' : 'Recent notices between teachers and admin'}
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/education/communication"
                className="text-xs text-gold font-medium hover:underline flex items-center gap-1"
              >
                {lang === 'am' ? 'ሁሉንም እይ' : 'View All'} <ArrowRight size={14} />
              </Link>
            </div>

            {loading ? (
              <p className="text-xs text-slate py-4">{t('loading')}</p>
            ) : !stats?.recentMessages || stats.recentMessages.length === 0 ? (
              <div className="text-center py-6 text-slate text-xs">
                {lang === 'am' ? 'ምንም መልእክት የለም' : 'No announcements posted yet'}
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3.5 rounded-lg border transition-all ${
                      msg.isPinned
                        ? 'bg-amber-50/60 border-gold/40 shadow-xs'
                        : 'bg-white border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {msg.isPinned && (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-gold/20 px-2 py-0.5 rounded">
                            <Pin size={12} className="rotate-45" /> {lang === 'am' ? 'የተሰካ' : 'Pinned'}
                          </span>
                        )}
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-gray-100 text-slate">
                          {lang === 'am'
                            ? categoryLabels[msg.category]?.am || msg.category
                            : categoryLabels[msg.category]?.en || msg.category}
                        </span>
                        <span className="text-[11px] text-slate font-medium">
                          {msg.sender.fullName} ({t(msg.sender.role)})
                        </span>
                      </div>
                    </div>
                    <h4 className="font-semibold text-sm text-ink mt-1.5">{msg.title}</h4>
                    <p className="text-xs text-slate mt-1 line-clamp-2 leading-relaxed">
                      {msg.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sunday School Class Groups Card */}
          <div className="card p-5">
            <h3 className="font-semibold text-ink text-sm sm:text-base mb-3 flex items-center justify-between">
              <span>{lang === 'am' ? 'የሰንበት ት/ቤት ክፍሎችና ተማሪዎች' : 'Sunday School Class Roster'}</span>
              <Link href="/dashboard/education/courses" className="text-xs text-gold hover:underline">
                {lang === 'am' ? 'የትምህርት ዓይነቶች' : 'Manage Courses'}
              </Link>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {stats?.classGroups?.map((cg) => (
                <div
                  key={cg.id}
                  className="p-4 rounded-xl border border-gray-100 bg-mist/40 hover:bg-white hover:shadow-sm transition-all flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[10px] font-bold text-gold uppercase tracking-wider">
                      {cg.level}
                    </span>
                    <h4 className="font-bold text-sm text-ink mt-0.5">{cg.name}</h4>
                    <p className="text-xs text-slate mt-1">
                      {cg.studentCount} {lang === 'am' ? 'ተማሪዎች' : 'students registered'}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <Link
                      href={`/dashboard/education/grades?classLevel=${cg.level}`}
                      className="text-xs text-gold font-medium hover:underline flex items-center gap-1"
                    >
                      {lang === 'am' ? 'ውጤት አስገባ' : 'Enter Grades'} <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Grade Submissions & Quick Actions */}
        <div className="space-y-6">
          {/* Submission Status Summary */}
          <div className="card p-5">
            <h3 className="font-semibold text-ink text-sm sm:text-base mb-3 flex items-center gap-2">
              <TrendingUp size={18} className="text-gold" />
              <span>{lang === 'am' ? 'የውጤት ማስገቢያ ሁኔታ' : 'Points Submission Status'}</span>
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-100">
                <div className="flex items-center gap-2 text-xs font-medium text-green-900">
                  <CheckCircle2 size={16} className="text-green-600" />
                  <span>{lang === 'am' ? 'የፀደቁ ውጤቶች' : 'Approved Grades'}</span>
                </div>
                <span className="font-bold text-sm text-green-800">
                  {stats?.approvedGrades ?? 0}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100">
                <div className="flex items-center gap-2 text-xs font-medium text-amber-900">
                  <Clock size={16} className="text-amber-600" />
                  <span>{lang === 'am' ? 'ለማፅደቅ የቀረቡ' : 'Pending Approval'}</span>
                </div>
                <span className="font-bold text-sm text-amber-800">
                  {stats?.submittedGrades ?? 0}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-2 text-xs font-medium text-slate">
                  <BookOpen size={16} className="text-slate" />
                  <span>{lang === 'am' ? 'ረቂቅ (ያልተላኩ)' : 'Draft Points'}</span>
                </div>
                <span className="font-bold text-sm text-ink">
                  {stats?.draftGrades ?? 0}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100">
              <Link
                href="/dashboard/education/grades"
                className="btn-primary w-full text-center text-xs py-2.5 block"
              >
                {lang === 'am' ? 'ወደ ነጥብ መመዝገቢያ ሂድ' : 'Open Grades Worksheet'}
              </Link>
            </div>
          </div>

          {/* Recent Grade Submissions Feed */}
          <div className="card p-5">
            <h3 className="font-semibold text-ink text-sm sm:text-base mb-3 flex items-center justify-between">
              <span>{lang === 'am' ? 'የቅርብ ጊዜ ውጤቶች' : 'Recent Marks'}</span>
              <Link href="/dashboard/education/grades" className="text-xs text-gold hover:underline">
                {lang === 'am' ? 'ዝርዝር' : 'Details'}
              </Link>
            </h3>

            {loading ? (
              <p className="text-xs text-slate py-4">{t('loading')}</p>
            ) : !stats?.recentGrades || stats.recentGrades.length === 0 ? (
              <p className="text-xs text-slate py-4 text-center">
                {lang === 'am' ? 'ምንም የተመዘገበ ውጤት የለም' : 'No grades recorded yet'}
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {stats.recentGrades.map((g) => (
                  <div key={g.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-ink">
                        {lang === 'am' && g.student.fullNameAmharic ? g.student.fullNameAmharic : g.student.fullName}
                      </p>
                      <p className="text-[11px] text-slate">
                        {lang === 'am' ? g.course.nameAmharic : g.course.name} ({g.course.code})
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="font-bold text-sm text-ink">{g.totalScore}%</span>
                        <span className="text-xs px-1.5 py-0.2 font-bold bg-gold/20 text-gold rounded border border-gold/40">
                          {g.letterGrade}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          g.status === 'APPROVED'
                            ? 'bg-green-100 text-green-800'
                            : g.status === 'SUBMITTED'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-slate'
                        }`}
                      >
                        {g.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
