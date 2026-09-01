'use client';

import { useEffect, useState } from 'react';
import { api, downloadUrl } from '@/lib/api';
import { ETHIOPIAN_MONTHS, currentEthiopianYear, ethiopianTodayISO, formatETB, formatEthiopianDateFromGregorian, monthLabel, toEthiopian } from '@/lib/ethiopian-calendar';
import { Topbar } from '@/components/layout/Topbar';
import { EthiopianDatePicker } from '@/components/EthiopianDatePicker';
import { useLang } from '@/lib/i18n';

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
  lastStudentFeeBatchTime: string | null;
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
  senderName?: string | null;
  senderAccountNumber?: string | null;
  recordedByName: string | null;
}

interface ReportData {
  kind: string;
  period: { from: string; to: string };
  summary: ReportSummary;
  incomeBySourceType: Record<string, { total: number; count: number }>;
  expenseByCategory: Record<string, { total: number; count: number }>;
  transactions: { income: TransactionRow[]; expense: TransactionRow[] };
  lastStudentFeeBatchTime: string | null;
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
  const { t } = useLang();
  const [tab, setTab] = useState<Tab>('period');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'period', label: t('periodReport') },
    { key: 'monthly', label: t('monthly') },
    { key: 'yearly', label: t('yearly') },
    { key: 'history', label: t('reportHistory') },
  ];

  return (
    <div>
      <Topbar title={t('financialReports')} subtitle={t('financialReportsSub')} />

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
  const { t, lang } = useLang();
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
          <label className="label">{t('from')}</label>
          <EthiopianDatePicker value={from} onChange={(d) => setFrom(d)} />
        </div>
        <div>
          <label className="label">{t('to')}</label>
          <EthiopianDatePicker value={to} onChange={(d) => setTo(d)} />
        </div>
        <button className="btn-outline" onClick={generate} disabled={loading}>
          {loading ? t('generating') : t('generateReport')}
        </button>
        <a className="btn-gold" href={downloadUrl(`/finance/reports/financial/export/pdf?from=${from}&to=${to}&lang=${lang}`)} target="_blank" rel="noreferrer">
          {t('exportPdf')}
        </a>
        <a className="btn-outline" href={downloadUrl(`/finance/reports/financial/export/excel?from=${from}&to=${to}&lang=${lang}`)} target="_blank" rel="noreferrer">
          {t('exportExcel')}
        </a>
      </div>

      {report && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="card p-5">
              <p className="text-xs text-slate uppercase">{t('totalIncome')}</p>
              <p className="text-2xl font-semibold text-status-present mt-2">{formatETB(report.totalIncome)}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs text-slate uppercase">{t('totalExpenses')}</p>
              <p className="text-2xl font-semibold text-status-absent mt-2">{formatETB(report.totalExpense)}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs text-slate uppercase">{t('balance')}</p>
              <p className="text-2xl font-semibold text-gold mt-2">{formatETB(report.balance)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="card p-5">
              <p className="text-xs text-slate uppercase">{t('collectionRate')}</p>
              <p className="text-xl font-semibold text-ink mt-2">{report.collectionRate}%</p>
            </div>
            <div className="card p-5">
              <p className="text-xs text-slate uppercase">{t('donations')}</p>
              <p className="text-xl font-semibold text-ink mt-2">{formatETB(report.donations)}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs text-slate uppercase">{t('outstandingFeeMonths')}</p>
              <p className="text-xl font-semibold text-ink mt-2">{report.outstandingFeeMonths}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="card p-6">
              <h2 className="text-sm font-semibold text-ink mb-4">{t('incomesByCategory')}</h2>
              <table className="table-base">
                <thead><tr><th>{t('category')}</th><th className="text-right">{t('amount')}</th></tr></thead>
                <tbody>
                  {Object.entries(report.incomeByCategory).map(([cat, amt]) => (
                    <tr key={cat}>
                      <td>{t(cat)}</td>
                      <td className="text-right">{formatETB(Number(amt))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {report.lastStudentFeeBatchTime && report.incomeByCategory['STUDENT_FEES'] != null && (
                <StudentFeesBatchNote when={report.lastStudentFeeBatchTime} />
              )}
            </div>
            <div className="card p-6">
              <h2 className="text-sm font-semibold text-ink mb-4">{t('expensesByCategory')}</h2>
              <table className="table-base">
                <thead><tr><th>{t('category')}</th><th className="text-right">{t('amount')}</th></tr></thead>
                <tbody>
                  {Object.entries(report.expenseByCategory).map(([cat, amt]) => (
                    <tr key={cat}>
                      <td>{t(cat)}</td>
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
  const { t, lang } = useLang();
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
      alert(t('monthlySaved'));
    } finally {
      setSaving(false);
    }
  }

  const monthEnum = ETHIOPIAN_MONTHS.find((m) => m.order === month)?.value ?? '';

  return (
    <div>
      <div className="card p-4 mb-6 flex flex-wrap items-end gap-3">
        <div>
          <label className="label">{t('ethiopianYearLabel')}</label>
          <input type="number" className="input w-32" value={year} onChange={(e) => setYear(Number(e.target.value))} />
        </div>
        <div>
          <label className="label">{t('month')}</label>
          <select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTH_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <button className="btn-outline" onClick={generate} disabled={loading}>
          {loading ? t('generating') : t('generateMonthlyReport')}
        </button>
        <a className="btn-gold" href={downloadUrl(`/finance/reports/monthly/export?year=${year}&month=${month}&format=pdf&lang=${lang}`)} target="_blank" rel="noreferrer">
          {t('exportPdf')}
        </a>
        <a className="btn-outline" href={downloadUrl(`/finance/reports/monthly/export?year=${year}&month=${month}&format=excel&lang=${lang}`)} target="_blank" rel="noreferrer">
          {t('exportExcel')}
        </a>
        {report && (
          <button className="btn-outline" onClick={saveSnapshot} disabled={saving}>
            {saving ? t('saving') : t('saveToHistory')}
          </button>
        )}
      </div>

      {report && (
        <ReportDisplay title={`${t('monthly')} ${t('reports')} — ${monthLabel(monthEnum)} ${year}`} data={report} />
      )}
    </div>
  );
}

function YearlyReport() {
  const { t, lang } = useLang();
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
      alert(t('yearlySaved'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="card p-4 mb-6 flex flex-wrap items-end gap-3">
        <div>
          <label className="label">{t('ethiopianYearLabel')}</label>
          <input type="number" className="input w-32" value={year} onChange={(e) => setYear(Number(e.target.value))} />
        </div>
        <button className="btn-outline" onClick={generate} disabled={loading}>
          {loading ? t('generating') : t('generateYearlyReport')}
        </button>
        <a className="btn-gold" href={downloadUrl(`/finance/reports/yearly/export?year=${year}&format=pdf&lang=${lang}`)} target="_blank" rel="noreferrer">
          {t('exportPdf')}
        </a>
        <a className="btn-outline" href={downloadUrl(`/finance/reports/yearly/export?year=${year}&format=excel&lang=${lang}`)} target="_blank" rel="noreferrer">
          {t('exportExcel')}
        </a>
        {report && (
          <button className="btn-outline" onClick={saveSnapshot} disabled={saving}>
            {saving ? t('saving') : t('saveToHistory')}
          </button>
        )}
      </div>

      {report && <ReportDisplay title={`${t('yearly')} ${t('reports')} — ${year}`} data={report} />}
    </div>
  );
}

/* ---------------- Report History ---------------- */

function ReportHistory() {
  const { t } = useLang();
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
              <th>{t('typeLabel')}</th>
              <th>{t('period')}</th>
              <th className="text-right">{t('income')}</th>
              <th className="text-right">{t('expense')}</th>
              <th className="text-right hidden md:table-cell">{t('net')}</th>
              <th className="hidden md:table-cell">{t('generated')}</th>
              <th className="text-right">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${item.type === 'MONTHLY' ? 'bg-gold/15 text-gold' : 'bg-status-present/15 text-status-present'}`}>
                    {t(item.type)}
                  </span>
                </td>
                <td>
                  {item.type === 'MONTHLY'
                    ? `${monthLabel(item.month ?? '')} ${item.ethiopianYear}`
                    : t('yearN', { year: item.ethiopianYear })}
                </td>
                <td className="text-right">{formatETB(Number(item.summary?.totalIncome ?? 0))}</td>
                <td className="text-right">{formatETB(Number(item.summary?.totalExpense ?? 0))}</td>
                <td className="text-right hidden md:table-cell">{formatETB(Number(item.summary?.net ?? 0))}</td>
                <td className="hidden md:table-cell">{formatEthiopianDateFromGregorian(new Date(item.createdAt))}</td>
                <td className="text-right">
                  <button className="btn-outline text-xs px-3 py-1 mr-2" onClick={() => openItem(item)}>{t('view')}</button>
                  <button className="text-xs text-red-500" onClick={() => removeItem(item.id)} disabled={deleting}>{t('delete')}</button>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr><td colSpan={7} className="text-center text-sm text-slate py-8">{t('noSavedReports')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="card p-6 mt-6">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
            <h2 className="text-base font-semibold text-ink">
              {selected.type === 'MONTHLY'
                ? `${monthLabel(selected.month ?? '')} ${selected.ethiopianYear} — ${t('savedReport')}`
                : `${t('yearN', { year: selected.ethiopianYear })} — ${t('savedReport')}`}
            </h2>
            <div className="flex gap-2">
              <button className="btn-outline text-sm" onClick={() => setSelected(null)}>{t('close')}</button>
            </div>
          </div>
          {selected.data && <ReportDisplay title="" data={selected.data} />}
        </div>
      )}
    </div>
  );
}

/* ---------------- Shared report view ---------------- */

function StudentFeesBatchNote({ when }: { when: string }) {
  const { t } = useLang();
  return (
    <p className="text-xs text-slate mt-3">
      {t('studentFeesBatchNotePrefix')}{' '}
      <span className="font-medium">{formatEthiopianDateFromGregorian(new Date(when))}</span>{' '}
      {t('studentFeesBatchNoteSuffix')}
    </p>
  );
}

function ReportDisplay({ title, data }: { title: string; data: ReportData }) {
  const { t } = useLang();
  return (
    <div>
      {title && <h2 className="text-base font-semibold text-ink mb-4">{title}</h2>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-5">
          <p className="text-xs text-slate uppercase">{t('totalIncome')}</p>
          <p className="text-2xl font-semibold text-status-present mt-2">{formatETB(Number(data.summary?.totalIncome ?? 0))}</p>
          <p className="text-xs text-slate mt-1">{t('recordS', { n: data.summary?.incomeCount ?? 0 })}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-slate uppercase">{t('totalExpenses')}</p>
          <p className="text-2xl font-semibold text-status-absent mt-2">{formatETB(Number(data.summary?.totalExpense ?? 0))}</p>
          <p className="text-xs text-slate mt-1">{t('recordS', { n: data.summary?.expenseCount ?? 0 })}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-slate uppercase">{t('netBalance')}</p>
          <p className="text-2xl font-semibold text-gold mt-2">{formatETB(Number(data.summary?.net ?? 0))}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-ink mb-4">{t('incomeBySource')}</h3>
          <table className="table-base">
            <thead><tr><th>{t('source')}</th><th className="text-right">{t('records')}</th><th className="text-right">{t('amount')}</th></tr></thead>
            <tbody>
              {Object.entries(data.incomeBySourceType ?? {}).map(([src, v]) => (
                <tr key={src}>
                  <td>{t(src)}</td>
                  <td className="text-right">{v.count}</td>
                  <td className="text-right">{formatETB(Number(v.total))}</td>
                </tr>
              ))}
              {Object.keys(data.incomeBySourceType ?? {}).length === 0 && (
                <tr><td colSpan={3} className="text-center text-sm text-slate py-6">{t('noIncomeThisPeriod')}</td></tr>
              )}
            </tbody>
          </table>
          {data.lastStudentFeeBatchTime && data.incomeBySourceType?.['STUDENT_FEE'] != null && (
            <StudentFeesBatchNote when={data.lastStudentFeeBatchTime} />
          )}
        </div>
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-ink mb-4">{t('expensesByCategory')}</h3>
          <table className="table-base">
            <thead><tr><th>{t('category')}</th><th className="text-right">{t('records')}</th><th className="text-right">{t('amount')}</th></tr></thead>
            <tbody>
              {Object.entries(data.expenseByCategory ?? {}).map(([cat, v]) => (
                <tr key={cat}>
                  <td>{t(cat)}</td>
                  <td className="text-right">{v.count}</td>
                  <td className="text-right">{formatETB(Number(v.total))}</td>
                </tr>
              ))}
              {Object.keys(data.expenseByCategory ?? {}).length === 0 && (
                <tr><td colSpan={3} className="text-center text-sm text-slate py-6">{t('noExpensesThisPeriod')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <h3 className="text-sm font-semibold text-ink p-6 pb-0">{t('transactions')}</h3>
        <table className="table-base">
          <thead>
            <tr>
              <th>{t('date')}</th>
              <th>{t('typeLabel')}</th>
              <th>{t('category')}</th>
              <th className="hidden md:table-cell">{t('description')}</th>
              <th className="hidden lg:table-cell">{t('recordedBy')}</th>
              <th className="text-right">{t('amount')}</th>
            </tr>
          </thead>
          <tbody>
            {(data.transactions?.income ?? []).map((t2) => (
              <tr key={t2.id}>
                <td>{formatEthiopianDateFromGregorian(new Date(t2.date))}</td>
                <td><span className="text-status-present font-medium">{t('income')}</span></td>
                <td>{t(t2.sourceType ?? t2.category)}</td>
                <td className="hidden md:table-cell">
                  {t2.description ?? '—'}
                  {(t2.senderName || t2.senderAccountNumber) && (
                    <p className="text-xs text-slate mt-0.5">
                      {t2.senderName}{t2.senderName && t2.senderAccountNumber ? ' · ' : ''}{t2.senderAccountNumber}
                    </p>
                  )}
                </td>
                <td className="hidden lg:table-cell">{t2.recordedByName ?? '—'}</td>
                <td className="text-right text-status-present">{formatETB(Number(t2.amount))}</td>
              </tr>
            ))}
            {(data.transactions?.expense ?? []).map((t2) => (
              <tr key={t2.id}>
                <td>{formatEthiopianDateFromGregorian(new Date(t2.date))}</td>
                <td><span className="text-status-absent font-medium">{t('expense')}</span></td>
                <td>{t(t2.category)}</td>
                <td className="hidden md:table-cell">{t2.description ?? '—'}</td>
                <td className="hidden lg:table-cell">{t2.recordedByName ?? '—'}</td>
                <td className="text-right text-status-absent">{formatETB(Number(t2.amount))}</td>
              </tr>
            ))}
            {!data.transactions?.income?.length && !data.transactions?.expense?.length && (
              <tr><td colSpan={6} className="text-center text-sm text-slate py-8">{t('noTransactionsThisPeriod')}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
