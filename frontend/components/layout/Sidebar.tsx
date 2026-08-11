'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Wallet, TrendingDown, FileBarChart, PieChart, Receipt,
  LogOut, Users, CalendarCheck, CalendarDays, UserX, ShieldCheck, X,
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

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
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

  const sidebarContent = (
    <>
      <div className="px-4 sm:px-6 py-4 sm:py-6 border-b border-white/10 flex items-center gap-3">
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden shrink-0 bg-white/5">
          <Image src="/logo.jpg" alt="Church logo" width={44} height={44} className="object-cover w-full h-full" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm sm:text-base font-semibold text-gold leading-tight truncate">መርሃ ህይወት</p>
          <p className="text-xs sm:text-sm text-white/70 leading-tight truncate">ሰ/ቤት</p>
        </div>
        <button onClick={onClose} className="md:hidden p-1 rounded-lg hover:bg-white/10 text-white/70">
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {showAttendance && renderGroup(t('studentManagementAttendance'), ATTENDANCE_NAV)}
        {showFinance && renderGroup(t('finance'), FINANCE_NAV)}
        {showAdmin && (
          <div className="mb-4">
            <p className="px-3 mb-1 text-[10px] font-semibold tracking-wider text-white/40 uppercase">{t('admin')}</p>
            <Link
              href="/dashboard/admin"
              onClick={onClose}
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
        <p className="text-xs text-white/40 mb-3 truncate">{user?.role.replace('_', ' ')}</p>
        <button onClick={logout} className="flex items-center gap-2 text-sm text-white/70 hover:text-white">
          <LogOut size={16} /> {t('signOut')}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile drawer */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-64 sm:w-72 bg-ink text-white flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 bg-ink text-white min-h-screen flex-col">
        {sidebarContent}
      </aside>
    </>
  );
}
