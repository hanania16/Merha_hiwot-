'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Topbar } from '@/components/layout/Topbar';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';

interface Profile {
  fullName: string;
  gender: string;
  age: number;
  registrationDate: string;
  parentName: string;
  parentPhone: string;
  class: { name: string };
  status: string;
  attendancePercentage: number;
  presentCount: number;
  absentCount: number;
  permissionCount: number;
  consecutiveAbsenceCount: number;
  feeStatus: { status: string; unpaidMonths: number; lastPaidMonth: string | null };
  attendanceHistory: { date: string; eventType: string; title: string | null; status: string }[];
}

export default function StudentProfilePage() {
  const params = useParams();
  const id = params.id as string;
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    api.get<Profile>(`/students/${id}`).then(setProfile);
  }, [id]);

  if (!profile) return <p className="text-sm text-slate">Loading…</p>;

  return (
    <div>
      <Topbar title={profile.fullName} subtitle={`${profile.class.name} · Age ${profile.age} · ${profile.gender}`} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="card p-5">
          <p className="text-xs font-medium text-slate uppercase mb-2">Personal Information</p>
          <p className="text-sm text-ink">Parent/Guardian: {profile.parentName}</p>
          <p className="text-sm text-ink">Parent Phone: {profile.parentPhone}</p>
          {profile.registrationDate && (
            <p className="text-sm text-ink mt-2">Enrolled: {new Date(profile.registrationDate).toLocaleDateString()}</p>
          )}
          <p className="text-sm mt-1">
            Status: <Badge variant={profile.status === 'ACTIVE' ? 'paid' : 'neutral'}>{profile.status}</Badge>
            {' '}
            {profile.consecutiveAbsenceCount >= 2 && (
              <Badge variant={profile.consecutiveAbsenceCount > 3 ? 'unpaid' : 'partial'}>
                {profile.consecutiveAbsenceCount} consecutive absences
              </Badge>
            )}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium text-slate uppercase mb-2">Fee Status (Read Only)</p>
          <Badge variant={profile.feeStatus.status === 'PAID' ? 'paid' : profile.feeStatus.status === 'PARTIAL' ? 'partial' : 'unpaid'}>
            {profile.feeStatus.status}
          </Badge>
          <p className="text-sm text-ink mt-2">Unpaid months: {profile.feeStatus.unpaidMonths}</p>
          <p className="text-sm text-ink">Last paid month: {profile.feeStatus.lastPaidMonth ?? '—'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="Attendance %" value={`${profile.attendancePercentage}%`} accent="gold" />
        <StatCard label="Present" value={String(profile.presentCount)} accent="green" />
        <StatCard label="Absent" value={String(profile.absentCount)} accent="red" />
        <StatCard label="Permission" value={String(profile.permissionCount)} accent="ink" />
      </div>

      <div className="card p-6">
        <h2 className="text-sm font-semibold text-ink mb-4">Attendance History</h2>
        <table className="table-base">
          <thead><tr><th>Date</th><th>Event</th><th>Status</th></tr></thead>
          <tbody>
            {profile.attendanceHistory.slice(0, 30).map((h, i) => (
              <tr key={i}>
                <td>{new Date(h.date).toLocaleDateString()}</td>
                <td>{h.title || h.eventType.replace(/_/g, ' ')}</td>
                <td>
                  <Badge variant={h.status === 'PRESENT' ? 'paid' : h.status === 'PERMISSION' ? 'partial' : 'unpaid'}>
                    {h.status}
                  </Badge>
                </td>
              </tr>
            ))}
            {profile.attendanceHistory.length === 0 && (
              <tr><td colSpan={3} className="text-center text-sm text-slate py-8">No attendance recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
