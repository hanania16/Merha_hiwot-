'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatETB, formatEthiopianDateFromGregorian, ethiopianTodayISO } from '@/lib/ethiopian-calendar';
import { Topbar } from '@/components/layout/Topbar';
import { Modal } from '@/components/ui/Modal';
import { EthiopianDatePicker } from '@/components/EthiopianDatePicker';

const CATEGORIES = [
  'TEACHING_MATERIALS', 'STATIONERY', 'SNACKS', 'TRANSPORTATION',
  'EQUIPMENT', 'MAINTENANCE', 'EVENTS', 'CHARITY', 'MISCELLANEOUS',
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
  approvedBy: { fullName: string } | null;
}

export default function ExpensePage() {
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
      <Topbar title="Expense Management" subtitle="Teaching materials, events, maintenance, and more" />

      <div className="flex justify-end mb-4">
        <button className="btn-gold" onClick={() => setOpen(true)}>+ Record Expense</button>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr><th>Date</th><th>Category</th><th>Description</th><th>Recorded By</th><th>Approved By</th><th className="text-right">Amount</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{formatEthiopianDateFromGregorian(new Date(r.date))}</td>
                <td>{r.category.replace(/_/g, ' ')}</td>
                <td>{r.description ?? '—'}</td>
                <td>{r.recordedBy?.fullName}</td>
                <td>{r.approvedBy?.fullName ?? '—'}</td>
                <td className="text-right text-status-absent font-medium">{formatETB(Number(r.amount))}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={6} className="text-center text-sm text-slate py-8">No expenses recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {open && <ExpenseFormModal onClose={() => setOpen(false)} onSaved={() => { setOpen(false); load(); }} />}
    </div>
  );
}

function ExpenseFormModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
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
    <Modal open title="Record Expense" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="label">Date</label>
          <EthiopianDatePicker value={date} onChange={(d) => setDate(d)} />
        </div>
        <div>
          <label className="label">Category</label>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Payment Method</label>
          <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Account</label>
          <select className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.length === 0 && <option value="">No accounts available</option>}
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Amount (ETB)</label>
          <input type="number" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <label className="label">Description</label>
          <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-gold" disabled={saving || !amount || !paymentMethod || !accountId} onClick={submit}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
