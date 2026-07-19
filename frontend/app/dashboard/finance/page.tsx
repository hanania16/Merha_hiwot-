'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatETB } from '@/lib/ethiopian-calendar';
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

export default function FinanceDashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Summary>('/finance/dashboard/summary'),
      api.get<Activity[]>('/finance/dashboard/activities'),
    ])
      .then(([s, a]) => {
        setSummary(s);
        setActivities(a);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <Topbar title="Finance Dashboard" subtitle={`Ethiopian year ${summary?.ethiopianYear ?? ''}`} />

      {loading && <p className="text-sm text-slate">Loading…</p>}

      {summary && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Monthly Income" value={formatETB(summary.monthlyIncome)} accent="green" />
            <StatCard label="Monthly Expenses" value={formatETB(summary.monthlyExpenses)} accent="red" />
            <StatCard label="Current Balance" value={formatETB(summary.currentBalance)} accent="gold" />
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
                  <p className="text-xs text-slate">{new Date(a.date).toLocaleDateString()}</p>
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
