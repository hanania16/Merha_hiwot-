'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Topbar } from '@/components/layout/Topbar';
import { formatEthiopianDateFromGregorian } from '@/lib/ethiopian-calendar';

interface ClassGroup { id: string; name: string; }
interface RosterEntry {
  studentId: string;
  fullName: string;
  fullNameAmharic: string | null;
  studentCode: string;
  className: string;
  currentStatus: 'PRESENT' | 'ABSENT' | 'PERMISSION' | 'LATE' | null;
}

const EVENT_TYPES = [
  { value: 'SUNDAY_SCHOOL', label: 'Sunday School' },
  { value: 'MEETING', label: 'Meeting' },
  { value: 'SPECIAL_PROGRAM', label: 'Special Program' },
  { value: 'RETREAT', label: 'Retreat' },
  { value: 'CAMP', label: 'Camp' },
  { value: 'OTHER', label: 'Other' },
];

const STATUS_STYLES: Record<string, string> = {
  PRESENT: 'bg-status-present text-white border-status-present',
  ABSENT: 'bg-status-absent text-white border-status-absent',
  PERMISSION: 'bg-status-permission text-white border-status-permission',
  LATE: 'bg-status-warning text-white border-status-warning',
};

export default function TakeAttendancePage() {
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [eventType, setEventType] = useState('SUNDAY_SCHOOL');
  const [title, setTitle] = useState('');
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    api.get<ClassGroup[]>('/students/classes').then((cls) => {
      setClasses(cls);
      if (cls.length) setClassId(cls[0].id);
    });
  }, []);

  async function loadRoster() {
    if (!classId) return;
    setLoading(true);
    const data = await api.get<RosterEntry[]>(`/attendance/records/roster?classId=${classId}&date=${date}`);
    setRoster(data);
    setStatuses(Object.fromEntries(data.map((r) => [r.studentId, r.currentStatus ?? 'PRESENT'])));
    setLoading(false);
  }

  useEffect(() => { loadRoster(); /* eslint-disable-next-line */ }, [classId, date]);

  function setAll(status: string) {
    setStatuses(Object.fromEntries(roster.map((r) => [r.studentId, status])));
  }

  async function save() {
    setSaving(true);
    setSavedMsg('');
    try {
      const result = await api.post<{ autoInactivated: { studentId: string; fullName: string }[] }>('/attendance/records/bulk', {
        date,
        eventType,
        title: title || undefined,
        entries: roster.map((r) => ({ studentId: r.studentId, status: statuses[r.studentId] ?? 'PRESENT' })),
      });
      let msg = `Saved attendance for ${roster.length} students.`;
      if (result.autoInactivated?.length) {
        msg += ` ${result.autoInactivated.map((s) => s.fullName).join(', ')} reached 5 consecutive absences and moved to Inactive Students.`;
      }
      setSavedMsg(msg);
      loadRoster();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Topbar title="Take Attendance" subtitle={`Works on any day — ${formatEthiopianDateFromGregorian(new Date(date))} (Ethiopian calendar)`} />

      <div className="card p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="label">Class</label>
          <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)}>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Date</label>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Event Type</label>
          <select className="input" value={eventType} onChange={(e) => setEventType(e.target.value)}>
            {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="label">Title (optional)</label>
          <input className="input" placeholder="e.g. Christmas Retreat" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2">
          <button className="btn-outline text-xs" onClick={() => setAll('PRESENT')}>Mark all Present</button>
          <button className="btn-outline text-xs" onClick={() => setAll('ABSENT')}>Mark all Absent</button>
        </div>
        <button className="btn-gold" onClick={save} disabled={saving || roster.length === 0}>
          {saving ? 'Saving…' : 'Save Attendance'}
        </button>
      </div>

      {savedMsg && <p className="text-sm text-status-present mb-3">{savedMsg}</p>}

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>Student</th><th>Status</th></tr></thead>
          <tbody>
            {roster.map((r) => (
              <tr key={r.studentId}>
                <td className="font-medium text-ink">
                  <p>{r.fullName}{r.fullNameAmharic ? ` · ${r.fullNameAmharic}` : ''}</p>
                  <p className="text-xs text-slate font-normal font-mono">{r.studentCode}</p>
                </td>
                <td>
                  <div className="flex gap-2">
                    {(['PRESENT', 'ABSENT', 'LATE', 'PERMISSION'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setStatuses((prev) => ({ ...prev, [r.studentId]: s }))}
                        className={`text-xs px-3 py-1.5 rounded-lg border ${
                          statuses[r.studentId] === s ? STATUS_STYLES[s] : 'border-gray-200 text-slate hover:bg-mist'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && roster.length === 0 && (
              <tr><td colSpan={2} className="text-center text-sm text-slate py-8">No active students in this class.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
