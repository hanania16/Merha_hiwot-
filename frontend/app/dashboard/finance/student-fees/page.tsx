'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ETHIOPIAN_MONTHS, currentEthiopianYear, FEE_TRACKING_START_YEAR, FEE_TRACKING_START_MONTH_ORDER, formatETB, formatEthiopianDateFromGregorian } from '@/lib/ethiopian-calendar';
import { Topbar } from '@/components/layout/Topbar';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useLang } from '@/lib/i18n';
import { RegisterModal, type CreatedStudent } from '@/components/RegisterModal';

interface SelectedMonthRecord {
  month: string;
  status: string;
  baseAmount: number | string;
  penaltyAmount: number | string;
  amount: number | string;
  paidDate: string | null;
}

interface FeeRow {
  studentId: string;
  studentCode: string;
  fullName: string;
  fullNameAmharic: string | null;
  className: string;
  classLevel: string;
  parentName: string;
  parentPhone: string;
  isWorkingMember: boolean;
  status: 'PAID' | 'UNPAID' | 'PARTIAL';
  unpaidMonths: number;
  lastPaymentDate: string | null;
  lastPaymentMethod: string | null;
  lastPaymentAccountOwner: string | null;
  lastPaymentPhoneNumber: string | null;
  lastPaidMonth: string | null;
  lastPaidYear: number | null;
  monthlyBaseFee: number;
  outstandingBalance: number;
  months: { month: string; status: string; amount: number | string; ethiopianYear: number }[];
  selectedMonth: SelectedMonthRecord | null;
}
interface ClassGroup { id: string; name: string; }

const num = (v: number | string | null | undefined) => Number(v ?? 0);

export default function StudentFeesPage() {
  const { lang, t } = useLang();
  const [rows, setRows] = useState<FeeRow[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [search, setSearch] = useState('');
  const [classId, setClassId] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalStudent, setModalStudent] = useState<FeeRow | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [paymentStudent, setPaymentStudent] = useState<FeeRow | null>(null);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (classId) params.set('classId', classId);
    if (status) params.set('status', status);
    const data = await api.get<FeeRow[]>(`/finance/student-fees?${params.toString()}`);
    setRows(data);
    setLoading(false);
  }

  // After a successful quick registration, open the existing Record Payment
  // dialog for the newly created student. Payment is a separate, optional step:
  // closing it still leaves the student registered.
  async function handleRegistered(student: CreatedStudent) {
    setShowRegister(false);
    try {
      const balance = await api.get<Balance>(
        `/finance/student-fees/${student.id}/outstanding-balance`,
      );
      const row: FeeRow = {
        studentId: student.id,
        studentCode: student.studentCode,
        fullName: student.fullName,
        fullNameAmharic: student.fullNameAmharic,
        className: student.class?.name ?? '',
        classLevel: student.class?.level ?? '',
        parentName: '',
        parentPhone: '',
        isWorkingMember: student.isWorkingMember,
        status: 'UNPAID',
        unpaidMonths: 0,
        lastPaymentDate: null,
        lastPaymentMethod: null,
        lastPaymentAccountOwner: null,
        lastPaymentPhoneNumber: null,
        lastPaidMonth: null,
        lastPaidYear: null,
        monthlyBaseFee: balance.monthlyBaseFee,
        outstandingBalance: 0,
        months: [],
        selectedMonth: null,
      };
      setPaymentStudent(row);
    } finally {
      load();
    }
  }

  useEffect(() => { api.get<ClassGroup[]>('/students/classes').then(setClasses); }, []);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [classId, status]);

  return (
    <div>
      <Topbar title={t('studentFeeManagement')} subtitle={t('studentFeeSub')} />

      <div className="card p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="label">{t('search')}</label>
            <input className="input" placeholder={t('searchNameId')} value={search}
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
            <label className="label">{t('feeStatus')}</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">{t('all')}</option>
              <option value="PAID">{t('PAID')}</option>
              <option value="PARTIAL">{t('PARTIAL')}</option>
              <option value="UNPAID">{t('UNPAID')}</option>
            </select>
          </div>
          <button className="btn-outline" onClick={load}>{t('search')}</button>
          <button className="btn-gold" onClick={() => setShowRegister(true)}>{t('registerStudentCta')}</button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>{t('student')}</th>
              <th>{t('status')}</th>
              <th className="hidden sm:table-cell">{t('unpaidMonthsLabel')}</th>
              <th>{t('outstanding')}</th>
              <th className="hidden md:table-cell">{t('lastPaid')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              return (
                <tr key={r.studentId}>
                  <td className="font-medium text-ink">
                    <p>{lang === 'am' && r.fullNameAmharic ? r.fullNameAmharic : r.fullName}</p>
                    <p className="text-xs text-slate font-mono font-normal">{r.studentCode} · {r.className}{r.isWorkingMember ? (
  <span className="ml-1 inline-flex items-center rounded-full border border-gold bg-transparent px-2 py-0.5 text-[10px] font-medium text-ink">
    {t('workingMember')}
  </span>
) : ''}</p>
                  </td>
                  <td><Badge variant={r.status === 'PAID' ? 'paid' : r.status === 'PARTIAL' ? 'partial' : 'unpaid'}>{t(r.status)}</Badge></td>
                  <td className="hidden sm:table-cell">{r.unpaidMonths}</td>
                  <td className={r.outstandingBalance > 0 ? 'text-status-absent font-medium' : 'text-status-present'}>
                    {formatETB(r.outstandingBalance)}
                  </td>
                  <td className="hidden md:table-cell">
                    {r.lastPaymentDate ? (
                      <>
                        <p>{formatEthiopianDateFromGregorian(new Date(r.lastPaymentDate))}</p>
                        {r.lastPaymentMethod && (
                          <p className="text-xs text-slate mt-0.5">
                            {t(r.lastPaymentMethod)}
                            {r.lastPaymentMethod === 'BANK_TRANSFER' && r.lastPaymentAccountOwner ? ` · ${r.lastPaymentAccountOwner}` : ''}
                            {r.lastPaymentMethod === 'TELEBIRR_TRANSFER' && r.lastPaymentPhoneNumber ? ` · ${r.lastPaymentPhoneNumber}` : ''}
                          </p>
                        )}
                      </>
                    ) : '—'}
                  </td>
                  <td>
                    <button className="text-xs text-gold font-medium hover:underline" onClick={() => setModalStudent(r)}>
                      {t('recordPayment')}
                    </button>
                  </td>
                </tr>
              );
            })}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={6} className="text-center text-sm text-slate py-8">{t('noStudentsMatch')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modalStudent && (
        <RecordPaymentModal
          student={modalStudent}
          onClose={() => setModalStudent(null)}
          onSaved={() => { setModalStudent(null); load(); }}
        />
      )}

      {showRegister && (
        <RegisterModal classes={classes} onClose={() => setShowRegister(false)} onSaved={handleRegistered} />
      )}

      {paymentStudent && (
        <RecordPaymentModal
          student={paymentStudent}
          onClose={() => { setPaymentStudent(null); load(); }}
          onSaved={() => { setPaymentStudent(null); load(); }}
        />
      )}
    </div>
  );
}

interface Balance {
  monthlyBaseFee: number;
  currentMonthBase: number;
  previousUnpaidMonths: number;
  previousUnpaidTotal: number;
  totalDue: number;
}

function RecordPaymentModal({ student, onClose, onSaved }: { student: FeeRow; onClose: () => void; onSaved: () => void }) {
  const { t } = useLang();
  const [year, setYear] = useState(currentEthiopianYear());
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [amount, setAmount] = useState(String(student.monthlyBaseFee));
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [accountOwner, setAccountOwner] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [balance, setBalance] = useState<Balance | null>(null);

  useEffect(() => {
    api.get<Balance>(`/finance/student-fees/${student.studentId}/outstanding-balance`).then(setBalance);
  }, [student.studentId]);

  const feeYears = [2018, 2019, 2020, 2021];

  function changeYear(y: number) {
    setYear(y);
    setSelectedMonths([]);
  }

  const paidSet = new Set(
    student.months.filter((m) => m.status === 'PAID' && m.ethiopianYear === year).map((m) => m.month),
  );
  const inWindow = (m: (typeof ETHIOPIAN_MONTHS)[number]) =>
    m.value !== 'PAGUME' && (year > FEE_TRACKING_START_YEAR || m.order >= FEE_TRACKING_START_MONTH_ORDER);

  function toggleMonth(value: string) {
    setSelectedMonths((prev) => (prev.includes(value) ? prev.filter((m) => m !== value) : [...prev, value]));
  }

  const accountOwnerRequired = paymentMethod === 'BANK_TRANSFER';
  const phoneNumberRequired = paymentMethod === 'TELEBIRR_TRANSFER';

  async function submit() {
    if (selectedMonths.length === 0) return;
    setSaving(true);
    try {
      await api.post('/finance/student-fees/record-payment', {
        studentId: student.studentId,
        ethiopianYear: year,
        months: selectedMonths,
        amountPerMonth: Number(amount),
        paymentMethod,
        accountOwner: accountOwnerRequired ? accountOwner.trim() : undefined,
        phoneNumber: phoneNumberRequired ? phoneNumber.trim() : undefined,
        notes,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title={t('recordPaymentTitle', { name: student.fullName })} onClose={onClose}>
      {balance && (
        <div className="card p-3 mb-4 bg-mist border-0">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><p className="text-slate">{t('previousUnpaidMonths')}</p><p className="font-medium text-ink">{balance.previousUnpaidMonths} ({formatETB(balance.previousUnpaidTotal)})</p></div>
            <div><p className="text-slate">{t('currentMonthFee')}</p><p className="font-medium text-ink">{formatETB(balance.currentMonthBase)}</p></div>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between">
            <span className="text-xs font-medium text-slate">{t('totalAmountDue')}</span>
            <span className="text-sm font-semibold text-ink">{formatETB(balance.totalDue)}</span>
          </div>
        </div>
      )}

      <div className="mb-3">
        <label className="label">{t('ethiopianYearLabel')}</label>
        <select className="input" value={year} onChange={(e) => changeYear(Number(e.target.value))}>
          {feeYears.map((y) => (
            <option key={y} value={y}>{y} {t('era')}</option>
          ))}
        </select>
      </div>

      <p className="label mb-2">{t('selectMonthsToPay')}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
        {ETHIOPIAN_MONTHS.filter((m) => m.value !== 'PAGUME').map((m) => {
          const alreadyPaid = paidSet.has(m.value);
          const chargeable = inWindow(m);
          return (
            <button
              key={m.value}
              disabled={alreadyPaid || !chargeable}
              onClick={() => toggleMonth(m.value)}
              className={`text-sm py-2 rounded-lg border ${
                alreadyPaid
                  ? 'bg-green-50 border-green-200 text-status-present cursor-not-allowed'
                  : !chargeable
                  ? 'bg-gray-100 border-gray-200 text-slate/50 cursor-not-allowed'
                  : selectedMonths.includes(m.value)
                  ? 'bg-gold/10 border-gold text-ink'
                  : 'border-gray-200 hover:bg-mist'
              }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      <div className="card p-3 mb-3 bg-mist border-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate">{t('monthlyFee', { class: student.className })}</p>
            <p className="text-sm font-medium text-ink">{formatETB(Number(amount || 0))}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate">{t('monthsSelected')}</p>
            <p className="text-sm font-medium text-ink">{selectedMonths.length}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate">{t('totalAmount')}</p>
            <p className="text-base font-semibold text-gold">{formatETB(selectedMonths.length * Number(amount || 0))}</p>
          </div>
        </div>
      </div>

      <div className="mb-3">
        <label className="label">{t('amountPerMonth')}</label>
        <input className="input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <div className="mb-3">
        <label className="label">{t('paymentMethod')}</label>
        <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
          <option value="CASH">{t('CASH')}</option>
          <option value="BANK_TRANSFER">{t('BANK_TRANSFER')}</option>
          <option value="TELEBIRR_TRANSFER">{t('TELEBIRR_TRANSFER')}</option>
        </select>
      </div>
      {accountOwnerRequired && (
        <div className="mb-3">
          <label className="label">{t('accountOwner')}</label>
          <input className="input" value={accountOwner} onChange={(e) => setAccountOwner(e.target.value)} />
          {!accountOwner.trim() && (
            <p className="text-xs text-red-500">{t('accountOwnerRequiredHint')}</p>
          )}
        </div>
      )}
      {phoneNumberRequired && (
        <div className="mb-3">
          <label className="label">{t('phoneNumber')}</label>
          <input className="input" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
          {!phoneNumber.trim() && (
            <p className="text-xs text-red-500">{t('phoneNumberRequiredHint')}</p>
          )}
        </div>
      )}
      <div className="mb-4">
        <label className="label">{t('notesOptional')}</label>
        <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div className="flex justify-end gap-2">
        <button className="btn-outline" onClick={onClose}>{t('cancel')}</button>
        <button className="btn-gold" disabled={saving || selectedMonths.length === 0 || (accountOwnerRequired && !accountOwner.trim()) || (phoneNumberRequired && !phoneNumber.trim())} onClick={submit}>
          {saving ? t('saving') : t('saveAmount', { amount: formatETB(selectedMonths.length * Number(amount || 0)) })}
        </button>
      </div>
    </Modal>
  );
}