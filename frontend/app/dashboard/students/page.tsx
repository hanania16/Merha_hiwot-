'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Topbar } from '@/components/layout/Topbar';
import { Badge } from '@/components/ui/Badge';
import { useLang } from '@/lib/i18n';
import { RegisterModal } from '@/components/RegisterModal';

interface ClassGroup { id: string; name: string; }
interface StudentRow {
  id: string;
  studentCode: string;
  fullName: string;
  fullNameAmharic: string | null;
  gender: string;
  age: number;
  parentName: string;
  parentPhone: string;
  status: string;
  isWorkingMember: boolean;
  class: ClassGroup;
  eligibility?: { eligible: boolean; monthsEnrolled: number; attendancePercentage: number; attendanceThresholdMet: boolean };
}

export default function StudentsPage() {
  const { lang, t } = useLang();
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [search, setSearch] = useState('');
  const [classId, setClassId] = useState('');
  const [gender, setGender] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (classId) params.set('classId', classId);
    if (gender) params.set('gender', gender);
    if (status) params.set('status', status);
    const res = await api.get<{ data: StudentRow[] }>(`/students?${params.toString()}`);
    setRows(res.data);
    setLoading(false);
  }

  useEffect(() => { api.get<ClassGroup[]>('/students/classes').then(setClasses); }, []);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [classId, gender, status]);

  return (
    <div>
      <Topbar title={t('studentRegistration')} subtitle={t('studentRegistrationSub')} />

      <div className="flex justify-end mb-4">
        <button className="btn-gold" onClick={() => setShowRegister(true)}>{t('registerStudentCta')}</button>
      </div>

      <div className="card p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="label">{t('search')}</label>
          <input className="input" placeholder={t('searchPlaceholder')} value={search}
            onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
        </div>
        <div>
          <label className="label">{t('class')}</label>
          <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">{t('allClasses')}</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">{t('gender')}</label>
          <select className="input" value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="">{t('any')}</option>
            <option value="MALE">{t('male')}</option>
            <option value="FEMALE">{t('female')}</option>
          </select>
        </div>
        <div>
          <label className="label">{t('status')}</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{t('any')}</option>
            <option value="ACTIVE">{t('ACTIVE')}</option>
            <option value="INACTIVE">{t('INACTIVE')}</option>
          </select>
        </div>
        <button className="btn-outline" onClick={load}>{t('search')}</button>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr><th>{t('id')}</th><th>{t('name')}</th><th className="hidden sm:table-cell">{t('age')}</th><th className="hidden sm:table-cell">{t('class')}</th><th className="hidden md:table-cell">{t('parent')}</th><th>{t('status')}</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className={s.status === 'INACTIVE' ? 'opacity-40' : ''}>
                <td className="font-mono text-xs">{s.studentCode}</td>
                <td className="font-medium text-ink">
                  {lang === 'am' && s.fullNameAmharic ? s.fullNameAmharic : s.fullName}
                  {s.isWorkingMember && <span className="ml-2 text-[10px] text-ink border border-gold rounded-full px-1.5 py-0.5 bg-transparent">{t('workingMember')}</span>}
                </td>
                <td className="hidden sm:table-cell">{s.age}</td>
                <td className="hidden sm:table-cell">{s.class.name}</td>
                <td className="hidden md:table-cell"><p>{s.parentName}</p><p className="text-xs text-slate">{s.parentPhone}</p></td>
                <td><Badge variant={s.status === 'ACTIVE' ? 'paid' : 'neutral'}>{t(s.status)}</Badge></td>
                <td><Link className="text-xs text-gold font-medium hover:underline" href={`/dashboard/students/${s.id}`}>{t('viewProfile')}</Link></td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={7} className="text-center text-sm text-slate py-8">{t('noStudentsMatch')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showRegister && (
        <RegisterModal classes={classes} onClose={() => setShowRegister(false)} onSaved={() => { setShowRegister(false); load(); }} />
      )}
    </div>
  );
}
