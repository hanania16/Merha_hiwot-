'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { LanguageProvider } from '@/lib/i18n';
import { HeaderProvider } from '@/lib/header-context';
import { getCurrentUser } from '@/lib/auth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push('/login');
      return;
    }
    if (pathname === '/dashboard' || pathname === '/dashboard/') {
      if (user.role === 'ADMINISTRATOR') {
        router.push('/dashboard/admin');
      } else if (user.role === 'FINANCE_OFFICER') {
        router.push('/dashboard/finance');
      } else if (user.role === 'TEACHER') {
        router.push('/dashboard/education');
      }
      return;
    }

    // Role-based route enforcement
    if (user.role === 'TEACHER') {
      if (
        pathname.startsWith('/dashboard/finance') ||
        pathname.startsWith('/dashboard/users') ||
        pathname.startsWith('/dashboard/admin')
      ) {
        router.replace('/dashboard/education');
        return;
      }
    }

    if (user.role === 'FINANCE_OFFICER') {
      if (
        pathname.startsWith('/dashboard/education') ||
        pathname.startsWith('/dashboard/users') ||
        pathname.startsWith('/dashboard/admin')
      ) {
        router.replace('/dashboard/finance');
        return;
      }
    }

    if (user.role !== 'ADMINISTRATOR') {
      if (pathname.startsWith('/dashboard/users') || pathname.startsWith('/dashboard/admin')) {
        router.replace(user.role === 'TEACHER' ? '/dashboard/education' : '/dashboard/finance');
        return;
      }
    }

    setReady(true);
  }, [router, pathname]);

  if (!ready) return null;

  return (
    <LanguageProvider>
      <HeaderProvider>
      <div className="flex min-h-screen">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl min-w-0">
          <Header onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
          {children}
        </main>
      </div>
      </HeaderProvider>
    </LanguageProvider>
  );
}
