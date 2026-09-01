'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { useLang } from '@/lib/i18n';
import { EthiopianDatePicker } from '@/components/EthiopianDatePicker';
import { ethiopianTodayISO } from '@/lib/ethiopian-calendar';

interface ClassGroup { id: string; name: string; }

export interface CreatedStudent {
  id: string;
  studentCode: string;
  fullName: string;
  fullNameAmharic: string | null;
  gender: string;
  isWorkingMember: boolean;
  monthlySalary: number | null;
  status: string;
  class: { id: string; level: string; name: string };
}

/**
 * Shared Student Registration form. Used by the Students page and the Student
 * Fees quick-add flow. `onSaved` receives the created student record so a
 * caller can chain into a follow-up step (e.g. record payment).
 */
export function RegisterModal({
  classes,
  onClose,
  onSaved,
}: {
  classes: ClassGroup[];
  onClose: () => void;
  onSaved: (student: CreatedStudent) => void;
}) {
  const { t } = useLang();
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
      const created = await api.post<CreatedStudent>('/students', {
        fullName, fullNameAmharic: fullNameAmharic || undefined, gender, dateOfBirth, studentPhone,
        parentName, parentPhone, classId: classId || classes[0]?.id, registrationDate: enrollmentDate,
        isWorkingMember, monthlySalary: isWorkingMember && monthlySalary ? Number(monthlySalary) : undefined,
      });
      onSaved(created);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title={t('registerStudent')} onClose={onClose}>
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
        <div><label className="label">{t('enrollmentDate')}</label><EthiopianDatePicker value={enrollmentDate} onChange={(d) => setEnrollmentDate(d)} /></div>
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
            {saving ? t('saving') : t('register')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
