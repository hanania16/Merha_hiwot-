'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export type Lang = 'en' | 'am';

const DICTIONARY: Record<string, { en: string; am: string }> = {
  dashboard: { en: 'Dashboard', am: 'ዳሽቦርድ' },
  students: { en: 'Students', am: 'ተማሪዎች' },
  takeAttendance: { en: 'Take Attendance', am: 'ክትትል ይመዝግቡ' },
  attendance: { en: 'Attendance', am: 'ክትትል' },
  events: { en: 'Events', am: 'ዝግጅቶች' },
  analytics: { en: 'Analytics', am: 'ትንተና' },
  reports: { en: 'Reports', am: 'ሪፖርቶች' },
  finance: { en: 'Finance', am: 'ፋይናንስ' },
  studentFees: { en: 'Student Fees', am: 'የተማሪ ክፍያ' },
  bankAccounts: { en: 'Bank Accounts', am: 'የባንክ ሂሳቦች' },
  income: { en: 'Income', am: 'ገቢ' },
  expenses: { en: 'Expenses', am: 'ወጪ' },
  receipts: { en: 'Receipts', am: 'ደረሰኞች' },
  admin: { en: 'Admin', am: 'አስተዳደር' },
  inactiveStudents: { en: 'Inactive Students', am: 'ንቁ ያልሆኑ ተማሪዎች' },
  signOut: { en: 'Sign out', am: 'ውጣ' },
  notifications: { en: 'Notifications', am: 'ማሳወቂያዎች' },
  totalStudents: { en: 'Total Students', am: 'ጠቅላላ ተማሪዎች' },
  activeStudents: { en: 'Active Students', am: 'ንቁ ተማሪዎች' },
  presentToday: { en: 'Present Today', am: 'ዛሬ የተገኙ' },
  absentToday: { en: 'Absent Today', am: 'ዛሬ ያልተገኙ' },
  registerStudent: { en: 'Register Student', am: 'ተማሪ መዝግብ' },
  recordPayment: { en: 'Record Payment', am: 'ክፍያ መዝግብ' },
  search: { en: 'Search', am: 'ፈልግ' },
  studentManagementAttendance: { en: 'Student Management & Attendance', am: 'የተማሪ አስተዳደር እና ክትትል' },
};

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const LangContext = createContext<LangContextValue>({ lang: 'en', setLang: () => {}, t: (k) => k });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    const saved = localStorage.getItem('mh_lang') as Lang | null;
    if (saved) setLangState(saved);
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem('mh_lang', l);
  }

  function t(key: string) {
    return DICTIONARY[key]?.[lang] ?? key;
  }

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}
