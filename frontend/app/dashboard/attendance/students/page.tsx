'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Topbar } from '@/components/layout/Topbar';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useLang } from '@/lib/i18n';
import { EthiopianDatePicker } from '@/components/EthiopianDatePicker';
import { ethiopianTodayISO } from '@/lib/ethiopian-calendar';

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
  const { lang } = useLang();
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [search, setSearch] = useState('');
  const [classId, setClassId] = useState('');
  const [gender, setGender] = useState('');
  const [status, setStatus] = useState('');
  const [eligibleOnly, setEligibleOnly] = useState('');
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (classId) params.set('classId', classId);
    if (gender) params.set('gender', gender);
    if (status) params.set('status', status);
    if (eligibleOnly) params.set('eligibleToServe', 'true');
    const res = await api.get<{ data: StudentRow[] }>(`/students?${params.toString()}`);
    setRows(res.data);
    setLoading(false);
  }

  useEffect(() => { api.get<ClassGroup[]>('/students/classes').then(setClasses); }, []);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [classId, gender, status]);

  return (
    <div>
      <Topbar title="Student Registration" subtitle="Register, search, and manage students across all classes" />

      <div className="flex justify-end mb-4">
        <button className="btn-gold" onClick={() => setShowRegister(true)}>+ Register Student</button>
      </div>

      <div className="card p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="label">Search</label>
          <input className="input" placeholder="Name (EN/AM), ID, parent, phone…" value={search}
            onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
        </div>
        <div>
          <label className="label">Class</label>
          <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">All classes</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Gender</label>
          <select className="input" value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="">Any</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Any</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
        <div>
          <label className="label">Eligible to Serve</label>
          <select className="input" value={eligibleOnly} onChange={(e) => setEligibleOnly(e.target.value)}>
            <option value="">Any</option>
            <option value="true">Eligible</option>
          </select>
        </div>
        <button className="btn-outline" onClick={load}>Search</button>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr><th>ID</th><th>Name</th><th className="hidden sm:table-cell">Age</th><th className="hidden sm:table-cell">Class</th><th className="hidden md:table-cell">Parent</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className={s.status === 'INACTIVE' ? 'opacity-40' : ''}>
                <td className="font-mono text-xs">{s.studentCode}</td>
                <td className="font-medium text-ink">
                  {lang === 'am' && s.fullNameAmharic ? s.fullNameAmharic : s.fullName}
                  {s.isWorkingMember && <span className="ml-2 text-[10px] text-gold border border-gold rounded-full px-1.5 py-0.5">Working Member</span>}
                  {s.eligibility?.eligible && <span className="ml-1 text-[10px] text-green-700 bg-green-100 border border-green-300 rounded-full px-1.5 py-0.5">Eligible to Serve</span>}
                </td>
                <td className="hidden sm:table-cell">{s.age}</td>
                <td className="hidden sm:table-cell">{s.class.name}</td>
                <td className="hidden md:table-cell"><p>{s.parentName}</p><p className="text-xs text-slate">{s.parentPhone}</p></td>
                <td><Badge variant={s.status === 'ACTIVE' ? 'paid' : 'neutral'}>{s.status}</Badge></td>
                <td><Link className="text-xs text-gold font-medium hover:underline" href={`/dashboard/attendance/students/${s.id}`}>View Profile</Link></td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={7} className="text-center text-sm text-slate py-8">No students match this filter.</td></tr>
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

function RegisterModal({ classes, onClose, onSaved }: { classes: ClassGroup[]; onClose: () => void; onSaved: () => void }) {
  const [fullName, setFullName] = useState('');
  const [fullNameAmharic, setFullNameAmharic] = useState('');
  const [gender, setGender] = useState('MALE');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [enrollmentDate, setEnrollmentDate] = useState(ethiopianTodayISO());
  const [classId, setClassId] = useState(classes[0]?.id ?? '');
  const [isWorkingMember, setIsWorkingMember] = useState(false);
  const [monthlySalary, setMonthlySalary] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      await api.post('/students', {
        fullName, fullNameAmharic: fullNameAmharic || undefined, gender, dateOfBirth, studentPhone,
        parentName, parentPhone, classId: classId || classes[0]?.id, registrationDate: enrollmentDate,
        isWorkingMember, monthlySalary: isWorkingMember && monthlySalary ? Number(monthlySalary) : undefined,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title="Register Student" onClose={onClose}>
      <div className="space-y-3">
        <div><label className="label">Full Name (English)</label><input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
        <div><label className="label">Full Name (Amharic)</label><input className="input" value={fullNameAmharic} onChange={(e) => setFullNameAmharic(e.target.value)} placeholder="ሙሉ ስም" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Gender</label>
            <select className="input" value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="MALE">Male</option><option value="FEMALE">Female</option>
            </select>
          </div>
          <div><label className="label">Date of Birth</label><EthiopianDatePicker value={dateOfBirth} onChange={(d) => setDateOfBirth(d)} /></div>
        </div>
        <div><label className="label">Class</label>
          <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)}>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div><label className="label">Enrollment Date</label><EthiopianDatePicker value={enrollmentDate} onChange={(d) => setEnrollmentDate(d)} /></div>
        <div><label className="label">Student Phone (optional)</label><input className="input" value={studentPhone} onChange={(e) => setStudentPhone(e.target.value)} /></div>
        <div><label className="label">Parent/Guardian Name</label><input className="input" value={parentName} onChange={(e) => setParentName(e.target.value)} /></div>
        <div><label className="label">Parent Phone</label><input className="input" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} /></div>

        <label className="flex items-center gap-2 text-sm text-ink pt-1">
          <input type="checkbox" checked={isWorkingMember} onChange={(e) => setIsWorkingMember(e.target.checked)} />
          Working member (pays 2% of monthly salary instead of the class fee)
        </label>
        {isWorkingMember && (
          <div>
            <label className="label">Monthly Salary (Birr)</label>
            <input type="number" className="input" value={monthlySalary} onChange={(e) => setMonthlySalary(e.target.value)} />
            {monthlySalary === '' && <p className="text-xs text-status-absent mt-1">Salary is required for working members (fee = 2% of salary).</p>}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-gold" disabled={saving || !fullName || !dateOfBirth || !parentName || !parentPhone || (isWorkingMember && monthlySalary === '')} onClick={submit}>
            {saving ? 'Saving…' : 'Register'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
