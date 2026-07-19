'use client';

import { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { api } from '@/lib/api';
import { Topbar } from '@/components/layout/Topbar';

const COLORS = ['#16A34A', '#DC2626', '#EAB308', '#D4AF37', '#111111', '#9CA3AF'];

export default function AttendanceAnalyticsPage() {
  const [trend, setTrend] = useState<any[]>([]);
  const [byClass, setByClass] = useState<any[]>([]);
  const [presentVsAbsent, setPresentVsAbsent] = useState<any[]>([]);
  const [registrationTrend, setRegistrationTrend] = useState<any[]>([]);
  const [mostAbsent, setMostAbsent] = useState<any[]>([]);
  const [buckets, setBuckets] = useState<any>(null);

  useEffect(() => {
    api.get<any[]>('/attendance/analytics/trend').then(setTrend);
    api.get<any[]>('/attendance/analytics/by-class').then(setByClass);
    api.get<any>('/attendance/analytics/present-vs-absent').then((d) =>
      setPresentVsAbsent([
        { name: 'Present', value: d.present },
        { name: 'Absent', value: d.absent },
        { name: 'Permission', value: d.permission },
      ]),
    );
    api.get<any[]>('/attendance/analytics/registration-trend').then(setRegistrationTrend);
    api.get<any[]>('/attendance/analytics/most-absent').then(setMostAbsent);
    api.get<any>('/attendance/analytics/absence-buckets').then(setBuckets);
  }, []);

  return (
    <div>
      <Topbar title="Attendance Analytics" subtitle="Trends, class breakdowns, and registration growth" />

      {buckets && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card p-4"><p className="text-xs text-slate uppercase">Absent 1-3 days</p><p className="text-xl font-semibold text-status-warning mt-1">{buckets.days1to3}</p></div>
          <div className="card p-4"><p className="text-xs text-slate uppercase">Absent 4-6 days</p><p className="text-xl font-semibold text-status-absent mt-1">{buckets.days4to6}</p></div>
          <div className="card p-4"><p className="text-xs text-slate uppercase">Absent 7-12 days</p><p className="text-xl font-semibold text-status-longabsence mt-1">{buckets.days7to12}</p></div>
        </div>
      )}

      <div className="card p-6 mb-6">
        <h2 className="text-sm font-semibold text-ink mb-4">Attendance Trend</h2>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
            <XAxis dataKey="date" fontSize={11} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="present" stroke="#16A34A" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="absent" stroke="#DC2626" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="permission" stroke="#EAB308" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-ink mb-4">Attendance by Class</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byClass}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis dataKey="className" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="attendancePercentage" fill="#D4AF37" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h2 className="text-sm font-semibold text-ink mb-4">Present vs Absent vs Permission</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={presentVsAbsent} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}>
                {presentVsAbsent.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-ink mb-4">Registration Trend</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={registrationTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="count" fill="#111111" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h2 className="text-sm font-semibold text-ink mb-4">Most Frequently Absent Students</h2>
          <div className="space-y-2">
            {mostAbsent.map((m: any) => (
              <div key={m.studentId} className="flex justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-ink">{m.fullName}</span>
                <span className="text-status-absent font-medium">{m.absentCount} absences</span>
              </div>
            ))}
            {mostAbsent.length === 0 && <p className="text-sm text-slate">No absences recorded yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
