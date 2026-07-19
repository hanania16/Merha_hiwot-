'use client';

import { NotificationBell } from './NotificationBell';
import { useLang } from '@/lib/i18n';

export function Header() {
  const { lang, setLang } = useLang();

  return (
    <div className="flex items-center justify-end gap-3 mb-6 -mt-2">
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
