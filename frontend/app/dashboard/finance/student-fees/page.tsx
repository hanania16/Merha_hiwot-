'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ETHIOPIAN_MONTHS, currentEthiopianYear, toEthiopian, formatETB, formatEthiopianDateFromGregorian } from '@/lib/ethiopian-calendar';
import { Topbar } from '@/components/layout/Topbar';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useLang } from '@/lib/i18n';

/** Fee tracking window starts at Nehase 2018 — same as backend fee-rules.ts. */
const FEE_TRACKING_START_YEAR = 2018;
const FEES_PER_YEAR = 13;
/** Only the most recent months are shown inline; full range behind a per-row toggle. */
const INLINE_MONTHS = 6;

const ENGLISH_MONTH_NAMES: Record<string, string> = {
  MESKEREM: 'Meskerem', TIKIMT: 'Tikimt', HIDAR: 'Hidar', TAHSAS: 'Tahsas', TIR: 'Tir',
  YEKATIT: 'Yekatit', MEGABIT: 'Megabit', MIYAZIA: 'Miyazia', GINBOT: 'Ginbot', SENE: 'Sene',
  HAMLE: 'Hamle', NEHASE: 'Nehase', PAGUME: 'Pagume',
};

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
  months: { month: string; status: string; amount: number | string }[];
  selectedMonth: SelectedMonthRecord | null;
}
interface ClassGroup { id: string; name: string; }

const num = (v: number | string | null | undefined) => Number(v ?? 0);

/** Ordered {value,label,year} cells from Nehase 2018 through the current Ethiopian month. */
function buildMonthWindow() {
  const today = toEthiopian(new Date());
  const cells: { value: string; label: string; year: number }[] = [];
  let year = FEE_TRACKING_START_YEAR;
  let order = 12; // Nehase
  while (year < today.year || (year === today.year && order <= today.month)) {
    const m = ETHIOPIAN_MONTHS.find((x) => x.order === order);
    if (m) cells.push({ value: m.value, label: m.label, year });
    order += 1;
    if (order > FEES_PER_YEAR) {
      order = 1;
      year += 1;
    }
  }
  return cells;
}

const WINDOW = buildMonthWindow();
const LAST_SIX = WINDOW.slice(-INLINE_MONTHS);

function MonthDot({
  payment,
  year,
  value,
}: {
  payment: { status: string; amount: number | string } | undefined;
  year: number;
  value: string;
}) {
  const paid = payment?.status === 'PAID';
  const english = ENGLISH_MONTH_NAMES[value] ?? value;
  const amount = paid && payment ? formatETB(num(payment.amount)) : null;
  return (
    <span
      aria-label={`${english} ${year} — ${paid ? 'Paid' : 'Unpaid'}${amount ? `, ${amount}` : ''}`}
      title={`${english} ${year} — ${paid ? `Paid, ${amount}` : 'Unpaid'}`}
      className={`inline-block w-3 h-3 rounded-full border border-transparent ${
        paid
          ? 'bg-status-present'
          : 'bg-gray-200'
      } hover:ring-2 hover:ring-gold/60 cursor-default`}
    />
  );
}

export default function StudentFeesPage() {
  const { lang } = useLang();
  const [rows, setRows] = useState<FeeRow[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [search, setSearch] = useState('');
  const [classId, setClassId] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalStudent, setModalStudent] = useState<FeeRow | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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

  useEffect(() => { api.get<ClassGroup[]>('/students/classes').then(setClasses); }, []);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [classId, status]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function monthStatusMap(r: FeeRow) {
    const map = new Map<string, { status: string; amount: number | string }>();
    for (const p of r.months) map.set(`${r.studentId}:${p.month}`, p);
    return map;
  }

  return (
    <div>
      <Topbar title="Student Fee Management" subtitle="Fees follow class rules — 20 Birr (1-3), 30 Birr (4-6), 50 Birr (7-12), or 2% of salary for working members. Tracking starts at Nehase 2018 — no late penalties." />

      <div className="card p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
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
              <th className="whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Payment History</span>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-normal text-slate">
                    <span className="inline-block w-2 h-2 rounded-full bg-status-present" title="Paid" /> paid
                    <span className="inline-block w-2 h-2 rounded-full bg-gray-200" title="Unpaid" /> unpaid
                  </span>
                </div>
                <p className="text-[10px] font-normal text-slate mt-0.5">
                  {LAST_SIX.length < WINDOW.length
                    ? `Most recent ${LAST_SIX.length} months since Nehase ${FEE_TRACKING_START_YEAR} shown`
                    : `Since Nehase ${FEE_TRACKING_START_YEAR}`} · hover a dot for details
                </p>
              </th>
              <th className="hidden md:table-cell">Last Paid</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const map = monthStatusMap(r);
              const showFull = expanded.has(r.studentId);
              const cells = showFull ? WINDOW : LAST_SIX;
              return (
                <tr key={r.studentId}>
                  <td className="font-medium text-ink">
                    <p>{lang === 'am' && r.fullNameAmharic ? r.fullNameAmharic : r.fullName}</p>
                    <p className="text-xs text-slate font-mono font-normal">{r.studentCode} · {r.className}{r.isWorkingMember ? (
  <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-gold/50 bg-gold/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink">
    <span className="h-1.5 w-1.5 rounded-full bg-gold shadow-[0_0_4px_rgba(212,175,55,0.8)]" />
    Working Member
  </span>
) : ''}</p>
                  </td>
                  <td><Badge variant={r.status === 'PAID' ? 'paid' : r.status === 'PARTIAL' ? 'partial' : 'unpaid'}>{r.status}</Badge></td>
                  <td className="hidden sm:table-cell">{r.unpaidMonths}</td>
                  <td className={r.outstandingBalance > 0 ? 'text-status-absent font-medium' : 'text-status-present'}>
                    {formatETB(r.outstandingBalance)}
                  </td>
                  <td>
                    <div className="flex items-center gap-[4px] py-1 whitespace-nowrap">
                      {cells.map((c) => (
                        <MonthDot key={`${c.value}${c.year}`} payment={map.get(`${r.studentId}:${c.value}`)} year={c.year} value={c.value} />
                      ))}
                      {WINDOW.length > INLINE_MONTHS && (
                        <button
                          className="ml-1.5 text-[10px] text-gold font-medium hover:underline whitespace-nowrap"
                          onClick={() => toggleExpand(r.studentId)}
                        >
                          {showFull ? 'Show less' : `Show all ${WINDOW.length}`}
                        </button>
                      )}
                    </div>
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