'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Wallet, TrendingDown, FileBarChart, PieChart, Receipt,
  LogOut, Users, CalendarCheck, CalendarDays, UserX, ShieldCheck,
} from 'lucide-react';
import { logout, getCurrentUser } from '@/lib/auth';
import { useLang } from '@/lib/i18n';

const FINANCE_NAV = [
  { href: '/dashboard/finance', key: 'dashboard', icon: LayoutDashboard },
  { href: '/dashboard/finance/student-fees', key: 'studentFees', icon: Wallet },
  { href: '/dashboard/finance/income', key: 'income', icon: TrendingDown },
  { href: '/dashboard/finance/expense', key: 'expenses', icon: TrendingDown },
  { href: '/dashboard/finance/analytics', key: 'analytics', icon: PieChart },
  { href: '/dashboard/finance/reports', key: 'reports', icon: FileBarChart },
  { href: '/dashboard/finance/receipts', key: 'receipts', icon: Receipt },
];

const ATTENDANCE_NAV = [
  { href: '/dashboard/attendance', key: 'dashboard', icon: LayoutDashboard },
  { href: '/dashboard/attendance/students', key: 'students', icon: Users },
  { href: '/dashboard/attendance/take', key: 'takeAttendance', icon: CalendarCheck },
  { href: '/dashboard/attendance/inactive', key: 'inactiveStudents', icon: UserX },
  { href: '/dashboard/attendance/events', key: 'events', icon: CalendarDays },
  { href: '/dashboard/attendance/analytics', key: 'analytics', icon: PieChart },
  { href: '/dashboard/attendance/reports', key: 'reports', icon: FileBarChart },
];

export function Sidebar() {
  const pathname = usePathname();
  const user = getCurrentUser();
  const { t } = useLang();

  const showFinance = user?.role === 'ADMINISTRATOR' || user?.role === 'FINANCE_OFFICER';
  const showAttendance = user?.role === 'ADMINISTRATOR' || user?.role === 'ATTENDANCE_OFFICER';
  const showAdmin = user?.role === 'ADMINISTRATOR';

  function renderGroup(label: string, items: typeof FINANCE_NAV) {
    return (
      <div className="mb-4">
        <p className="px-3 mb-1 text-[10px] font-semibold tracking-wider text-white/40 uppercase">{label}</p>
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                active ? 'bg-gold text-ink' : 'text-white/80 hover:bg-white/10'
              }`}
            >
              <Icon size={18} />
              {t(item.key)}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <aside className="w-64 shrink-0 bg-ink text-white min-h-screen flex flex-col">
      <div className="px-6 py-6 border-b border-white/10 flex items-center gap-3">
        <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 bg-white/5">
          <Image src="/logo.jpg" alt="Church logo" width={44} height={44} className="object-cover w-full h-full" />
        </div>
        <div>
          <p className="text-base font-semibold text-gold leading-tight">መርሃ ህይወት</p>
          <p className="text-sm text-white/70 leading-tight">ሰ/ቤት</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {showAttendance && renderGroup(t('studentManagementAttendance'), ATTENDANCE_NAV)}
        {showFinance && renderGroup(t('finance'), FINANCE_NAV)}
        {showAdmin && (
          <div className="mb-4">
            <p className="px-3 mb-1 text-[10px] font-semibold tracking-wider text-white/40 uppercase">{t('admin')}</p>
            <Link
              href="/dashboard/admin"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                pathname === '/dashboard/admin' ? 'bg-gold text-ink' : 'text-white/80 hover:bg-white/10'
              }`}
            >
              <ShieldCheck size={18} />
              {t('admin')}
            </Link>
          </div>
        )}
      </nav>

      <div className="px-4 py-4 border-t border-white/10">
        <p className="text-sm text-white/90 truncate">{user?.fullName}</p>
        <p className="text-xs text-white/40 mb-3">{user?.role.replace('_', ' ')}</p>
        <button onClick={logout} className="flex items-center gap-2 text-sm text-white/70 hover:text-white">
          <LogOut size={16} /> {t('signOut')}
        </button>
      </div>
    </aside>
  );
}
