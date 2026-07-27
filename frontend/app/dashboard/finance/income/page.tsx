'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatETB, formatEthiopianDateFromGregorian, ethiopianTodayISO } from '@/lib/ethiopian-calendar';
import { Topbar } from '@/components/layout/Topbar';
import { Modal } from '@/components/ui/Modal';
import { EthiopianDatePicker } from '@/components/EthiopianDatePicker';

const CATEGORIES = ['STUDENT_FEES', 'DONATIONS', 'DEVELOPMENT_DEPART', 'OTHERS'];

interface IncomeRow {
  id: string;
  date: string;
  amount: number;
  category: string;
  description: string | null;
  recordedBy: { fullName: string };
}

export default function IncomePage() {
  const [rows, setRows] = useState<IncomeRow[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const data = await api.get<IncomeRow[]>('/finance/income');
    setRows(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <Topbar title="Income Management" subtitle="Student fees, donations, development department, and other income" />

      <div className="flex justify-end mb-4">
        <button className="btn-gold" onClick={() => setOpen(true)}>+ Record Income</button>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr><th>Date</th><th>Category</th><th>Description</th><th>Recorded By</th><th className="text-right">Amount</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{formatEthiopianDateFromGregorian(new Date(r.date))}</td>
                <td>{r.category.replace(/_/g, ' ')}</td>
                <td>{r.description ?? '—'}</td>
                <td>{r.recordedBy?.fullName}</td>
                <td className="text-right text-status-present font-medium">{formatETB(Number(r.amount))}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={5} className="text-center text-sm text-slate py-8">No income recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {open && <IncomeFormModal onClose={() => setOpen(false)} onSaved={() => { setOpen(false); load(); }} />}
    </div>
  );
}

function IncomeFormModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [date, setDate] = useState(ethiopianTodayISO());
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const othersValid = category !== 'OTHERS' || description.trim().split(/\s+/).length >= 3;
  const canSave = !saving && !!amount && othersValid;

  async function submit() {
    setSaving(true);
    try {
      await api.post('/finance/income', { date, amount: Number(amount), category, description });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title="Record Income" onClose={onClose}>
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
          <label className="label">Amount (ETB)</label>
          <input type="number" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <label className="label">Description</label>
          {category === 'OTHERS' && (
            <p className="text-xs text-gold mb-1">Please specify what kind of income this is in the description below.</p>
          )}
          <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
          {category === 'OTHERS' && !othersValid && (
            <p className="text-xs text-red-500">Please enter at least 3 words describing this income.</p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-gold" disabled={!canSave} onClick={submit}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
