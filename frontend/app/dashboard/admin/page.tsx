'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, downloadUrl } from '@/lib/api';
import {
  ETHIOPIAN_MONTHS,
  formatETB,
  formatEthiopianDateFromGregorian,
  currentEthiopianYear,
  toEthiopian,
  ethiopianTodayISO,
} from '@/lib/ethiopian-calendar';
import { useLang } from '@/lib/i18n';
import { getCurrentUser } from '@/lib/auth';

export default function AdminPage() {
  const { t } = useLang();
  const user = getCurrentUser();

  // Gate: visible only to ADMINISTRATOR
  if (!user || user.role !== 'ADMINISTRATOR') {
    const router = useRouter();
    useEffect(() => {
      router.push('/dashboard');
    }, []);
    return null;
  }

  const [reportTab, setReportTab] = useState<'period' | 'monthly' | 'yearly'>('monthly');

  const [ready, setReady] = useState(true);

  // ------------------------------------------------------------------
  // Tab rendering — view-only, exports kept, no save buttons
  // ------------------------------------------------------------------

  // Helper: format a single transaction row from the snapshot data
  function formatTransaction(
    t2: {
      id: string;
      date: string;
      category: string;
      description: string | null;
      amount: number;
      recordedByName: string | null;
    },
    type: 'INCOME' | 'EXPENSE'
  ) {
    return {
      id: t2.id,
      type,
      date: t2.date,
      category: t2.category,
      description: t2.description ?? '',
      referenceNumber: null,
      paymentMethod: 'CASH',
      recordedBy: t2.recordedByName ?? null,
      amount: t2.amount,
      runningBalance: null,
      isReversal: false,
      reversed: false,
    };
  }

  const data = {
    transactions: {
      income: [],
      expense: [],
    },
  };

  const incomeLines = (data.transactions?.income ?? []).map((i) => formatTransaction(i, 'INCOME'));
  const expenseLines = (data.transactions?.expense ?? []).map((e) => formatTransaction(e, 'EXPENSE'));

  // ---------- Period tab (custom from/to) ----------
  function PeriodTab() {
    const { t, lang } = useLang();
    const [from, setFrom] = useState(ethiopianTodayISO());
    const [to, setTo] = useState(ethiopianTodayISO());
    const [report, setReport] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);

    async function generate() {
      setLoading(true);
      try {
        const res = await api.get<any>(
          `/finance/reports/financial?from=${from}&to=${to}`
        );
        setReport(res);
      } finally {
        setLoading(false);
      }
    }

    return (
      <div>
        <div className="card p-4 mb-6 flex flex-wrap items-end gap-3">
          <div>
            <label className="label">{t('from')}</label>
            <button
              className="ethnic-date-picker-btn"
              onClick={() => setFrom(ethiopianTodayISO())}
            >
              {t('today')}
            </button>
          </div>
          <div>
            <label className="label">{t('to')}</label>
            <button
              className="ethnic-date-picker-btn"
              onClick={() => setTo(ethiopianTodayISO())}
            >
              {t('today')}
            </button>
          </div>
          <button className="btn-outline" onClick={generate} disabled={loading}>
            {loading ? t('generating') : t('generateReport')}
          </button>
          {/* Exports — read-only, no data modification */}
          <a className="btn-gold" href={downloadUrl(`/finance/reports/financial/export/pdf?from=${from}&to=${to}&lang=${lang}`)} target="_blank" rel="noreferrer">
            {t('exportPdf')}
          </a>
          <a className="btn-outline" href={downloadUrl(`/finance/reports/financial/export/excel?from=${from}&to=${to}&lang=${lang}`)} target="_blank" rel="noreferrer">
            {t('exportExcel')}
          </a>
        </div>

        {report && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="card p-5">
              <p className="text-xs text-slate uppercase">{t('totalIncome')}</p>
              <p className="text-2xl font-semibold text-status-present mt-2">{formatETB(report.totalIncome)}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs text-slate uppercase">{t('totalExpense')}</p>
              <p className="text-2xl font-semibold text-status-absent mt-2">{formatETB(report.totalExpense)}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs text-slate uppercase">{t('balance')}</p>
              <p className="text-2xl font-semibold text-gold mt-2">{formatETB(report.balance)}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------- Monthly tab ----------
  function MonthlyTab() {
    const { t, lang } = useLang();
    const [year, setYear] = useState(currentEthiopianYear());
    const [month, setMonth] = useState<number>(toEthiopian(new Date()).month);
    const [report, setReport] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);

    async function generate() {
      setLoading(true);
      try {
        const res = await api.get<any>(
          `/finance/reports/monthly?year=${year}&month=${month}`
        );
        setReport(res);
      } finally {
        setLoading(false);
      }
    }

    // NO saveSnapshot button — admin view-only

    return (
      <div>
        <div className="card p-4 mb-6 flex flex-wrap items-end gap-3">
          <div>
            <label className="label">{t('ethiopianYearLabel')}</label>
            <input
              type="number"
              className="input w-32"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">{t('month')}</label>
            <select
              className="input"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {ETHIOPIAN_MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <button className="btn-outline" onClick={generate} disabled={loading}>
            {loading ? t('generating') : t('generateMonthlyReport')}
          </button>
          {/* Exports — read-only downloads */}
          <a className="btn-gold" href={downloadUrl(`/finance/reports/monthly/export?year=${year}&month=${month}&format=pdf&lang=${lang}`)} target="_blank" rel="noreferrer">
            {t('exportPdf')}
          </a>
          <a className="btn-outline" href={downloadUrl(`/finance/reports/monthly/export?year=${year}&month=${month}&format=excel&lang=${lang}`)} target="_blank" rel="noreferrer">
            {t('exportExcel')}
          </a>
        </div>

        {report && (
          <div>
            <h2 className="text-base font-semibold text-ink mb-4">
              {t('monthly')} — {formatEthiopianDateFromGregorian(new Date(report.lastStudentFeeBatchTime ?? new Date()))} ${year}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="card p-5">
                <p className="text-xs text-slate uppercase">{t('totalIncome')}</p>
                <p className="text-2xl font-semibold text-status-present mt-2">{formatETB(report.totalIncome)}</p>
              </div>
              <div className="card p-5">
                <p className="text-xs text-slate uppercase">{t('totalExpense')}</p>
                <p className="text-2xl font-semibold text-status-absent mt-2">{formatETB(report.totalExpense)}</p>
              </div>
              <div className="card p-5">
                <p className="text-xs text-slate uppercase">{t('net')}</p>
                <p className="text-2xl font-semibold text-gold mt-2">{formatETB(report.net)}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="card p-6">
                <h3 className="text-sm font-semibold text-ink mb-4">{t('incomesByCategory')}</h3>
                <table className="table-base">
                  <thead><tr><th>{t('category')}</th><th className="text-right">{t('amount')}</th></tr></thead>
                  <tbody>
                    {Object.entries(report.incomeByCategory ?? {}).map(([cat, amt]) => (
                      <tr key={cat}>
                        <td>{t(cat)}</td>
                        <td className="text-right">{formatETB(Number(amt))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="card p-6">
                <h3 className="text-sm font-semibold text-ink mb-4">{t('expensesByCategory')}</h3>
                <table className="table-base">
                  <thead><tr><th>{t('category')}</th><th className="text-right">{t('amount')}</th></tr></thead>
                  <tbody>
                    {Object.entries(report.expenseByCategory ?? {}).map(([cat, v]) => (
                      <tr key={cat}>
                        <td>{t(cat)}</td>
                        <td className="text-right">{formatETB(Number(v))}</td>
                      </tr>
                    ))}
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
                    <th className="text-right">{t('amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(report.transactions?.income ?? []).map((t2: any) => (
                    <tr key={t2.id}>
                      <td>{formatEthiopianDateFromGregorian(new Date(t2.date))}</td>
                      <td><span className="text-status-present font-medium">{t('income')}</span></td>
                      <td>{t(t2.category ?? t2.sourceType ?? '—')}</td>
                      <td className="hidden md:table-cell">{t2.description ?? '—'}</td>
                      <td className="text-right text-status-present">{formatETB(Number(t2.amount))}</td>
                    </tr>
                  ))}
                  {(report.transactions?.expense ?? []).map((t2: any) => (
                    <tr key={t2.id}>
                      <td>{formatEthiopianDateFromGregorian(new Date(t2.date))}</td>
                      <td><span className="text-status-absent font-medium">{t('expense')}</span></td>
                      <td>{t(t2.category ?? '—')}</td>
                      <td className="hidden md:table-cell">{t2.description ?? '—'}</td>
                      <td className="text-right text-status-absent">{formatETB(Number(t2.amount))}</td>
                    </tr>
                  ))}
                  {!report.transactions?.income?.length && !report.transactions?.expense?.length && (
                    <tr><td colSpan={5} className="text-center text-sm text-slate py-8">{t('noTransactionsThisPeriod')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------- Yearly tab ----------
  function YearlyTab() {
    const { t, lang } = useLang();
    const [year, setYear] = useState(currentEthiopianYear());
    const [report, setReport] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);

    async function generate() {
      setLoading(true);
      try {
        const res = await api.get<any>(
          `/finance/reports/yearly?year=${year}`
        );
        setReport(res);
      } finally {
        setLoading(false);
      }
    }

    // NO saveSnapshot button — admin view-only

    return (
      <div>
        <div className="card p-4 mb-6 flex flex-wrap items-end gap-3">
          <div>
            <label className="label">{t('ethiopianYearLabel')}</label>
            <input
              type="number"
              className="input w-32"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </div>
          <button className="btn-outline" onClick={generate} disabled={loading}>
            {loading ? t('generating') : t('generateYearlyReport')}
          </button>
          {/* Exports — read-only downloads */}
          <a className="btn-gold" href={downloadUrl(`/finance/reports/yearly/export?year=${year}&format=pdf&lang=${lang}`)} target="_blank" rel="noreferrer">
            {t('exportPdf')}
          </a>
          <a className="btn-outline" href={downloadUrl(`/finance/reports/yearly/export?year=${year}&format=excel&lang=${lang}`)} target="_blank" rel="noreferrer">
            {t('exportExcel')}
          </a>
        </div>

        {report && (
          <div>
            <h2 className="text-base font-semibold text-ink mb-4">
              {t('yearly')} — {year}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="card p-5">
                <p className="text-xs text-slate uppercase">{t('totalIncome')}</p>
                <p className="text-2xl font-semibold text-status-present mt-2">{formatETB(report.totalIncome)}</p>
              </div>
              <div className="card p-5">
                <p className="text-xs text-slate uppercase">{t('totalExpense')}</p>
                <p className="text-2xl font-semibold text-status-absent mt-2">{formatETB(report.totalExpense)}</p>
              </div>
              <div className="card p-5">
                <p className="text-xs text-slate uppercase">{t('net')}</p>
                <p className="text-2xl font-semibold text-gold mt-2">{formatETB(report.net)}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="card p-6">
                <h3 className="text-sm font-semibold text-ink mb-4">{t('incomesByCategory')}</h3>
                <table className="table-base">
                  <thead><tr><th>{t('category')}</th><th className="text-right">{t('amount')}</th></tr></thead>
                  <tbody>
                    {Object.entries(report.incomeByCategory ?? {}).map(([cat, amt]) => (
                      <tr key={cat}>
                        <td>{t(cat)}</td>
                        <td className="text-right">{formatETB(Number(amt))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="card p-6">
                <h3 className="text-sm font-semibold text-ink mb-4">{t('expensesByCategory')}</h3>
                <table className="table-base">
                  <thead><tr><th>{t('category')}</th><th className="text-right">{t('amount')}</th></tr></thead>
                  <tbody>
                    {Object.entries(report.expenseByCategory ?? {}).map(([cat, v]) => (
                      <tr key={cat}>
                        <td>{t(cat)}</td>
                        <td className="text-right">{formatETB(Number(v))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-ink mb-6">
        {t('adminDashboard')}
      </h2>

      {/* --- Tabs --- */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          key="period"
          onClick={() => setReportTab('period')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            reportTab === 'period' ? 'bg-gold text-white' : 'bg-white border border-slate/20 text-slate hover:border-gold'
          }`}
        >
          {t('periodReport')}
        </button>
        <button
          key="monthly"
          onClick={() => setReportTab('monthly')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            reportTab === 'monthly' ? 'bg-gold text-white' : 'bg-white border border-slate/20 text-slate hover:border-gold'
          }`}
        >
          {t('monthly')}
        </button>
        <button
          key="yearly"
          onClick={() => setReportTab('yearly')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            reportTab === 'yearly' ? 'bg-gold text-white' : 'bg-white border border-slate/20 text-slate hover:border-gold'
          }`}
        >
          {t('yearly')}
        </button>
      </div>

      {reportTab === 'period' && <PeriodTab />}
      {reportTab === 'monthly' && <MonthlyTab />}
      {reportTab === 'yearly' && <YearlyTab />}
    </div>
  );
}