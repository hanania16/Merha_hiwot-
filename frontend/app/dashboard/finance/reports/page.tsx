'use client';

import { useState } from 'react';
import { api, downloadUrl } from '@/lib/api';
import { formatETB } from '@/lib/ethiopian-calendar';
import { Topbar } from '@/components/layout/Topbar';
import { EthiopianDatePicker } from '@/components/EthiopianDatePicker';

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

function firstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function ReportsPage() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
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
      <Topbar title="Financial Reports" subtitle="Daily, monthly, and yearly reports with export" />

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
