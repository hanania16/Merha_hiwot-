'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useLang } from '@/lib/i18n';
import { getCurrentUser } from '@/lib/auth';
import { Topbar } from '@/components/layout/Topbar';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import {
  Users,
  UserPlus,
  ShieldCheck,
  GraduationCap,
  Wallet,
  Search,
  Edit2,
  CheckCircle2,
  XCircle,
  KeyRound,
  BookOpen,
  Clock,
} from 'lucide-react';

interface CourseAssigned {
  id: string;
  code: string;
  name: string;
  nameAmharic: string;
  targetGrade?: string | null;
  scheduleTime?: string | null;
  classLevel: string;
}

interface UserRecord {
  id: string;
  fullName: string;
  email: string;
  role: 'ADMINISTRATOR' | 'TEACHER' | 'FINANCE_OFFICER';
  isActive: boolean;
  createdAt: string;
  coursesTeaching?: CourseAssigned[];
  _count?: {
    coursesTeaching: number;
    submittedGrades: number;
    sentMessages: number;
  };
}

export default function UsersPage() {
  const { lang, t } = useLang();
  const currentUser = getCurrentUser();

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMINISTRATOR' | 'TEACHER' | 'FINANCE_OFFICER'>('ALL');
  const [search, setSearch] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'ADMINISTRATOR' | 'TEACHER' | 'FINANCE_OFFICER'>('TEACHER');
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await api.get<UserRecord[]>('/users');
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function handleOpenCreate() {
    setEditingUser(null);
    setFullName('');
    setEmail('');
    setRole('TEACHER');
    setPassword('Password123!');
    setIsActive(true);
    setErrorMsg('');
    setModalOpen(true);
  }

  function handleOpenEdit(user: UserRecord) {
    setEditingUser(user);
    setFullName(user.fullName);
    setEmail(user.email);
    setRole(user.role);
    setPassword('');
    setIsActive(user.isActive);
    setErrorMsg('');
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    try {
      if (editingUser) {
        await api.patch(`/users/${editingUser.id}`, {
          fullName,
          email,
          role,
          isActive,
          ...(password ? { password } : {}),
        });
      } else {
        await api.post('/users', {
          fullName,
          email,
          role,
          isActive,
          password: password || 'Password123!',
        });
      }
      setModalOpen(false);
      await loadUsers();
    } catch (err: any) {
      setErrorMsg(err?.message || (lang === 'am' ? 'ስህተት ተፈጥሯል' : 'Failed to save user'));
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleUserStatus(user: UserRecord) {
    try {
      await api.patch(`/users/${user.id}`, { isActive: !user.isActive });
      await loadUsers();
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  }

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.coursesTeaching?.some((c) =>
          c.nameAmharic.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          (c.targetGrade && c.targetGrade.toLowerCase().includes(q))
        )
      );
    }
    return true;
  });

  const totalTeachers = users.filter((u) => u.role === 'TEACHER').length;
  const totalAdmins = users.filter((u) => u.role === 'ADMINISTRATOR').length;
  const totalFinance = users.filter((u) => u.role === 'FINANCE_OFFICER').length;

  return (
    <div className="space-y-6">
      <Topbar
        title={lang === 'am' ? 'የመምህራን እና የተጠቃሚዎች አስተዳደር' : 'Staff & User Management'}
        subtitle={
          lang === 'am'
            ? 'የሰንበት ትምህርት ቤት መምህራን፣ አስተዳዳሪዎች እና የፋይናንስ ተጠቃሚዎች መቆጣጠሪያ'
            : 'Manage Sunday School teachers, administrative staff, and finance officers'
        }
      >
        <button
          onClick={handleOpenCreate}
          className="btn-gold flex items-center gap-1.5 text-xs font-semibold"
        >
          <UserPlus size={15} />
          {t('addUser')}
        </button>
      </Topbar>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label={lang === 'am' ? 'ጠቅላላ ተጠቃሚዎች' : 'Total Staff & Users'}
          value={users.length}
          sub={lang === 'am' ? 'የተመዘገቡ ተጠቃሚዎች' : 'Registered in System'}
        />
        <StatCard
          label={lang === 'am' ? 'መምህራን' : 'Teachers'}
          value={totalTeachers}
          accent="gold"
          sub={lang === 'am' ? 'ኮርስ የሚያስተምሩ መምህራን' : 'Teaching Sunday School'}
        />
        <StatCard
          label={lang === 'am' ? 'አስተዳዳሪዎች' : 'Administrators'}
          value={totalAdmins}
          sub={lang === 'am' ? 'ሙሉ የስርዓት ፈቃድ ያላቸው' : 'Full System Access'}
        />
        <StatCard
          label={lang === 'am' ? 'የፋይናንስ ኃላፊዎች' : 'Finance Officers'}
          value={totalFinance}
          sub={lang === 'am' ? 'የሒሳብና ክፍያ መቆጣጠሪያ' : 'Accounting & Fees'}
        />
      </div>

      {/* Filters and Search */}
      <div className="card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Role Pill Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setRoleFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              roleFilter === 'ALL' ? 'bg-gold text-ink' : 'bg-mist text-slate hover:bg-mist/70'
            }`}
          >
            {lang === 'am' ? 'ሁሉም ተጠቃሚዎች' : 'All Users'} ({users.length})
          </button>
          <button
            onClick={() => setRoleFilter('TEACHER')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              roleFilter === 'TEACHER' ? 'bg-gold text-ink' : 'bg-mist text-slate hover:bg-mist/70'
            }`}
          >
            {lang === 'am' ? 'መምህራን' : 'Teachers'} ({totalTeachers})
          </button>
          <button
            onClick={() => setRoleFilter('ADMINISTRATOR')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              roleFilter === 'ADMINISTRATOR' ? 'bg-gold text-ink' : 'bg-mist text-slate hover:bg-mist/70'
            }`}
          >
            {lang === 'am' ? 'አስተዳዳሪዎች' : 'Administrators'} ({totalAdmins})
          </button>
          <button
            onClick={() => setRoleFilter('FINANCE_OFFICER')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              roleFilter === 'FINANCE_OFFICER' ? 'bg-gold text-ink' : 'bg-mist text-slate hover:bg-mist/70'
            }`}
          >
            {lang === 'am' ? 'የፋይናንስ ኃላፊዎች' : 'Finance Officers'} ({totalFinance})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate" />
          <input
            type="text"
            className="input pl-9 text-xs w-full"
            placeholder={lang === 'am' ? 'በስም፣ ኢሜይል ወይም ትምህርት ፈልግ…' : 'Search name, email, or course…'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Users List */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate">{t('loading')}</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate">
            {lang === 'am' ? 'ምንም ተጠቃሚ አልተገኘም።' : 'No users found matching your criteria.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr className="bg-mist/30">
                  <th>{lang === 'am' ? 'የተጠቃሚ ስም / መገለጫ' : 'Staff / User Profile'}</th>
                  <th>{lang === 'am' ? 'ሚና (Role)' : 'Role'}</th>
                  <th>{lang === 'am' ? 'ሁኔታ' : 'Status'}</th>
                  <th>{lang === 'am' ? 'የሚያስተምሯቸው ትምህርቶችና ሰዓት' : 'Courses & Timetable'}</th>
                  <th className="text-right">{lang === 'am' ? 'ድርጊት' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((u) => {
                  const isCurrent = currentUser?.email === u.email;
                  return (
                    <tr key={u.id} className="hover:bg-mist/20 transition-colors">
                      <td className="py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              u.role === 'ADMINISTRATOR'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : u.role === 'TEACHER'
                                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            }`}
                          >
                            {u.fullName.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-ink text-sm">{u.fullName}</span>
                              {isCurrent && (
                                <span className="text-[10px] bg-gold/20 text-gold px-1.5 py-0.5 rounded font-bold">
                                  {lang === 'am' ? 'እርስዎ' : 'You'}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate">{u.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            u.role === 'ADMINISTRATOR'
                              ? 'bg-amber-100 text-amber-800'
                              : u.role === 'TEACHER'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {u.role === 'ADMINISTRATOR' && <ShieldCheck size={12} />}
                          {u.role === 'TEACHER' && <GraduationCap size={12} />}
                          {u.role === 'FINANCE_OFFICER' && <Wallet size={12} />}
                          {t(u.role)}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => !isCurrent && toggleUserStatus(u)}
                          disabled={isCurrent}
                          title={isCurrent ? 'Cannot deactivate yourself' : 'Click to toggle status'}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.isActive
                              ? 'bg-status-present/15 text-status-present'
                              : 'bg-gray-200 text-slate'
                          }`}
                        >
                          {u.isActive ? (
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
                      <td>
                        {u.coursesTeaching && u.coursesTeaching.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 max-w-md">
                            {u.coursesTeaching.map((c) => (
                              <div
                                key={c.id}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-gold/10 border border-gold/30 rounded text-[11px] text-ink font-medium"
                              >
                                <BookOpen size={11} className="text-gold shrink-0" />
                                <span>{lang === 'am' ? c.nameAmharic : c.name}</span>
                                {c.targetGrade && (
                                  <span className="font-bold text-gold text-[10px]">
                                    ({c.targetGrade})
                                  </span>
                                )}
                                {c.scheduleTime && (
                                  <span className="text-slate text-[10px] border-l border-gold/30 pl-1 ml-0.5">
                                    {c.scheduleTime}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : u.role === 'TEACHER' ? (
                          <span className="text-xs text-slate italic">
                            {lang === 'am' ? 'ትምህርት አልተመደበለትም' : 'No courses assigned'}
                          </span>
                        ) : (
                          <span className="text-xs text-slate">—</span>
                        )}
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="btn-outline text-xs px-2.5 py-1.5 inline-flex items-center gap-1"
                        >
                          <Edit2 size={13} />
                          {lang === 'am' ? 'አሻሽል' : 'Edit'}
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

      {/* User Create/Edit Modal */}
      <Modal
        open={modalOpen}
        title={
          editingUser
            ? `${lang === 'am' ? 'ተጠቃሚ አሻሽል' : 'Edit User'}: ${editingUser.fullName}`
            : lang === 'am'
            ? 'አዲስ ተጠቃሚ / መምህር መዝግብ'
            : 'Register New Staff / Teacher'
        }
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="label">{lang === 'am' ? 'ሙሉ ስም' : 'Full Name'} *</label>
            <input
              type="text"
              required
              className="input text-xs w-full"
              placeholder={lang === 'am' ? 'ለምሳሌ፡ ዳዊት አብርሃም ወይም መ/ር ሮቤል' : 'e.g. Dawit Abreham or Memhir Robel'}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div>
            <label className="label">{lang === 'am' ? 'ኢሜይል' : 'Email Address'} *</label>
            <input
              type="email"
              required
              className="input text-xs w-full"
              placeholder="user@marhahiwot.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{lang === 'am' ? 'የስርዓት ሚና (Role)' : 'System Role'} *</label>
              <select
                className="select text-xs w-full"
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
              >
                <option value="TEACHER">{lang === 'am' ? 'መምህር (Teacher)' : 'Teacher'}</option>
                <option value="ADMINISTRATOR">{lang === 'am' ? 'አስተዳዳሪ (Administrator)' : 'Administrator'}</option>
                <option value="FINANCE_OFFICER">{lang === 'am' ? 'የፋይናንስ ኃላፊ (Finance Officer)' : 'Finance Officer'}</option>
              </select>
            </div>

            <div>
              <label className="label">
                {editingUser
                  ? lang === 'am' ? 'አዲስ የይለፍ ቃል (ከተፈለገ)' : 'New Password (Optional)'
                  : lang === 'am' ? 'የይለፍ ቃል' : 'Password'}
              </label>
              <input
                type="text"
                className="input text-xs w-full"
                placeholder={editingUser ? '••••••••' : 'Password123!'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isActiveCheck"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded text-gold focus:ring-gold"
            />
            <label htmlFor="isActiveCheck" className="text-xs text-ink font-medium cursor-pointer">
              {lang === 'am' ? 'ተጠቃሚው ንቁ (Active) ይሁን' : 'Account is active and allowed to login'}
            </label>
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
              disabled={submitting || !fullName.trim() || !email.trim()}
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
