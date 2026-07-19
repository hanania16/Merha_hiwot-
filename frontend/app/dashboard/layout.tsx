'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { LanguageProvider } from '@/lib/i18n';
import { getCurrentUser } from '@/lib/auth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) return null;

  return (
    <LanguageProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-8 max-w-7xl">
          <Header />
          {children}
        </main>
      </div>
    </LanguageProvider>
  );
}
