'use client';

import { Menu } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { useLang } from '@/lib/i18n';

export function Header({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { lang, setLang } = useLang();

  return (
    <div className="flex items-center justify-between gap-3 mb-6 -mt-2">
      <button
        onClick={onToggleSidebar}
        className="md:hidden p-2 rounded-lg hover:bg-mist text-ink"
        aria-label="Toggle sidebar"
      >
        <Menu size={22} />
      </button>
      <div className="flex-1" />
      <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
        <button
          onClick={() => setLang('en')}
          className={`px-3 py-1.5 ${lang === 'en' ? 'bg-ink text-white' : 'bg-white text-slate hover:bg-mist'}`}
        >
          EN
        </button>
        <button
          onClick={() => setLang('am')}
          className={`px-3 py-1.5 ${lang === 'am' ? 'bg-ink text-white' : 'bg-white text-slate hover:bg-mist'}`}
        >
          አማ
        </button>
      </div>
      <NotificationBell />
    </div>
  );
}
