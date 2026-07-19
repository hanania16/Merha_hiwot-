'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatETB } from '@/lib/ethiopian-calendar';
import { Topbar } from '@/components/layout/Topbar';
import { StatCard } from '@/components/ui/StatCard';

interface Overview {
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  newRegistrationsThisMonth: number;
  totalIncome: number;
  totalExpenses: number;
  currentBalance: number;
  outstandingFees: number;
  totalEvents: number;
  upcomingEvents: number;
  attendancePercentageToday: number;
  ethiopianYear: number;
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => { api.get<Overview>('/admin/overview').then(setData); }, []);

  if (!data) return <p className="text-sm text-slate">Loading…</p>;

  return (
    <div>
      <Topbar title="Admin Overview" subtitle={`Live, synchronized across every module · Ethiopian year ${data.ethiopianYear}`} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Students" value={String(data.totalStudents)} accent="ink" />
        <StatCard label="Active Students" value={String(data.activeStudents)} accent="green" />
        <StatCard label="Inactive Students" value={String(data.inactiveStudents)} accent="red" />
        <StatCard label="New Registrations" value={String(data.newRegistrationsThisMonth)} accent="gold" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Income" value={formatETB(data.totalIncome)} accent="green" />
        <StatCard label="Total Expenses" value={formatETB(data.totalExpenses)} accent="red" />
        <StatCard label="Current Balance" value={formatETB(data.currentBalance)} accent="gold" />
        <StatCard label="Outstanding Fees" value={formatETB(data.outstandingFees)} accent="red" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Events" value={String(data.totalEvents)} accent="ink" />
        <StatCard label="Upcoming Events" value={String(data.upcomingEvents)} accent="gold" />
        <StatCard label="Attendance Today" value={`${data.attendancePercentageToday}%`} accent="green" />
      </div>
    </div>
  );
}
