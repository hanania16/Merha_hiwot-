'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Topbar } from '@/components/layout/Topbar';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';

interface Summary {
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  newRegistrationsThisMonth: number;
  presentToday: number;
  absentToday: number;
  permissionToday: number;
  lateToday: number;
  attendancePercentageToday: number;
  financeSummary: { studentsPaid: number; studentsUnpaid: number };
}
interface Warning { studentId: string; fullName: string; consecutiveAbsences: number; level: string; }
interface UnpaidStudent { studentId: string; studentCode: string; fullName: string; className: string; parentPhone: string; }

export default function AttendanceDashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [unpaid, setUnpaid] = useState<UnpaidStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Summary>('/attendance/dashboard/summary').catch(() => null),
      api.get<Warning[]>('/attendance/dashboard/warnings').catch(() => []),
      api.get<UnpaidStudent[]>('/finance/student-fees/reminders/unpaid-this-month').catch(() => []),
    ])
      .then(([s, w, u]) => { if (s) setSummary(s); setWarnings(w); setUnpaid(u); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <Topbar title="Student Management & Attendance" subtitle="Today's overview across all classes" />

      {loading && <p className="text-sm text-slate">Loading…</p>}

      {summary && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Students" value={String(summary.totalStudents)} accent="ink" />
            <StatCard label="Active Students" value={String(summary.activeStudents)} accent="green" />
            <StatCard label="Inactive Students" value={String(summary.inactiveStudents)} accent="red" />
            <StatCard label="New This Month" value={String(summary.newRegistrationsThisMonth)} accent="gold" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <StatCard label="Present Today" value={String(summary.presentToday)} accent="green" />
            <StatCard label="Absent Today" value={String(summary.absentToday)} accent="red" />
            <StatCard label="Late Today" value={String(summary.lateToday)} accent="gold" />
            <StatCard label="Permission Today" value={String(summary.permissionToday)} accent="ink" />
          </div>

          <div className="card p-5 mb-6">
            <p className="text-xs font-medium text-slate uppercase tracking-wide mb-2">Finance Summary (Read Only)</p>
            <div className="flex gap-8">
              <div>
                <p className="text-2xl font-semibold text-status-present">{summary.financeSummary.studentsPaid}</p>
                <p className="text-xs text-slate">Students Paid</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-status-absent">{summary.financeSummary.studentsUnpaid}</p>
                <p className="text-xs text-slate">Students Unpaid</p>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-ink mb-4">Attendance Warnings</h2>
          <div className="space-y-2">
            {warnings.length === 0 && !loading && <p className="text-sm text-slate">No attendance warnings right now.</p>}
            {warnings.map((w) => (
              <div key={w.studentId} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <p className="text-sm text-ink">{w.fullName}</p>
                <Badge variant={w.level === 'UPCOMING_INACTIVE' ? 'unpaid' : 'partial'}>
                  {w.consecutiveAbsences} consecutive absences{w.level === 'UPCOMING_INACTIVE' ? ' — one more marks inactive' : ''}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-sm font-semibold text-ink mb-4">Fee Reminder — Unpaid This Month</h2>
          <div className="space-y-2">
            {unpaid.length === 0 && !loading && <p className="text-sm text-slate">Everyone is paid up this month.</p>}
            {unpaid.slice(0, 8).map((u) => (
              <div key={u.studentId} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm text-ink">{u.fullName}</p>
                  <p className="text-xs text-slate">{u.className} · {u.parentPhone}</p>
                </div>
                <Badge variant="unpaid">Follow up</Badge>
              </div>
            ))}
            {unpaid.length > 8 && <p className="text-xs text-slate pt-2">+{unpaid.length - 8} more — see Finance for full list.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
