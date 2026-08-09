'use client';

import { useEffect, useState } from 'react';
import { api, downloadUrl } from '@/lib/api';
import { Topbar } from '@/components/layout/Topbar';
import { Badge } from '@/components/ui/Badge';
import { EthiopianDatePicker } from '@/components/EthiopianDatePicker';
import { formatEthiopianDateFromGregorian, ethiopianTodayISO } from '@/lib/ethiopian-calendar';

interface ClassGroup { id: string; name: string; }

function today() { return ethiopianTodayISO(); }
function firstOfMonth() { return ethiopianTodayISO(); }

export default function AttendanceReportsPage() {
  const [tab, setTab] = useState<'daily' | 'class' | 'registration'>('daily');
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [date, setDate] = useState(today());
  const [classId, setClassId] = useState('');
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [classData, setClassData] = useState<any[]>([]);
  const [regData, setRegData] = useState<any[]>([]);

  useEffect(() => {
    api.get<ClassGroup[]>('/students/classes').then((cls) => {
      setClasses(cls);
      if (cls.length) setClassId(cls[0].id);
    });
  }, []);

  async function loadDaily() { setDailyData(await api.get<any[]>(`/attendance/reports/daily?date=${date}`)); }
  async function loadClass() { setClassData(await api.get<any[]>(`/attendance/reports/class/${classId}`)); }
  async function loadRegistration() { setRegData(await api.get<any[]>(`/attendance/reports/registration?from=${from}&to=${to}`)); }

  return (
    <div>
      <Topbar title="Attendance Reports" subtitle="Daily, class, and registration reports with export" />

      <div className="flex flex-wrap gap-2 mb-6">
        {(['daily', 'class', 'registration'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t ? 'bg-ink text-white' : 'btn-outline'}`}
          >
            {t === 'daily' ? 'Daily' : t === 'class' ? 'Class' : 'Registration'}
          </button>
        ))}
      </div>

      {tab === 'daily' && (
        <>
          <div className="card p-4 mb-6 flex flex-wrap items-end gap-3">
            <div><label className="label">Date</label><EthiopianDatePicker value={date} onChange={(d) => setDate(d)} /></div>
            <button className="btn-outline" onClick={loadDaily}>Generate</button>
          </div>
          {dailyData.map((event, i) => (
            <div key={i} className="card p-6 mb-4">
              <h3 className="text-sm font-semibold text-ink mb-3">{event.title || event.eventType.replace(/_/g, ' ')}</h3>
              <table className="table-base">
                <thead><tr><th>Student</th><th className="hidden sm:table-cell">Class</th><th>Status</th></tr></thead>
                <tbody>
                  {event.records.map((r: any, j: number) => (
                    <tr key={j}>
                      <td>{r.studentName}</td><td className="hidden sm:table-cell">{r.className}</td>
                      <td><Badge variant={r.status === 'PRESENT' ? 'paid' : r.status === 'PERMISSION' ? 'partial' : 'unpaid'}>{r.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {dailyData.length === 0 && <p className="text-sm text-slate">No attendance recorded for this date yet.</p>}
        </>
      )}

      {tab === 'class' && (
        <>
          <div className="card p-4 mb-6 flex flex-wrap items-end gap-3">
            <div>
              <label className="label">Class</label>
              <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)}>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <button className="btn-outline" onClick={loadClass}>Generate</button>
            <a className="btn-gold" href={downloadUrl(`/attendance/reports/class/${classId}/export/excel`)} target="_blank" rel="noreferrer">Export Excel</a>
          </div>
          <div className="card overflow-x-auto">
            <table className="table-base">
              <thead><tr><th>Student</th><th>Present</th><th>Absent</th><th>Permission</th><th>Attendance %</th></tr></thead>
              <tbody>
                {classData.map((r: any, i: number) => (
                  <tr key={i}>
                    <td className="font-medium text-ink">{r.fullName}</td>
                    <td>{r.present}</td><td>{r.absent}</td><td>{r.permission}</td>
                    <td className="text-gold font-medium">{r.attendancePercentage}%</td>
                  </tr>
                ))}
                {classData.length === 0 && <tr><td colSpan={5} className="text-center text-sm text-slate py-8">Generate a report to see results.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'registration' && (
        <>
          <div className="card p-4 mb-6 flex flex-wrap items-end gap-3">
            <div><label className="label">From</label><EthiopianDatePicker value={from} onChange={(d) => setFrom(d)} /></div>
            <div><label className="label">To</label><EthiopianDatePicker value={to} onChange={(d) => setTo(d)} /></div>
            <button className="btn-outline" onClick={loadRegistration}>Generate</button>
            <a className="btn-gold" href={downloadUrl(`/attendance/reports/registration/export/pdf?from=${from}&to=${to}`)} target="_blank" rel="noreferrer">Export PDF</a>
          </div>
          <div className="card overflow-x-auto">
            <table className="table-base">
              <thead><tr><th>Student</th><th className="hidden sm:table-cell">Class</th><th className="hidden sm:table-cell">Gender</th><th>Registration Date</th></tr></thead>
              <tbody>
                {regData.map((r: any, i: number) => (
                  <tr key={i}>
                    <td className="font-medium text-ink">{r.fullName}</td>
                    <td className="hidden sm:table-cell">{r.className}</td><td className="hidden sm:table-cell">{r.gender}</td>
                    <td>{formatEthiopianDateFromGregorian(new Date(r.registrationDate))}</td>
                  </tr>
                ))}
                {regData.length === 0 && <tr><td colSpan={4} className="text-center text-sm text-slate py-8">Generate a report to see results.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
