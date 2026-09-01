'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatETB } from '@/lib/ethiopian-calendar';
import { Topbar } from '@/components/layout/Topbar';
import { StatCard } from '@/components/ui/StatCard';
import { useLang } from '@/lib/i18n';

interface Overview {
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  newRegistrationsThisMonth: number;
  totalIncome: number;
  totalExpenses: number;
  currentBalance: number;
  outstandingFees: number;
  ethiopianYear: number;
}

export default function AdminOverviewPage() {
  const { t } = useLang();
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => { api.get<Overview>('/admin/overview').then(setData); }, []);

  if (!data) return <p className="text-sm text-slate">{t('loading')}</p>;

  return (
    <div>
      <Topbar title={t('adminOverview')} subtitle={t('adminOverviewSub', { year: data.ethiopianYear })} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label={t('totalStudents')} value={String(data.totalStudents)} accent="ink" />
        <StatCard label={t('activeStudents')} value={String(data.activeStudents)} accent="green" />
        <StatCard label={t('inactiveStudentsShort')} value={String(data.inactiveStudents)} accent="red" />
        <StatCard label={t('newRegistrations')} value={String(data.newRegistrationsThisMonth)} accent="gold" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label={t('totalIncome')} value={formatETB(data.totalIncome)} accent="green" />
        <StatCard label={t('totalExpenses')} value={formatETB(data.totalExpenses)} accent="red" />
        <StatCard label={t('currentBalance')} value={formatETB(data.currentBalance)} accent="gold" />
        <StatCard label={t('outstandingFees')} value={formatETB(data.outstandingFees)} accent="red" />
      </div>
    </div>
  );
}
