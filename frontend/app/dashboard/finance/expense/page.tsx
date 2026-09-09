'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatETB, formatEthiopianDateFromGregorian, ethiopianTodayISO } from '@/lib/ethiopian-calendar';
import { Topbar } from '@/components/layout/Topbar';
import { Modal } from '@/components/ui/Modal';
import { EthiopianDatePicker } from '@/components/EthiopianDatePicker';
import { useLang } from '@/lib/i18n';

const CATEGORIES = [
  'TEACHING_MATERIALS', 'STATIONERY', 'SNACKS', 'TRANSPORTATION',
  'EQUIPMENT', 'MAINTENANCE', 'EVENTS', 'CHARITY', 'DEVELOPMENT_DEPART', 'MISCELLANEOUS',
];
const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CHEQUE'];

interface Account { id: string; name: string; type: string; }

interface ExpenseRow {
  id: string;
  date: string;
  amount: number;
  category: string;
  description: string | null;
  recordedBy: { fullName: string };
}

export default function ExpensePage() {
  const { t } = useLang();
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const data = await api.get<ExpenseRow[]>('/finance/expenses');
    setRows(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <Topbar title={t('expenseManagement')} subtitle={t('expenseManagementSub')} />

      <div className="flex justify-end mb-4">
        <button className="btn-gold" onClick={() => setOpen(true)}>{t('recordExpense')}</button>
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
                <td>{r.description ?? '—'}</td>
                <td className="hidden md:table-cell">{r.recordedBy?.fullName}</td>
                <td className="text-right text-status-absent font-medium">{formatETB(Number(r.amount))}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={6} className="text-center text-sm text-slate py-8">{t('noExpensesYet')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {open && <ExpenseFormModal onClose={() => setOpen(false)} onSaved={() => { setOpen(false); load(); }} />}
    </div>
  );
}

function ExpenseFormModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { t } = useLang();
  const [date, setDate] = useState(ethiopianTodayISO());
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [accountId, setAccountId] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    api.get<Account[]>('/finance/accounts')
      .then((accs) => { setAccounts(accs); if (accs.length) setAccountId(accs[0].id); })
      .catch(() => {});
  }, []);

  const descriptionRequired = category === 'MISCELLANEOUS';
  const canSave = !saving && !!amount && !!paymentMethod && !!accountId &&
    (!descriptionRequired || !!description.trim());

  async function submit() {
    setSaving(true);
    try {
      await api.post('/finance/expenses', {
        date, amount: Number(amount), category, description, paymentMethod, accountId,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title={t('recordExpenseTitle')} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="label">{t('date')}</label>
          <EthiopianDatePicker value={date} onChange={(d) => setDate(d)} />
        </div>
        <div>
          <label className="label">{t('category')}</label>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{t(c)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">{t('paymentMethod')}</label>
          <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{t(m)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">{t('account')}</label>
          <select className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.length === 0 && <option value="">{t('noAccountsAvailable')}</option>}
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">{t('amountETB')}</label>
          <input type="number" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <label className="label">{t('description')}</label>
          {descriptionRequired && (
            <p className="text-xs text-gold mb-1">{t('specifyExpense')}</p>
          )}
          <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
          {descriptionRequired && !description.trim() && (
            <p className="text-xs text-red-500">{t('specifyExpenseHint')}</p>
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
