'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ETHIOPIAN_MONTHS, currentEthiopianYear, toEthiopian, monthLabel, formatETB, formatEthiopianDateFromGregorian } from '@/lib/ethiopian-calendar';
import { Topbar } from '@/components/layout/Topbar';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useLang } from '@/lib/i18n';

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
  lastPaidMonth: string | null;
  lastPaidYear: number | null;
  monthlyBaseFee: number;
  outstandingBalance: number;
  months: { month: string; status: string }[];
  selectedMonth: SelectedMonthRecord | null;
}
interface ClassGroup { id: string; name: string; }

const num = (v: number | string | null | undefined) => Number(v ?? 0);

export default function StudentFeesPage() {
  const { lang } = useLang();
  const today = toEthiopian(new Date());
  const defaultMonth = ETHIOPIAN_MONTHS.find((m) => m.order === today.month)?.value ?? 'MESKEREM';
  const [rows, setRows] = useState<FeeRow[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [search, setSearch] = useState('');
  const [classId, setClassId] = useState('');
  const [status, setStatus] = useState('');
  const [month, setMonth] = useState<string>(defaultMonth);
  const [loading, setLoading] = useState(true);
  const [modalStudent, setModalStudent] = useState<FeeRow | null>(null);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (classId) params.set('classId', classId);
    if (status) params.set('status', status);
    if (month) params.set('month', month);
    const data = await api.get<FeeRow[]>(`/finance/student-fees?${params.toString()}`);
    setRows(data);
    setLoading(false);
  }

  useEffect(() => { api.get<ClassGroup[]>('/students/classes').then(setClasses); }, []);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [classId, status, month]);

  return (
    <div>
      <Topbar title="Student Fee Management" subtitle="Fees follow class rules — 20 Birr (1-3), 30 Birr (4-6), 50 Birr (7-12), or 2% of salary for working members. Tracking starts at Nehase 2018 — no late penalties." />

      <div className="card p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label">Ethiopian month</label>
            <select className="input min-w-[160px]" value={month} onChange={(e) => setMonth(e.target.value)}>
              {ETHIOPIAN_MONTHS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="label">Search</label>
            <input className="input" placeholder="Name, ID, parent…" value={search}
              onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
          </div>
          <div>
            <label className="label">Class</label>
            <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">All classes</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Fee status</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              <option value="PAID">Paid</option>
              <option value="PARTIAL">Partial</option>
              <option value="UNPAID">Unpaid</option>
            </select>
          </div>
          <button className="btn-outline" onClick={load}>Search</button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Student</th>
              <th>Status</th>
              <th className="hidden sm:table-cell">Unpaid Months</th>
              <th>Outstanding</th>
              <th>{month ? `${monthLabel(month)} fee` : 'Month fee'}</th>
              <th className="hidden md:table-cell">Last Paid</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const sel = r.selectedMonth;
              return (
                <tr key={r.studentId}>
                  <td className="font-medium text-ink">
                    <p>{lang === 'am' && r.fullNameAmharic ? r.fullNameAmharic : r.fullName}</p>
                    <p className="text-xs text-slate font-mono font-normal">{r.studentCode} · {r.className}{r.isWorkingMember ? ' · Working Member' : ''}</p>
                  </td>
                  <td><Badge variant={r.status === 'PAID' ? 'paid' : r.status === 'PARTIAL' ? 'partial' : 'unpaid'}>{r.status}</Badge></td>
                  <td className="hidden sm:table-cell">{r.unpaidMonths}</td>
                  <td className={r.outstandingBalance > 0 ? 'text-status-absent font-medium' : 'text-status-present'}>
                    {formatETB(r.outstandingBalance)}
                  </td>
                  <td>
                    {sel ? (
                      <div>
                        <Badge variant={sel.status === 'PAID' ? 'paid' : 'unpaid'}>{sel.status}</Badge>
                        <p className="text-sm text-ink font-medium mt-1">{formatETB(num(sel.amount))}</p>
                        <p className="text-[10px] text-slate">{formatETB(num(sel.baseAmount))}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-slate">Not generated</span>
                    )}
                  </td>
                  <td className="hidden md:table-cell">{r.lastPaymentDate ? formatEthiopianDateFromGregorian(new Date(r.lastPaymentDate)) : '—'}</td>
                  <td>
                    <button className="text-xs text-gold font-medium hover:underline" onClick={() => setModalStudent(r)}>
                      Record Payment
                    </button>
                  </td>
                </tr>
              );
            })}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={7} className="text-center text-sm text-slate py-8">No students match this filter.</td></tr>
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
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [amount, setAmount] = useState(String(student.monthlyBaseFee));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [balance, setBalance] = useState<Balance | null>(null);

  useEffect(() => {
    api.get<Balance>(`/finance/student-fees/${student.studentId}/outstanding-balance`).then(setBalance);
  }, [student.studentId]);

  const paidSet = new Set(student.months.filter((m) => m.status === 'PAID').map((m) => m.month));

  function toggleMonth(value: string) {
    setSelectedMonths((prev) => (prev.includes(value) ? prev.filter((m) => m !== value) : [...prev, value]));
  }

  async function submit() {
    if (selectedMonths.length === 0) return;
    setSaving(true);
    try {
      await api.post('/finance/student-fees/record-payment', {
        studentId: student.studentId,
        ethiopianYear: currentEthiopianYear(),
        months: selectedMonths,
        amountPerMonth: Number(amount),
        notes,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title={`Record Payment — ${student.fullName}`} onClose={onClose}>
      {balance && (
        <div className="card p-3 mb-4 bg-mist border-0">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><p className="text-slate">Previous unpaid months</p><p className="font-medium text-ink">{balance.previousUnpaidMonths} ({formatETB(balance.previousUnpaidTotal)})</p></div>
            <div><p className="text-slate">Current month fee</p><p className="font-medium text-ink">{formatETB(balance.currentMonthBase)}</p></div>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between">
            <span className="text-xs font-medium text-slate">Total Amount Due</span>
            <span className="text-sm font-semibold text-ink">{formatETB(balance.totalDue)}</span>
          </div>
        </div>
      )}

      <p className="label mb-2">Select Ethiopian month(s) to mark as paid</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
        {ETHIOPIAN_MONTHS.map((m) => {
          const alreadyPaid = paidSet.has(m.value);
          return (
            <button
              key={m.value}
              disabled={alreadyPaid}
              onClick={() => toggleMonth(m.value)}
              className={`text-sm py-2 rounded-lg border ${
                alreadyPaid
                  ? 'bg-green-50 border-green-200 text-status-present cursor-not-allowed'
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
            <p className="text-xs text-slate">Monthly fee ({student.className})</p>
            <p className="text-sm font-medium text-ink">{formatETB(Number(amount || 0))}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate">Months selected</p>
            <p className="text-sm font-medium text-ink">{selectedMonths.length}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate">Total Amount</p>
            <p className="text-base font-semibold text-gold">{formatETB(selectedMonths.length * Number(amount || 0))}</p>
          </div>
        </div>
      </div>

      <div className="mb-3">
        <label className="label">Amount per month (ETB) — defaults to the class/working-member rule</label>
        <input className="input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <div className="mb-4">
        <label className="label">Notes (optional)</label>
        <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div className="flex justify-end gap-2">
        <button className="btn-outline" onClick={onClose}>Cancel</button>
        <button className="btn-gold" disabled={saving || selectedMonths.length === 0} onClick={submit}>
          {saving ? 'Saving…' : `Save (${formatETB(selectedMonths.length * Number(amount || 0))})`}
        </button>
      </div>
    </Modal>
  );
}
