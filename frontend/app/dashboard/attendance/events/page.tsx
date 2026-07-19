'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Topbar } from '@/components/layout/Topbar';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';

interface ClassGroup { id: string; name: string; }
interface EventRow {
  id: string;
  name: string;
  date: string;
  eventType: string;
  description: string | null;
  status: string;
  studentCount: number;
  attendanceCount: number;
}

const EVENT_TYPES = ['SUNDAY_SCHOOL', 'MEETING', 'SPECIAL_PROGRAM', 'RETREAT', 'CAMP', 'OTHER'];
const STATUSES = ['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'];

export default function EventsPage() {
  const [rows, setRows] = useState<EventRow[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const data = await api.get<EventRow[]>('/attendance/events-list');
    setRows(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    api.get<ClassGroup[]>('/students/classes').then(setClasses);
  }, []);

  return (
    <div>
      <Topbar title="Events" subtitle="Retreats, camps, meetings, and special programs across all classes" />

      <div className="flex justify-end mb-4">
        <button className="btn-gold" onClick={() => setShowCreate(true)}>+ Create Event</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map((e) => (
          <div key={e.id} className="card p-5">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-ink">{e.name}</h3>
              <Badge variant={e.status === 'COMPLETED' ? 'paid' : e.status === 'CANCELLED' ? 'unpaid' : 'partial'}>
                {e.status}
              </Badge>
            </div>
            <p className="text-xs text-slate mb-1">{new Date(e.date).toLocaleDateString()} · {e.eventType.replace(/_/g, ' ')}</p>
            {e.description && <p className="text-sm text-ink mb-3">{e.description}</p>}
            <div className="flex gap-6 pt-3 border-t border-gray-100 text-sm">
              <div><p className="text-slate text-xs">Students</p><p className="font-medium text-ink">{e.studentCount}</p></div>
              <div><p className="text-slate text-xs">Attendance</p><p className="font-medium text-gold">{e.attendanceCount}</p></div>
            </div>
          </div>
        ))}
        {!loading && rows.length === 0 && <p className="text-sm text-slate">No events yet.</p>}
      </div>

      {showCreate && (
        <CreateEventModal classes={classes} onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); load(); }} />
      )}
    </div>
  );
}

function CreateEventModal({ classes, onClose, onSaved }: { classes: ClassGroup[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [eventType, setEventType] = useState('SPECIAL_PROGRAM');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('UPCOMING');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function toggleClass(id: string) {
    setSelectedClasses((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  async function submit() {
    setSaving(true);
    try {
      await api.post('/attendance/events-list', {
        name, date, eventType, description, status, participatingClassIds: selectedClasses,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title="Create Event" onClose={onClose}>
      <div className="space-y-3">
        <div><label className="label">Event Name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Date</label><input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div><label className="label">Type</label>
            <select className="input" value={eventType} onChange={(e) => setEventType(e.target.value)}>
              {EVENT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
        </div>
        <div><label className="label">Description</label><textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div>
          <label className="label">Participating Classes</label>
          <div className="flex gap-2 flex-wrap">
            {classes.map((c) => (
              <button
                key={c.id}
                onClick={() => toggleClass(c.id)}
                className={`text-xs px-3 py-1.5 rounded-lg border ${
                  selectedClasses.includes(c.id) ? 'bg-gold/10 border-gold text-ink' : 'border-gray-200 text-slate hover:bg-mist'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
        <div><label className="label">Status</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-gold" disabled={saving || !name} onClick={submit}>{saving ? 'Saving…' : 'Create Event'}</button>
        </div>
      </div>
    </Modal>
  );
}
