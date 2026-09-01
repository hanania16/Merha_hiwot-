'use client';

import { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { api } from '@/lib/api';
import { Topbar } from '@/components/layout/Topbar';
import { StatCard } from '@/components/ui/StatCard';
import { useLang } from '@/lib/i18n';

const COLORS = ['#D4AF37', '#111111', '#4B5563', '#16A34A', '#DC2626', '#EAB308', '#F97316', '#9CA3AF', '#6366F1'];

export default function AnalyticsPage() {
  const { t } = useLang();
  const [trend, setTrend] = useState<any[]>([]);
  const [expenseByCategory, setExpenseByCategory] = useState<any[]>([]);
  const [donationTrend, setDonationTrend] = useState<any[]>([]);
  const [collectionRate, setCollectionRate] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState<any>(null);
  const [yearlyTrend, setYearlyTrend] = useState<any[]>([]);

  useEffect(() => {
    api.get<any[]>('/finance/analytics/income-vs-expense').then(setTrend);
    api.get<any[]>('/finance/analytics/expenses-by-category').then(setExpenseByCategory);
    api.get<any[]>('/finance/analytics/donation-trend').then(setDonationTrend);
    api.get<any>('/finance/analytics/collection-rate').then(setCollectionRate);
    api.get<any>('/finance/analytics/payment-status').then(setPaymentStatus);
    api.get<any[]>('/finance/analytics/yearly-trend').then(setYearlyTrend);
  }, []);

  return (
    <div>
      <Topbar title={t('financialAnalytics')} subtitle={t('financialAnalyticsSub')} />

      {collectionRate && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard label={t('collectionRate')} value={`${collectionRate.collectionRatePercent}%`} accent="gold" />
          <StatCard label={t('monthsPaid')} value={String(collectionRate.totalPaidMonths)} accent="green" />
          <StatCard label={t('monthsPossible')} value={String(collectionRate.totalPossibleMonths)} accent="ink" />
        </div>
      )}

      {paymentStatus && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard label={t('notPaid')} value={String(paymentStatus.notPaid)} accent="red" />
          <StatCard label={t('paidToday')} value={String(paymentStatus.paidToday)} accent="green" />
          <StatCard label={t('paidThisMonth')} value={String(paymentStatus.paidThisMonth)} accent="green" />
        </div>
      )}

      <div className="card p-6 mb-6">
        <h2 className="text-sm font-semibold text-ink mb-4">{t('incomeVsExpenseTrend')}</h2>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
            <XAxis dataKey="month" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="income" stroke="#16A34A" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="expense" stroke="#DC2626" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="balance" stroke="#D4AF37" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-ink mb-4">{t('expensesByCategory')}</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={expenseByCategory} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={90}>
                {expenseByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h2 className="text-sm font-semibold text-ink mb-4">{t('donationTrend')}</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={donationTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="total" fill="#D4AF37" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-sm font-semibold text-ink mb-4">{t('yearlyFinancialTrend')}</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={yearlyTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
            <XAxis dataKey="year" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Legend />
            <Bar dataKey="income" fill="#16A34A" radius={[6, 6, 0, 0]} />
            <Bar dataKey="expense" fill="#DC2626" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
