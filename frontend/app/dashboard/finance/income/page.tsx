'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { formatETB, formatEthiopianDateFromGregorian, ethiopianTodayISO, ethiopianMonthStart, ethiopianMonthEnd } from '@/lib/ethiopian-calendar';
import { Topbar } from '@/components/layout/Topbar';
import { Modal } from '@/components/ui/Modal';
import { EthiopianDatePicker } from '@/components/EthiopianDatePicker';
import { EthiopianMonthPicker, getCurrentEthiopianMonth } from '@/components/EthiopianMonthPicker';
import { useLang } from '@/lib/i18n';
import { ChevronDown } from 'lucide-react';

const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER'];
const SOURCE_OPTIONS = [
  { value: 'DONATION', sourceType: 'DONATION' },
  { value: 'SPECIAL_OFFERING', sourceType: 'SPECIAL_OFFERING' },
  { value: 'DEBRE_TABOR_FEAST', sourceType: 'DEBRE_TABOR_FEAST' },
  { value: 'NEW_YEAR', sourceType: 'NEW_YEAR' },
  { value: 'MESKEL_FEAST', sourceType: 'MESKEL_FEAST' },
  { value: 'DEVELOPMENT_DEPART', sourceType: 'OTHER' },
  { value: 'OTHERS', sourceType: 'OTHER' },
];

interface IncomeRow {
  id: string;
  date: string;
  amount: number;
  category: string;
  sourceType: string;
  description: string | null;
  senderName: string | null;
  senderAccountNumber: string | null;
  recordedBy: { fullName: string };
}

interface PaymentDetail {
  id: string;
  studentCode: string;
  studentName: string;
  ethiopianYear: number;
  month: string;
  amount: number;
  paidDate: string | null;
  paymentMethod: string | null;
}

interface ClassPaymentsGroup {
  classLevel: string;
  label: string;
  payments: PaymentDetail[];
}

export default function IncomePage() {
  const { t } = useLang();
  const [rows, setRows] = useState<IncomeRow[]>([]);
  const [classPayments, setClassPayments] = useState<ClassPaymentsGroup[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const currentMonth = getCurrentEthiopianMonth();
  const [filterYear, setFilterYear] = useState(currentMonth.year);
  const [filterMonth, setFilterMonth] = useState(currentMonth.monthOrder);

  const user = getCurrentUser();
  const canRecord = user?.role === 'ADMINISTRATOR' || user?.role === 'FINANCE_OFFICER';

  async function load() {
    setLoading(true);
    const from = ethiopianMonthStart(filterYear, filterMonth);
    const to = ethiopianMonthEnd(filterYear, filterMonth);
    const [allRows, payments] = await Promise.all([
      api.get<IncomeRow[]>(`/finance/income?from=${from}&to=${to}`),
      api.get<ClassPaymentsGroup[]>(`/finance/student-fees/payments-by-class?from=${from}&to=${to}`),
    ]);
    setRows(allRows);
    setClassPayments(payments);
    setLoading(false);
  }

  useEffect(() => { load(); }, [filterYear, filterMonth]);

  function toggleGroup(classLevel: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(classLevel)) {
        next.delete(classLevel);
      } else {
        next.add(classLevel);
      }
      return next;
    });
  }

  // Filter out STUDENT_FEE rows from the main table (they're shown in the grouped section)
  const otherRows = rows.filter((r) => r.sourceType !== 'STUDENT_FEE');

  return (
    <div>
      <Topbar title={t('incomeManagement')} subtitle={t('incomeManagementSub')} />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <EthiopianMonthPicker year={filterYear} monthOrder={filterMonth} onChange={(y, m) => { setFilterYear(y); setFilterMonth(m); }} />
        {canRecord && (
          <button className="btn-gold" onClick={() => setOpen(true)}>{t('recordIncome')}</button>
        )}
      </div>

      {/* Student Fee Income — grouped by class level */}
      {classPayments.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-ink mb-3">{t('STUDENT_FEES')}</h2>
          <div className="space-y-3">
            {classPayments.map((g) => {
              const isExpanded = expandedGroups.has(g.classLevel);
              const total = g.payments.reduce((sum, p) => sum + p.amount, 0);
              return (
                <div key={g.classLevel} className="card overflow-hidden">
                  {/* Collapsible header */}
                  <button
                    onClick={() => toggleGroup(g.classLevel)}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <ChevronDown
                        size={18}
                        className={`text-slate transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      />
                      <div>
                        <p className="text-sm font-medium text-ink">{t('class')} {g.label}</p>
                        <p className="text-xs text-slate">{g.payments.length} {t('records')}</p>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-status-present">{formatETB(total)}</p>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && g.payments.length > 0 && (
                    <div className="border-t border-slate-100">
                      <table className="table-base">
                        <thead>
                          <tr>
                            <th>{t('studentCode')}</th>
                            <th>{t('name')}</th>
                            <th>{t('month')}</th>
                            <th>{t('date')}</th>
                            <th className="hidden md:table-cell">{t('paymentMethod')}</th>
                            <th className="text-right">{t('amount')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.payments.map((p) => (
                            <tr key={p.id}>
                              <td className="text-xs font-mono">{p.studentCode}</td>
                              <td>{p.studentName}</td>
                              <td className="text-sm">{p.month} {p.ethiopianYear}</td>
                              <td className="text-sm">
                                {p.paidDate ? formatEthiopianDateFromGregorian(new Date(p.paidDate)) : '—'}
                              </td>
                              <td className="hidden md:table-cell text-sm">{p.paymentMethod ? t(p.paymentMethod) : '—'}</td>
                              <td className="text-right text-status-present font-medium">{formatETB(p.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {isExpanded && g.payments.length === 0 && (
                    <div className="border-t border-slate-100 p-4 text-sm text-slate text-center">
                      {t('noIncomeYet')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Other Income */}
      <div>
        <h2 className="text-lg font-semibold text-ink mb-3">{t('income')}</h2>
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr><th>{t('date')}</th><th>{t('category')}</th><th>{t('description')}</th><th className="hidden md:table-cell">{t('recordedBy')}</th><th className="text-right">{t('amount')}</th></tr>
            </thead>
            <tbody>
              {otherRows.map((r) => (
                <tr key={r.id}>
                  <td>{formatEthiopianDateFromGregorian(new Date(r.date))}</td>
                  <td>{t(r.category)}</td>
                  <td>
                    {r.description ?? '—'}
                    {(r.senderName || r.senderAccountNumber) && (
                      <p className="text-xs text-slate mt-0.5">
                        {r.senderName}{r.senderName && r.senderAccountNumber ? ' · ' : ''}{r.senderAccountNumber}
                      </p>
                    )}
                  </td>
                  <td className="hidden md:table-cell">{r.recordedBy?.fullName}</td>
                  <td className="text-right text-status-present font-medium">{formatETB(Number(r.amount))}</td>
                </tr>
              ))}
              {!loading && otherRows.length === 0 && (
                <tr><td colSpan={5} className="text-center text-sm text-slate py-8">{t('noIncomeYet')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {open && <IncomeFormModal onClose={() => setOpen(false)} onSaved={() => { setOpen(false); load(); }} />}
    </div>
  );
}

function IncomeFormModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { t } = useLang();
  const [date, setDate] = useState(ethiopianTodayISO());
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState(SOURCE_OPTIONS[0].value);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [senderName, setSenderName] = useState('');
  const [senderAccountNumber, setSenderAccountNumber] = useState('');

  const selectedSource = SOURCE_OPTIONS.find((o) => o.value === source) ?? SOURCE_OPTIONS[0];
  const othersValid = selectedSource.value !== 'OTHERS' || description.trim().split(/\s+/).length >= 3;
  const isTransfer = paymentMethod === 'BANK_TRANSFER';
  const canSave = !saving && !!amount && (isTransfer ? !!senderName.trim() : true) && othersValid;

  async function submit() {
    setSaving(true);
    try {
      await api.post('/finance/income', {
        date,
        amount: Number(amount),
        sourceType: selectedSource.sourceType,
        paymentMethod,
        senderName: isTransfer ? senderName.trim() : undefined,
        senderAccountNumber: isTransfer ? senderAccountNumber.trim() || undefined : undefined,
        description,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title={t('recordIncomeTitle')} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="label">{t('date')}</label>
          <EthiopianDatePicker value={date} onChange={(d) => setDate(d)} />
        </div>
        <div>
          <label className="label">{t('sourceType')}</label>
          <select className="input" value={source} onChange={(e) => setSource(e.target.value)}>
            {SOURCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{t(o.value)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">{t('paymentMethod')}</label>
          <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{t(m)}</option>)}
          </select>
        </div>
        {isTransfer && (
          <>
            <div>
              <label className="label">{t('accountOwnerName')}</label>
              <input className="input" value={senderName} onChange={(e) => setSenderName(e.target.value)} />
              {isTransfer && !senderName.trim() && (
                <p className="text-xs text-red-500">{t('accountOwnerNameRequiredHint')}</p>
              )}
            </div>
            <div>
              <label className="label">{t('transferAccountNumber')}</label>
              <input className="input" value={senderAccountNumber} onChange={(e) => setSenderAccountNumber(e.target.value)} />
            </div>
          </>
        )}
        <div>
          <label className="label">{t('amountETB')}</label>
          <input type="number" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <label className="label">{t('description')}</label>
          {selectedSource.value === 'OTHERS' && (
            <p className="text-xs text-gold mb-1">{t('specifyIncome')}</p>
          )}
          <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
          {selectedSource.value === 'OTHERS' && !othersValid && (
            <p className="text-xs text-red-500">{t('specifyIncomeHint')}</p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn-outline" onClick={onClose}>{t('cancel')}</button>
          <button className="btn-gold" disabled={!canSave} onClick={submit}>
            {saving ? t('saving') : t('save')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
