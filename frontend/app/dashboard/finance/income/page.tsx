'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { canAccessFinance, getCurrentUser } from '@/lib/auth';
import { formatETB, formatEthiopianDateFromGregorian, ethiopianTodayISO } from '@/lib/ethiopian-calendar';
import { Topbar } from '@/components/layout/Topbar';
import { Modal } from '@/components/ui/Modal';
import { EthiopianDatePicker } from '@/components/EthiopianDatePicker';
import { useLang } from '@/lib/i18n';

const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER'];
// Student fees are recorded automatically on the 26th of each Ethiopian month,
// so the manual Student Fee source type is intentionally not offered here.
const SOURCE_OPTIONS = [
  { value: 'DONATION', sourceType: 'DONATION' },
  { value: 'CHURCH_CONTRIBUTION', sourceType: 'CHURCH_CONTRIBUTION' },
  { value: 'FUNDRAISING', sourceType: 'FUNDRAISING' },
  { value: 'SPECIAL_OFFERING', sourceType: 'SPECIAL_OFFERING' },
  { value: 'DEBRE_TABOR_FEAST', sourceType: 'DEBRE_TABOR_FEAST' },
  { value: 'NEW_YEAR', sourceType: 'NEW_YEAR' },
  { value: 'MESKEL_FEAST', sourceType: 'MESKEL_FEAST' },
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

export default function IncomePage() {
  const { t } = useLang();
  const [rows, setRows] = useState<IncomeRow[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchMsg, setBatchMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const canBatch = canAccessFinance(getCurrentUser());

  async function load() {
    setLoading(true);
    const data = await api.get<IncomeRow[]>('/finance/income');
    setRows(data);
    setLoading(false);
  }

  async function runFeeBatch() {
    setBatchRunning(true);
    setBatchMsg(null);
    try {
      const res = await api.post<{ alreadyRecorded: boolean; results: { studentCount: number }[] }>(
        '/finance/income/record-monthly-class-income',
      );
      const booked = (res.results ?? []).reduce((s: number, r: { studentCount: number }) => s + (r.studentCount ?? 0), 0);
      setBatchMsg({
        ok: true,
        text: booked > 0
          ? t(booked === 1 ? 'feeBatchDoneOne' : 'feeBatchDoneMany', { n: booked })
          : t('feeBatchIdle'),
      });
      await load();
    } catch (e) {
      const msg = (e as { message?: string })?.message ?? String(e);
      setBatchMsg({ ok: false, text: t('feeBatchError', { error: msg }) });
    } finally {
      setBatchRunning(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <Topbar title={t('incomeManagement')} subtitle={t('incomeManagementSub')} />

      <div className="mb-4 rounded-lg border border-gold/20 bg-gold/5 px-4 py-3 text-xs text-slate">
        {t('incomeBatchNote')}
        <span className="font-semibold text-ink"> {t('STUDENT_FEES')} </span>
        {t('incomeBatchNote2')}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 mb-4">
        {canBatch && (
          <button
            className="btn-outline"
            onClick={runFeeBatch}
            disabled={batchRunning}
          >
            {batchRunning ? t('feeBatchRunning') : t('runFeeBatchNow')}
          </button>
        )}
        {batchMsg && (
          <span className={`text-xs ${batchMsg.ok ? 'text-status-present' : 'text-red-500'}`}>{batchMsg.text}</span>
        )}
        <button className="btn-gold" onClick={() => setOpen(true)}>{t('recordIncome')}</button>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr><th>{t('date')}</th><th>{t('category')}</th><th>{t('description')}</th><th className="hidden md:table-cell">{t('recordedBy')}</th><th className="text-right">{t('amount')}</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
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
            {!loading && rows.length === 0 && (
              <tr><td colSpan={5} className="text-center text-sm text-slate py-8">{t('noIncomeYet')}</td></tr>
            )}
          </tbody>
        </table>
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
          <p className="text-xs text-slate mt-1">{t('incomeAutoNote')}</p>
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