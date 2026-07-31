'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Topbar } from '@/components/layout/Topbar';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { Modal } from '@/components/ui/Modal';
import { EthiopianDatePicker } from '@/components/EthiopianDatePicker';
import { useHeaderSlot } from '@/lib/header-context';
import { formatEthiopianDateFromGregorian } from '@/lib/ethiopian-calendar';

interface ClassGroup { id: string; name: string; }

interface Profile {
  id: string;
  fullName: string;
  fullNameAmharic: string | null;
  gender: string;
  age: number;
  registrationDate: string;
  parentName: string;
  parentPhone: string;
  studentPhone: string | null;
  class: { id: string; name: string };
  classId: string;
  status: string;
  isWorkingMember: boolean;
  monthlySalary: number | null;
  dateOfBirth: string;
  attendancePercentage: number;
  presentCount: number;
  absentCount: number;
  permissionCount: number;
  consecutiveAbsenceCount: number;
  eligibility?: { eligible: boolean; monthsEnrolled: number; attendancePercentage: number; attendanceThresholdMet: boolean };
  feeStatus: { status: string; unpaidMonths: number; lastPaidMonth: string | null };
  attendanceHistory: { date: string; eventType: string; title: string | null; status: string }[];
}

export default function StudentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { setLeftSlot } = useHeaderSlot();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    setLeftSlot(<button key="back" onClick={() => router.back()} className="font-bold text-xl hover:text-gold shrink-0 leading-none">&larr;</button>);
    return () => setLeftSlot(null);
  }, [setLeftSlot, router]);

  useEffect(() => {
    api.get<Profile>(`/students/${id}`).then(setProfile);
    api.get<ClassGroup[]>('/students/classes').then(setClasses);
  }, [id]);

  if (!profile) return <p className="text-sm text-slate">Loading…</p>;

  return (
    <div>
      <Topbar title={profile.fullName} subtitle={`${profile.class.name} · Age ${profile.age} · ${profile.gender}`}>
        <button className="btn-gold text-sm" onClick={() => setShowEdit(true)}>Edit</button>
      </Topbar>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="card p-5">
          <p className="text-xs font-medium text-slate uppercase mb-2">Personal Information</p>
          <p className="text-sm text-ink">Parent/Guardian: {profile.parentName}</p>
          <p className="text-sm text-ink">Parent Phone: {profile.parentPhone}</p>
          {profile.registrationDate && (
            <p className="text-sm text-ink mt-2">Enrolled: {formatEthiopianDateFromGregorian(new Date(profile.registrationDate))}</p>
          )}
          <p className="text-sm mt-1">
            Status: <Badge variant={profile.status === 'ACTIVE' ? 'paid' : 'neutral'}>{profile.status}</Badge>
            {' '}
            {profile.consecutiveAbsenceCount >= 2 && (
              <Badge variant={profile.consecutiveAbsenceCount > 3 ? 'unpaid' : 'partial'}>
                {profile.consecutiveAbsenceCount} consecutive absences
              </Badge>
            )}
          </p>
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs font-medium text-slate uppercase mb-1">Eligibility to Serve</p>
            {profile.eligibility ? (
              <>
                <p className="text-sm text-ink">Enrolled: {profile.eligibility.monthsEnrolled} month(s)</p>
                <p className="text-sm text-ink">Attendance (3mo): {profile.eligibility.attendancePercentage}%</p>
                <p className="text-sm mt-1">
                  {profile.eligibility.eligible
                    ? <Badge variant="paid">Eligible</Badge>
                    : <Badge variant="unpaid">Not Eligible</Badge>}
                  {!profile.eligibility.attendanceThresholdMet && profile.eligibility.monthsEnrolled >= 3 &&
                    <span className="ml-2 text-xs text-red-600">Needs ≥80% attendance</span>}
                  {profile.eligibility.monthsEnrolled < 3 &&
                    <span className="ml-2 text-xs text-slate">Needs ≥3 months enrolled</span>}
                </p>
              </>
            ) : (
              <p className="text-sm text-slate">—</p>
            )}
          </div>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium text-slate uppercase mb-2">Fee Status (Read Only)</p>
          <Badge variant={profile.feeStatus.status === 'PAID' ? 'paid' : profile.feeStatus.status === 'PARTIAL' ? 'partial' : 'unpaid'}>
            {profile.feeStatus.status}
          </Badge>
          <p className="text-sm text-ink mt-2">Unpaid months: {profile.feeStatus.unpaidMonths}</p>
          <p className="text-sm text-ink">Last paid month: {profile.feeStatus.lastPaidMonth ?? '—'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="Attendance %" value={`${profile.attendancePercentage}%`} accent="gold" />
        <StatCard label="Present" value={String(profile.presentCount)} accent="green" />
        <StatCard label="Absent" value={String(profile.absentCount)} accent="red" />
        <StatCard label="Permission" value={String(profile.permissionCount)} accent="ink" />
      </div>

      <div className="card p-6">
        <h2 className="text-sm font-semibold text-ink mb-4">Attendance History</h2>
        <table className="table-base">
          <thead><tr><th>Date</th><th>Event</th><th>Status</th></tr></thead>
          <tbody>
            {profile.attendanceHistory.slice(0, 30).map((h, i) => (
              <tr key={i}>
                <td>{formatEthiopianDateFromGregorian(new Date(h.date))}</td>
                <td>{h.title || h.eventType.replace(/_/g, ' ')}</td>
                <td>
                  <Badge variant={h.status === 'PRESENT' ? 'paid' : h.status === 'PERMISSION' ? 'partial' : 'unpaid'}>
                    {h.status}
                  </Badge>
                </td>
              </tr>
            ))}
            {profile.attendanceHistory.length === 0 && (
              <tr><td colSpan={3} className="text-center text-sm text-slate py-8">No attendance recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showEdit && (
        <EditStudentModal
          student={profile}
          classes={classes}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); api.get<Profile>(`/students/${id}`).then(setProfile); }}
        />
      )}
    </div>
  );
}

function EditStudentModal({ student, classes, onClose, onSaved }: { student: Profile; classes: ClassGroup[]; onClose: () => void; onSaved: () => void }) {
  const [fullName, setFullName] = useState(student.fullName);
  const [fullNameAmharic, setFullNameAmharic] = useState(student.fullNameAmharic ?? '');
  const [gender, setGender] = useState(student.gender);
  const [dateOfBirth, setDateOfBirth] = useState(student.dateOfBirth.slice(0, 10));
  const [studentPhone, setStudentPhone] = useState(student.studentPhone ?? '');
  const [parentName, setParentName] = useState(student.parentName);
  const [parentPhone, setParentPhone] = useState(student.parentPhone);
  const [classId, setClassId] = useState(student.classId);
  const [isWorkingMember, setIsWorkingMember] = useState(student.isWorkingMember);
  const [monthlySalary, setMonthlySalary] = useState(student.monthlySalary ? String(student.monthlySalary) : '');
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      await api.patch(`/students/${student.id}`, {
        fullName, fullNameAmharic: fullNameAmharic || undefined, gender, dateOfBirth, studentPhone: studentPhone || undefined,
        parentName, parentPhone, classId, isWorkingMember,
        monthlySalary: isWorkingMember && monthlySalary ? Number(monthlySalary) : null,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title="Edit Student" onClose={onClose}>
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
        <div><label className="label">Student Phone (optional)</label><input className="input" value={studentPhone} onChange={(e) => setStudentPhone(e.target.value)} /></div>
        <div><label className="label">Parent/Guardian Name</label><input className="input" value={parentName} onChange={(e) => setParentName(e.target.value)} /></div>
        <div><label className="label">Parent Phone</label><input className="input" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} /></div>

        <label className="flex items-center gap-2 text-sm text-ink pt-1">
          <input type="checkbox" checked={isWorkingMember} onChange={(e) => setIsWorkingMember(e.target.checked)} />
          Working member (pays 2% of monthly salary instead of the class fee)
        </label>
        {isWorkingMember && (
          <div><label className="label">Monthly Salary (Birr)</label><input type="number" className="input" value={monthlySalary} onChange={(e) => setMonthlySalary(e.target.value)} /></div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-gold" disabled={saving || !fullName || !dateOfBirth || !parentName || !parentPhone} onClick={submit}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
