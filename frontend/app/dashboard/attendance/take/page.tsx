'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Topbar } from '@/components/layout/Topbar';
import { EthiopianDatePicker } from '@/components/EthiopianDatePicker';
import { ethiopianTodayISO } from '@/lib/ethiopian-calendar';

interface ClassGroup { id: string; name: string; }
interface RosterEntry {
  studentId: string;
  fullName: string;
  fullNameAmharic: string | null;
  studentCode: string;
  className: string;
  currentStatus: 'PRESENT' | 'ABSENT' | 'PERMISSION' | 'LATE' | null;
  attendanceId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

const EVENT_TYPES = [
  { value: 'SUNDAY_SCHOOL', label: 'Sunday School' },
  { value: 'COURSE', label: 'Course' },
  { value: 'SPECIAL_OCCASIONS', label: 'Special Occasions' },
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
  const [date, setDate] = useState(ethiopianTodayISO());
  const [eventType, setEventType] = useState('SUNDAY_SCHOOL');
  const [title, setTitle] = useState('');
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [editing, setEditing] = useState(false);
  const [editedAt, setEditedAt] = useState('');

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
    setEditing(false);
    setSavedMsg('');
    setEditedAt('');
    setLoading(false);
  }

  useEffect(() => { loadRoster(); /* eslint-disable-next-line */ }, [classId, date]);

  const isSaved = roster.some((r) => r.currentStatus !== null);

  function setAll(status: string) {
    setStatuses(Object.fromEntries(roster.map((r) => [r.studentId, status])));
  }

  async function save() {
    setSaving(true);
    setSavedMsg('');
    try {
      const result = await api.post<{
        autoInactivated: { studentId: string; fullName: string }[];
        updatedCount: number;
        records: { updatedAt: string }[];
      }>('/attendance/records/bulk', {
        date,
        eventType,
        title: title || '',
        entries: roster.map((r) => ({ studentId: r.studentId, status: statuses[r.studentId] ?? 'PRESENT' })),
      });
      if (result.updatedCount > 0) {
        const last = result.records.map((r) => new Date(r.updatedAt).getTime()).sort((a, b) => b - a)[0];
        const d = new Date(last);
        setEditedAt(d.toLocaleString());
        let msg = `Attendance edited for ${roster.length} students.`;
        if (result.autoInactivated?.length) {
          msg += ` ${result.autoInactivated.map((s) => s.fullName).join(', ')} reached 5 consecutive absences and moved to Inactive Students.`;
        }
        setSavedMsg(msg);
      } else {
        let msg = `Saved attendance for ${roster.length} students.`;
        if (result.autoInactivated?.length) {
          msg += ` ${result.autoInactivated.map((s) => s.fullName).join(', ')} reached 5 consecutive absences and moved to Inactive Students.`;
        }
        setSavedMsg(msg);
      }
      setEditing(false);
      loadRoster();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Topbar title="Take Attendance" />

      <div className="card p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="label">Class</label>
          <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)}>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">የኢትዮጵያ ቀን</label>
          <EthiopianDatePicker value={date} onChange={(d) => setDate(d)} />
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

      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex flex-wrap gap-2">
          <button className="btn-outline text-xs" onClick={() => setAll('PRESENT')} disabled={isSaved && !editing}>Mark all Present</button>
          <button className="btn-outline text-xs" onClick={() => setAll('ABSENT')} disabled={isSaved && !editing}>Mark all Absent</button>
        </div>
        {isSaved && !editing ? (
          <button className="btn-gold" onClick={() => setEditing(true)}>Edit</button>
        ) : (
          <div className="flex flex-wrap gap-2">
            {isSaved && <button className="btn-outline" onClick={() => loadRoster()}>Cancel</button>}
            <button className="btn-gold" onClick={save} disabled={saving || roster.length === 0}>
              {saving ? 'Saving…' : 'Save Attendance'}
            </button>
          </div>
        )}
      </div>

      {isSaved && !editing && (
        <p className="text-sm text-status-present mb-3">Attendance has already been saved for this date. Click Edit to make changes.</p>
      )}
      {savedMsg && <p className="text-sm text-status-present mb-3">{savedMsg}</p>}
      {editedAt && <p className="text-sm text-status-warning mb-3">This attendance was edited at {editedAt}.</p>}

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
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {(['PRESENT', 'ABSENT', 'LATE', 'PERMISSION'] as const).map((s) => (
                      <button
                        key={s}
                        disabled={isSaved && !editing}
                        onClick={() => setStatuses((prev) => ({ ...prev, [r.studentId]: s }))}
                        className={`text-xs px-2 sm:px-3 py-1.5 rounded-lg border ${
                          statuses[r.studentId] === s ? STATUS_STYLES[s] : 'border-gray-200 text-slate hover:bg-mist'
                        } disabled:opacity-60 disabled:cursor-not-allowed`}
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
