/**
 * Bilingual (en/am) display labels for the finance enum values that have
 * on-screen labels in the frontend i18n dictionary (frontend/lib/i18n.tsx).
 * Exporters use this so PDF/Excel cells match what the user sees in the UI.
 *
 * Values with NO UI label (STUDENT_FEE, TransactionStatus, ReconciliationStatus,
 * audit action strings, entity types) are intentionally NOT in this map —
 * enumLabel() falls back to the raw value for them.
 */
const EXPORT_LABELS: Record<string, { en: string; am: string }> = {
  // IncomeSourceType
  DONATION: { en: 'Donation', am: 'መዋጮ' },
  CHURCH_CONTRIBUTION: { en: 'Church Contribution', am: 'የቤተክርስቲያን መዋጮ' },
  FUNDRAISING: { en: 'Fundraising', am: 'የገንዘብ ማሰባሰብ' },
  SPECIAL_OFFERING: { en: 'Special Offering', am: 'ልዩ መባ' },
  DEBRE_TABOR_FEAST: { en: 'Debre Tabor Feast', am: 'ለደብረ ታቦር በዓል' },
  NEW_YEAR: { en: 'New Year', am: 'ለአዲስ ዓመት' },
  MESKEL_FEAST: { en: 'Meskel Feast', am: 'ለመስቀል በዓል' },
  OTHER: { en: 'Other', am: 'ሌላ' },

  // ExpenseCategory
  TEACHING_MATERIALS: { en: 'Teaching Materials', am: 'የማስተማሪያ ቁሳቁሶች' },
  STATIONERY: { en: 'Stationery', am: 'የቢሮ ቁሳቁሶች' },
  SNACKS: { en: 'Snacks', am: 'መክሰስ' },
  TRANSPORTATION: { en: 'Transportation', am: 'መጓጓዣ' },
  EQUIPMENT: { en: 'Equipment', am: 'መሳሪያዎች' },
  MAINTENANCE: { en: 'Maintenance', am: 'ጥገና' },
  EVENTS: { en: 'Events', am: 'ዝግጅቶች' },
  CHARITY: { en: 'Charity', am: 'በጎ አድራጎት' },
  MISCELLANEOUS: { en: 'Others', am: 'ሌሎች' },
  REVERSAL: { en: 'Reversal', am: 'መቀልበስ' },

  // IncomeCategory
  STUDENT_FEES: { en: 'Student Fees', am: 'የተማሪ ክፍያ' },
  DONATIONS: { en: 'Donations', am: 'መዋጮ' },
  DEVELOPMENT_DEPART: { en: 'Development Department', am: 'የልማት ክፍል' },
  OTHERS: { en: 'Others', am: 'ሌሎች' },
  OPENING_BALANCE: { en: 'Opening Balance', am: 'የመክፈቻ ቀሪ' },
};

/** Normalise an export `lang` query param — anything but 'en' defaults to 'am' (the document language). */
export function normLang(value?: string): 'en' | 'am' {
  return value === 'en' ? 'en' : 'am';
}

/** Display label for an enum value in the requested language; raw value when no label exists. */
export function enumLabel(value: string | null | undefined, lang: 'en' | 'am'): string {
  if (!value) return '–';
  return EXPORT_LABELS[value]?.[lang] ?? value;
}