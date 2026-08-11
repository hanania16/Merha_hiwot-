'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatETB, formatEthiopianDateFromGregorian } from '@/lib/ethiopian-calendar';
import { Topbar } from '@/components/layout/Topbar';
import { StatCard } from '@/components/ui/StatCard';

interface Summary {
  monthlyIncome: number;
  monthlyExpenses: number;
  currentBalance: number;
  todayIncome: number;
  todayExpenses: number;
  studentFeesCollected: number;
  studentsPaid: number;
  studentsUnpaid: number;
  outstandingStudentFeeMonths: number;
  yearIncome: number;
  yearExpenses: number;
  ethiopianYear: number;
}

interface Activity {
  type: 'PAYMENT' | 'INCOME' | 'EXPENSE';
  date: string;
  description: string;
  amount: number;
}

interface Account {
  id: string;
  name: string;
  type: string;
  bankName: string | null;
  accountNumber: string | null;
  isActive: boolean;
  balance: number;
}

interface StatementLine {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  date: string;
  category: string;
  description: string | null;
  referenceNumber: string | null;
  paymentMethod: string;
  recordedBy: string | null;
  amount: number;
  runningBalance: number | null;
  isReversal: boolean;
  reversed: boolean;
}

interface StatementResponse {
  account: Account;
  balance: number;
  statement: StatementLine[];
}

export default function FinanceDashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [statement, setStatement] = useState<StatementResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [reversingId, setReversingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [s, a, accounts] = await Promise.all([
        api.get<Summary>('/finance/dashboard/summary'),
        api.get<Activity[]>('/finance/dashboard/activities'),
        api.get<Account[]>('/finance/accounts'),
      ]);
      setSummary(s);
      setActivities(a);
      const account = accounts.find((x) => x.isActive) ?? accounts[0];
      if (account) {
        const st = await api.get<StatementResponse>(`/finance/accounts/${account.id}/statement`);
        setStatement(st);
      } else {
        setStatement(null);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function reverse(l: StatementLine) {
    const ok = window.confirm(
      `Reverse this ${l.type.toLowerCase()} of ${formatETB(l.amount)}?\n\nA reversal entry will be booked — the original row is never edited or deleted.`,
    );
    if (!ok) return;
    setReversingId(l.id);
    setError(null);
    try {
      const endpoint = l.type === 'INCOME' ? `/finance/income/${l.id}/reverse` : `/finance/expenses/${l.id}/reverse`;
      await api.post(endpoint);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reversal failed');
    } finally {
      setReversingId(null);
    }
  }

  const accountBalance = statement?.balance ?? null;

  return (
    <div>
      <Topbar title="Finance Dashboard" subtitle={`Ethiopian year ${summary?.ethiopianYear ?? ''}`} />

      {loading && <p className="text-sm text-slate">Loading…</p>}

      {summary && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Monthly Income" value={formatETB(summary.monthlyIncome)} accent="green" />
            <StatCard label="Monthly Expenses" value={formatETB(summary.monthlyExpenses)} accent="red" />
            <StatCard
              label="Current Balance"
              value={accountBalance === null ? '—' : formatETB(accountBalance)}
              accent="gold"
              hint={statement?.account.name ?? undefined}
            />
            <StatCard label="Student Fees Collected" value={formatETB(summary.studentFeesCollected)} accent="ink" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Today's Income" value={formatETB(summary.todayIncome)} accent="green" />
            <StatCard label="Today's Expenses" value={formatETB(summary.todayExpenses)} accent="red" />
            <StatCard label="Students Paid" value={String(summary.studentsPaid)} accent="green" />
            <StatCard label="Students Unpaid" value={String(summary.studentsUnpaid)} accent="red" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <StatCard
              label="Outstanding Fee-Months"
              value={String(summary.outstandingStudentFeeMonths)}
              accent="red"
              hint="Unpaid months across all active students"
            />
            <StatCard label="Year Income" value={formatETB(summary.yearIncome)} accent="green" />
            <StatCard label="Year Expenses" value={formatETB(summary.yearExpenses)} accent="red" />
          </div>
        </>
      )}

      {!loading && !statement && (
        <div className="card p-8 text-center text-sm text-slate mb-8">
          No account found. An account is required to track the balance and statement.
        </div>
      )}

      {statement && (
        <div className="card p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-ink">Account Statement — {statement.account.name}</h2>
              <p className="text-xs text-slate mt-0.5">
                {statement.account.type.replace(/_/g, ' ')}
                {statement.account.bankName && ` · ${statement.account.bankName}`}
                {statement.account.accountNumber && ` · ${statement.account.accountNumber}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate uppercase tracking-wide">Current Balance</p>
              <p className={`text-xl font-semibold ${statement.balance < 0 ? 'text-status-absent' : 'text-status-present'}`}>
                {formatETB(statement.balance)}
              </p>
            </div>
          </div>

          {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

          {statement.statement.length === 0 ? (
            <p className="text-sm text-slate py-6 text-center">No ledger entries on this account yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-base text-sm">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th className="hidden md:table-cell">Recorded By</th>
                    <th className="text-right">Amount</th>
                    <th className="text-right">Balance</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {statement.statement.map((l) => {
                    const canReverse = !l.isReversal && !l.reversed && l.category !== 'OPENING_BALANCE';
                    return (
                      <tr key={l.type + l.id} className={l.isReversal ? 'bg-red-50/40' : ''}>
                        <td className="whitespace-nowrap">{formatEthiopianDateFromGregorian(new Date(l.date))}</td>
                        <td>
                          <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full ${
                            l.type === 'INCOME' ? 'bg-status-present/10 text-status-present' : 'bg-status-absent/10 text-status-absent'
                          }`}>
                            {l.type}
                          </span>
                        </td>
                        <td className="min-w-[10rem]">
                          <span className="font-medium text-ink">{l.category.replace(/_/g, ' ')}</span>
                          {l.description && <span className="block text-xs text-slate">{l.description}</span>}
                        </td>
                        <td className="hidden md:table-cell text-xs text-slate">{l.recordedBy ?? '—'}</td>
                        <td className={`text-right font-medium ${l.type === 'INCOME' ? 'text-status-present' : 'text-status-absent'}`}>
                          {l.type === 'INCOME' ? '+' : '−'}{formatETB(l.amount)}
                        </td>
                        <td className="text-right font-mono text-xs">{l.runningBalance === null ? '—' : formatETB(l.runningBalance)}</td>
                        <td className="text-right">
                          <button
                            className="text-xs text-gold font-medium hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
                            disabled={!canReverse || reversingId === l.id}
                            onClick={() => reverse(l)}
                          >
                            {reversingId === l.id ? 'Reversing…' : l.isReversal ? '—' : l.reversed ? 'Reversed' : 'Reverse'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-[11px] text-slate mt-3">
            Ledger is append-only: rows are never edited or deleted. Corrections are booked as REVERSAL entries.
          </p>
        </div>
      )}

      <div className="card p-6">
        <h2 className="text-sm font-semibold text-ink mb-4">Monthly Activity Timeline</h2>
        <div className="space-y-3">
          {activities.length === 0 && !loading && (
            <p className="text-sm text-slate">No activity recorded this month yet.</p>
          )}
          {activities.map((a, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3">
                <span
                  className={`w-2 h-2 rounded-full ${
                    a.type === 'PAYMENT'
                      ? 'bg-status-present'
                      : a.type === 'INCOME'
                      ? 'bg-gold'
                      : 'bg-status-absent'
                  }`}
                />
                <div>
                  <p className="text-sm text-ink">{a.description}</p>
                  <p className="text-xs text-slate">{formatEthiopianDateFromGregorian(new Date(a.date))}</p>
                </div>
              </div>
              <p className={`text-sm font-medium ${a.type === 'EXPENSE' ? 'text-status-absent' : 'text-status-present'}`}>
                {a.type === 'EXPENSE' ? '-' : '+'}
                {formatETB(a.amount)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
