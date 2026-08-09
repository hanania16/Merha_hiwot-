'use client';

import { useEffect, useState } from 'react';
import { api, downloadUrl } from '@/lib/api';
import { ETHIOPIAN_MONTHS, currentEthiopianYear, ethiopianTodayISO, formatETB, formatEthiopianDateFromGregorian, monthLabel, toEthiopian } from '@/lib/ethiopian-calendar';
import { Topbar } from '@/components/layout/Topbar';
import { EthiopianDatePicker } from '@/components/EthiopianDatePicker';

type Tab = 'period' | 'monthly' | 'yearly' | 'history';

interface FinancialReport {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  collectionRate: number;
  donations: number;
  outstandingFeeMonths: number;
  expenseByCategory: Record<string, number>;
  incomeByCategory: Record<string, number>;
}

interface ReportSummary {
  totalIncome: number;
  totalExpense: number;
  net: number;
  incomeCount: number;
  expenseCount: number;
}

interface TransactionRow {
  id: string;
  date: string;
  category: string;
  sourceType?: string;
  amount: number;
  description: string | null;
  recordedByName: string | null;
}

interface ReportData {
  kind: string;
  period: { from: string; to: string };
  summary: ReportSummary;
  incomeBySourceType: Record<string, { total: number; count: number }>;
  expenseByCategory: Record<string, { total: number; count: number }>;
  transactions: { income: TransactionRow[]; expense: TransactionRow[] };
}

interface HistoryItem {
  id: string;
  type: 'MONTHLY' | 'YEARLY';
  ethiopianYear: number;
  month: string | null;
  summary: ReportSummary;
  createdAt: string;
  updatedAt: string;
}

const MONTH_OPTIONS = ETHIOPIAN_MONTHS.map((m) => ({ value: m.order, label: m.label }));

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('period');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'period', label: 'Period Report' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'yearly', label: 'Yearly' },
    { key: 'history', label: 'Report History' },
  ];

  return (
    <div>
      <Topbar title="Financial Reports" subtitle="Daily, monthly, and yearly reports with saved history" />

      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-gold text-white' : 'bg-white border border-slate/20 text-slate hover:border-gold'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'period' && <PeriodReport />}
      {tab === 'monthly' && <MonthlyReport />}
      {tab === 'yearly' && <YearlyReport />}
      {tab === 'history' && <ReportHistory />}
    </div>
  );
}

/* ---------------- Period report (custom from/to) ---------------- */

function PeriodReport() {
  const [from, setFrom] = useState(ethiopianTodayISO());
  const [to, setTo] = useState(ethiopianTodayISO());
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const data = await api.get<FinancialReport>(`/finance/reports/financial?from=${from}&to=${to}`);
      setReport(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="card p-4 mb-6 flex flex-wrap items-end gap-3">
        <div>
          <label className="label">From</label>
          <EthiopianDatePicker value={from} onChange={(d) => setFrom(d)} />
        </div>
        <div>
          <label className="label">To</label>
          <EthiopianDatePicker value={to} onChange={(d) => setTo(d)} />
        </div>
        <button className="btn-outline" onClick={generate} disabled={loading}>
          {loading ? 'Generating…' : 'Generate Report'}
        </button>
        <a className="btn-gold" href={downloadUrl(`/finance/reports/financial/export/pdf?from=${from}&to=${to}`)} target="_blank" rel="noreferrer">
          Export PDF
        </a>
        <a className="btn-outline" href={downloadUrl(`/finance/reports/financial/export/excel?from=${from}&to=${to}`)} target="_blank" rel="noreferrer">
          Export Excel
        </a>
      </div>

      {report && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="card p-5">
              <p className="text-xs text-slate uppercase">Total Income</p>
              <p className="text-2xl font-semibold text-status-present mt-2">{formatETB(report.totalIncome)}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs text-slate uppercase">Total Expenses</p>
              <p className="text-2xl font-semibold text-status-absent mt-2">{formatETB(report.totalExpense)}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs text-slate uppercase">Balance</p>
              <p className="text-2xl font-semibold text-gold mt-2">{formatETB(report.balance)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="card p-5">
              <p className="text-xs text-slate uppercase">Collection Rate</p>
              <p className="text-xl font-semibold text-ink mt-2">{report.collectionRate}%</p>
            </div>
            <div className="card p-5">
              <p className="text-xs text-slate uppercase">Donations</p>
              <p className="text-xl font-semibold text-ink mt-2">{formatETB(report.donations)}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs text-slate uppercase">Outstanding Fee-Months</p>
              <p className="text-xl font-semibold text-ink mt-2">{report.outstandingFeeMonths}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="card p-6">
              <h2 className="text-sm font-semibold text-ink mb-4">Incomes by Category</h2>
              <table className="table-base">
                <thead><tr><th>Category</th><th className="text-right">Amount</th></tr></thead>
                <tbody>
                  {Object.entries(report.incomeByCategory).map(([cat, amt]) => (
                    <tr key={cat}>
                      <td>{cat.replace(/_/g, ' ')}</td>
                      <td className="text-right">{formatETB(Number(amt))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card p-6">
              <h2 className="text-sm font-semibold text-ink mb-4">Expenses by Category</h2>
              <table className="table-base">
                <thead><tr><th>Category</th><th className="text-right">Amount</th></tr></thead>
                <tbody>
                  {Object.entries(report.expenseByCategory).map(([cat, amt]) => (
                    <tr key={cat}>
                      <td>{cat.replace(/_/g, ' ')}</td>
                      <td className="text-right">{formatETB(Number(amt))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- Monthly / Yearly on-demand reports ---------------- */

function MonthlyReport() {
  const [year, setYear] = useState(currentEthiopianYear());
  const [month, setMonth] = useState<number>(toEthiopian(new Date()).month);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const data = await api.get<ReportData>(`/finance/reports/monthly?year=${year}&month=${month}`);
      setReport(data);
    } finally {
      setLoading(false);
    }
  }

  async function saveSnapshot() {
    setSaving(true);
    try {
      await api.post('/finance/reports/snapshot', { type: 'MONTHLY', year, month });
      alert('Monthly report saved to history.');
    } finally {
      setSaving(false);
    }
  }

  const monthEnum = ETHIOPIAN_MONTHS.find((m) => m.order === month)?.value ?? '';

  return (
    <div>
      <div className="card p-4 mb-6 flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Ethiopian Year</label>
          <input type="number" className="input w-32" value={year} onChange={(e) => setYear(Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Month</label>
          <select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTH_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <button className="btn-outline" onClick={generate} disabled={loading}>
          {loading ? 'Generating…' : 'Generate Monthly Report'}
        </button>
        <a className="btn-gold" href={downloadUrl(`/finance/reports/monthly/export?year=${year}&month=${month}&format=pdf`)} target="_blank" rel="noreferrer">
          Export PDF
        </a>
        <a className="btn-outline" href={downloadUrl(`/finance/reports/monthly/export?year=${year}&month=${month}&format=excel`)} target="_blank" rel="noreferrer">
          Export Excel
        </a>
        {report && (
          <button className="btn-outline" onClick={saveSnapshot} disabled={saving}>
            {saving ? 'Saving…' : 'Save to History'}
          </button>
        )}
      </div>

      {report && (
        <ReportDisplay title={`Monthly Report — ${monthLabel(monthEnum)} ${year}`} data={report} />
      )}
    </div>
  );
}

function YearlyReport() {
  const [year, setYear] = useState(currentEthiopianYear());
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const data = await api.get<ReportData>(`/finance/reports/yearly?year=${year}`);
      setReport(data);
    } finally {
      setLoading(false);
    }
  }

  async function saveSnapshot() {
    setSaving(true);
    try {
      await api.post('/finance/reports/snapshot', { type: 'YEARLY', year });
      alert('Yearly report saved to history.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="card p-4 mb-6 flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Ethiopian Year</label>
          <input type="number" className="input w-32" value={year} onChange={(e) => setYear(Number(e.target.value))} />
        </div>
        <button className="btn-outline" onClick={generate} disabled={loading}>
          {loading ? 'Generating…' : 'Generate Yearly Report'}
        </button>
        <a className="btn-gold" href={downloadUrl(`/finance/reports/yearly/export?year=${year}&format=pdf`)} target="_blank" rel="noreferrer">
          Export PDF
        </a>
        <a className="btn-outline" href={downloadUrl(`/finance/reports/yearly/export?year=${year}&format=excel`)} target="_blank" rel="noreferrer">
          Export Excel
        </a>
        {report && (
          <button className="btn-outline" onClick={saveSnapshot} disabled={saving}>
            {saving ? 'Saving…' : 'Save to History'}
          </button>
        )}
      </div>

      {report && <ReportDisplay title={`Yearly Report — ${year}`} data={report} />}
    </div>
  );
}

/* ---------------- Report History ---------------- */

function ReportHistory() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<HistoryItem & { data?: ReportData } | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api.get<HistoryItem[]>('/finance/reports/history');
      setItems(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function openItem(item: HistoryItem) {
    const full = await api.get<HistoryItem & { data: ReportData }>(`/finance/reports/history/${item.id}`);
    setSelected(full);
  }

  async function removeItem(id: string) {
    setDeleting(true);
    try {
      await api.delete(`/finance/reports/history/${id}`);
      setItems((prev) => prev.filter((i) => i.id !== id));
      setSelected(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Type</th>
              <th>Period</th>
              <th className="text-right">Income</th>
              <th className="text-right">Expense</th>
              <th className="text-right hidden md:table-cell">Net</th>
              <th className="hidden md:table-cell">Generated</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${item.type === 'MONTHLY' ? 'bg-gold/15 text-gold' : 'bg-status-present/15 text-status-present'}`}>
                    {item.type}
                  </span>
                </td>
                <td>
                  {item.type === 'MONTHLY'
                    ? `${monthLabel(item.month ?? '')} ${item.ethiopianYear}`
                    : `Year ${item.ethiopianYear}`}
                </td>
                <td className="text-right">{formatETB(Number(item.summary?.totalIncome ?? 0))}</td>
                <td className="text-right">{formatETB(Number(item.summary?.totalExpense ?? 0))}</td>
                <td className="text-right hidden md:table-cell">{formatETB(Number(item.summary?.net ?? 0))}</td>
                <td className="hidden md:table-cell">{formatEthiopianDateFromGregorian(new Date(item.createdAt))}</td>
                <td className="text-right">
                  <button className="btn-outline text-xs px-3 py-1 mr-2" onClick={() => openItem(item)}>View</button>
                  <button className="text-xs text-red-500" onClick={() => removeItem(item.id)} disabled={deleting}>Delete</button>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr><td colSpan={7} className="text-center text-sm text-slate py-8">No saved reports yet. They are generated automatically at the end of each Ethiopian month and year.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="card p-6 mt-6">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
            <h2 className="text-base font-semibold text-ink">
              {selected.type === 'MONTHLY'
                ? `${monthLabel(selected.month ?? '')} ${selected.ethiopianYear} — Saved Report`
                : `Year ${selected.ethiopianYear} — Saved Report`}
            </h2>
            <div className="flex gap-2">
              <button className="btn-outline text-sm" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
          {selected.data && <ReportDisplay title="" data={selected.data} />}
        </div>
      )}
    </div>
  );
}

/* ---------------- Shared report view ---------------- */

function ReportDisplay({ title, data }: { title: string; data: ReportData }) {
  return (
    <div>
      {title && <h2 className="text-base font-semibold text-ink mb-4">{title}</h2>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-5">
          <p className="text-xs text-slate uppercase">Total Income</p>
          <p className="text-2xl font-semibold text-status-present mt-2">{formatETB(Number(data.summary?.totalIncome ?? 0))}</p>
          <p className="text-xs text-slate mt-1">{data.summary?.incomeCount ?? 0} record(s)</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-slate uppercase">Total Expenses</p>
          <p className="text-2xl font-semibold text-status-absent mt-2">{formatETB(Number(data.summary?.totalExpense ?? 0))}</p>
          <p className="text-xs text-slate mt-1">{data.summary?.expenseCount ?? 0} record(s)</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-slate uppercase">Net Balance</p>
          <p className="text-2xl font-semibold text-gold mt-2">{formatETB(Number(data.summary?.net ?? 0))}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-ink mb-4">Income by Source</h3>
          <table className="table-base">
            <thead><tr><th>Source</th><th className="text-right">Records</th><th className="text-right">Amount</th></tr></thead>
            <tbody>
              {Object.entries(data.incomeBySourceType ?? {}).map(([src, v]) => (
                <tr key={src}>
                  <td>{src.replace(/_/g, ' ')}</td>
                  <td className="text-right">{v.count}</td>
                  <td className="text-right">{formatETB(Number(v.total))}</td>
                </tr>
              ))}
              {Object.keys(data.incomeBySourceType ?? {}).length === 0 && (
                <tr><td colSpan={3} className="text-center text-sm text-slate py-6">No income in this period.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-ink mb-4">Expenses by Category</h3>
          <table className="table-base">
            <thead><tr><th>Category</th><th className="text-right">Records</th><th className="text-right">Amount</th></tr></thead>
            <tbody>
              {Object.entries(data.expenseByCategory ?? {}).map(([cat, v]) => (
                <tr key={cat}>
                  <td>{cat.replace(/_/g, ' ')}</td>
                  <td className="text-right">{v.count}</td>
                  <td className="text-right">{formatETB(Number(v.total))}</td>
                </tr>
              ))}
              {Object.keys(data.expenseByCategory ?? {}).length === 0 && (
                <tr><td colSpan={3} className="text-center text-sm text-slate py-6">No expenses in this period.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <h3 className="text-sm font-semibold text-ink p-6 pb-0">Transactions</h3>
        <table className="table-base">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Category</th>
              <th className="hidden md:table-cell">Description</th>
              <th className="hidden lg:table-cell">Recorded By</th>
              <th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(data.transactions?.income ?? []).map((t) => (
              <tr key={t.id}>
                <td>{formatEthiopianDateFromGregorian(new Date(t.date))}</td>
                <td><span className="text-status-present font-medium">Income</span></td>
                <td>{t.sourceType ?? t.category?.replace(/_/g, ' ')}</td>
                <td className="hidden md:table-cell">{t.description ?? '—'}</td>
                <td className="hidden lg:table-cell">{t.recordedByName ?? '—'}</td>
                <td className="text-right text-status-present">{formatETB(Number(t.amount))}</td>
              </tr>
            ))}
            {(data.transactions?.expense ?? []).map((t) => (
              <tr key={t.id}>
                <td>{formatEthiopianDateFromGregorian(new Date(t.date))}</td>
                <td><span className="text-status-absent font-medium">Expense</span></td>
                <td>{t.category?.replace(/_/g, ' ')}</td>
                <td className="hidden md:table-cell">{t.description ?? '—'}</td>
                <td className="hidden lg:table-cell">{t.recordedByName ?? '—'}</td>
                <td className="text-right text-status-absent">{formatETB(Number(t.amount))}</td>
              </tr>
            ))}
            {!data.transactions?.income?.length && !data.transactions?.expense?.length && (
              <tr><td colSpan={6} className="text-center text-sm text-slate py-8">No transactions in this period.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
