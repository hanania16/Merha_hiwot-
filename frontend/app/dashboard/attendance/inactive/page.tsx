'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatEthiopianDateFromGregorian } from '@/lib/ethiopian-calendar';
import { Topbar } from '@/components/layout/Topbar';

interface InactiveStudent {
  studentId: string;
  studentCode: string;
  fullName: string;
  className: string;
  consecutiveAbsentDays: number | null;
  lastAttendanceDate: string | null;
  dateMarkedInactive: string | null;
  reason: string;
}

export default function InactiveStudentsPage() {
  const [rows, setRows] = useState<InactiveStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<InactiveStudent[]>('/students/inactive').then((d) => { setRows(d); setLoading(false); });
  }, []);

  return (
    <div>
      <Topbar
        title="Inactive Students"
        subtitle="Automatically moved here after 5 consecutive absences — records are kept, never deleted"
      />

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Student ID</th><th>Name</th><th className="hidden sm:table-cell">Class</th><th>Consecutive Absences</th>
              <th className="hidden sm:table-cell">Last Attendance</th><th className="hidden md:table-cell">Marked Inactive</th><th className="hidden lg:table-cell">Reason</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.studentId} className="opacity-70">
                <td className="font-mono text-xs">{r.studentCode}</td>
                <td className="font-medium text-ink">{r.fullName}</td>
                <td className="hidden sm:table-cell">{r.className}</td>
                <td className="text-status-absent font-medium">{r.consecutiveAbsentDays ?? '—'}</td>
                <td className="hidden sm:table-cell">{r.lastAttendanceDate ? formatEthiopianDateFromGregorian(new Date(r.lastAttendanceDate)) : '—'}</td>
                <td className="hidden md:table-cell">{r.dateMarkedInactive ? formatEthiopianDateFromGregorian(new Date(r.dateMarkedInactive)) : '—'}</td>
                <td className="hidden lg:table-cell text-xs text-slate">{r.reason}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={7} className="text-center text-sm text-slate py-8">No inactive students right now.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
