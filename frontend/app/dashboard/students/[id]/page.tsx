'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Topbar } from '@/components/layout/Topbar';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { EthiopianDatePicker } from '@/components/EthiopianDatePicker';
import { useHeaderSlot } from '@/lib/header-context';
import { formatEthiopianDateFromGregorian } from '@/lib/ethiopian-calendar';
import { useLang } from '@/lib/i18n';

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
  feeStatus: { status: string; unpaidMonths: number; lastPaidMonth: string | null };
}

export default function StudentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { t } = useLang();
  const { setLeftSlot } = useHeaderSlot();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    setLeftSlot(<button key="back" onClick={() => router.back()} className="font-bold text-xl hover:text-gold shrink-0 leading-none">&larr;</button>);
    return () => setLeftSlot(null);
  }, [setLeftSlot, router]);

  useEffect(() => {
    api.get<Profile>(`/students/${id}`).then(setProfile);
    api.get<ClassGroup[]>('/students/classes').then(setClasses);
  }, [id]);

  if (!profile) return <p className="text-sm text-slate">{t('loading')}</p>;

  return (
    <div>
      <Topbar title={profile.fullName} subtitle={`${profile.class.name} · ${t('age')} ${profile.age} · ${t(profile.gender)}`}>
        <button className="btn-gold text-sm" onClick={() => setShowEdit(true)}>{t('edit')}</button>
        <button className="btn-danger text-sm" onClick={() => setShowDelete(true)}>{t('delete')}</button>
      </Topbar>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="card p-5">
          <p className="text-xs font-medium text-slate uppercase mb-2">{t('personalInformation')}</p>
          <p className="text-sm text-ink">{t('parentGuardian', { name: profile.parentName })}</p>
          <p className="text-sm text-ink">{t('parentPhoneLabel', { phone: profile.parentPhone })}</p>
          {profile.registrationDate && (
            <p className="text-sm text-ink mt-2">{t('enrolledOn', { date: formatEthiopianDateFromGregorian(new Date(profile.registrationDate)) })}</p>
          )}
          <p className="text-sm mt-1">
            {t('status')}: <Badge variant={profile.status === 'ACTIVE' ? 'paid' : 'neutral'}>{t(profile.status)}</Badge>
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium text-slate uppercase mb-2">{t('feeStatusReadOnly')}</p>
          <Badge variant={profile.feeStatus.status === 'PAID' ? 'paid' : profile.feeStatus.status === 'PARTIAL' ? 'partial' : 'unpaid'}>
            {t(profile.feeStatus.status)}
          </Badge>
          <p className="text-sm text-ink mt-2">{t('unpaidMonths', { n: profile.feeStatus.unpaidMonths })}</p>
          <p className="text-sm text-ink">{t('lastPaidMonth', { m: profile.feeStatus.lastPaidMonth ?? '—' })}</p>
        </div>
      </div>

      {showEdit && (
        <EditStudentModal
          student={profile}
          classes={classes}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); api.get<Profile>(`/students/${id}`).then(setProfile); }}
        />
      )}

      {showDelete && (
        <Modal open title={t('deleteStudent')} onClose={() => setShowDelete(false)}>
          <p className="text-sm text-ink">
            {t('deleteConfirm', { name: profile.fullName })}
          </p>
          {deleteError && <p className="text-xs text-red-600 mt-2">{deleteError}</p>}
          <div className="flex justify-end gap-2 pt-4">
            <button className="btn-outline" onClick={() => setShowDelete(false)} disabled={deleting}>{t('cancel')}</button>
            <button
              className="btn-danger"
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                setDeleteError('');
                try {
                  await api.delete(`/students/${id}`);
                  router.push('/dashboard/students');
                } catch (e: any) {
                  setDeleteError(e.message || t('deleteFailed'));
                  setDeleting(false);
                }
              }}
            >
              {deleting ? t('deleting') : t('deleteStudent')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function EditStudentModal({ student, classes, onClose, onSaved }: { student: Profile; classes: ClassGroup[]; onClose: () => void; onSaved: () => void }) {
  const { t } = useLang();
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
    <Modal open title={t('editStudent')} onClose={onClose}>
      <div className="space-y-3">
        <div><label className="label">{t('fullNameEnglish')}</label><input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
        <div><label className="label">{t('fullNameAmharic')}</label><input className="input" value={fullNameAmharic} onChange={(e) => setFullNameAmharic(e.target.value)} placeholder="ሙሉ ስም" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">{t('gender')}</label>
            <select className="input" value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="MALE">{t('male')}</option><option value="FEMALE">{t('female')}</option>
            </select>
          </div>
          <div><label className="label">{t('dateOfBirth')}</label><EthiopianDatePicker value={dateOfBirth} onChange={(d) => setDateOfBirth(d)} /></div>
        </div>
        <div><label className="label">{t('class')}</label>
          <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)}>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div><label className="label">{t('studentPhoneOptional')}</label><input className="input" value={studentPhone} onChange={(e) => setStudentPhone(e.target.value)} /></div>
        <div><label className="label">{t('parentGuardianName')}</label><input className="input" value={parentName} onChange={(e) => setParentName(e.target.value)} /></div>
        <div><label className="label">{t('parentPhone')}</label><input className="input" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} /></div>

        <label className="flex items-center gap-2 text-sm text-ink pt-1">
          <input type="checkbox" checked={isWorkingMember} onChange={(e) => setIsWorkingMember(e.target.checked)} />
          {t('workingMemberLabel')}
        </label>
        {isWorkingMember && (
          <div>
            <label className="label">{t('monthlySalaryBirr')}</label>
            <input type="number" className="input" value={monthlySalary} onChange={(e) => setMonthlySalary(e.target.value)} />
            {monthlySalary === '' && <p className="text-xs text-status-absent mt-1">{t('salaryRequired')}</p>}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-outline" onClick={onClose}>{t('cancel')}</button>
          <button className="btn-gold" disabled={saving || !fullName || !dateOfBirth || !parentName || !parentPhone || (isWorkingMember && monthlySalary === '')} onClick={submit}>
            {saving ? t('saving') : t('save')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
