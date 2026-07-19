'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatETB } from '@/lib/ethiopian-calendar';
import { Topbar } from '@/components/layout/Topbar';
import { Modal } from '@/components/ui/Modal';

const CATEGORIES = [
  'TEACHING_MATERIALS', 'STATIONERY', 'SNACKS', 'TRANSPORTATION',
  'EQUIPMENT', 'MAINTENANCE', 'EVENTS', 'CHARITY', 'MISCELLANEOUS',
];

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
                <td>{new Date(r.date).toLocaleDateString()}</td>
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
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      await api.post('/finance/expenses', { date, amount: Number(amount), category, description });
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
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Category</label>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
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
          <button className="btn-gold" disabled={saving || !amount} onClick={submit}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
