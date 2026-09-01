/**
 * All Amharic display strings used by the PDF/Excel audit report exporters.
 * Kept in one place so wording can be adjusted (e.g. "ልዩነቶች", "የአካውንት ሂሳቦች")
 * without touching the layout code.
 */
export const LABELS = {
  institution: 'መርኃ ህይወት ሰ/ት/ቤት',
  subtitle: 'Sunday School Management System',
  monthlyTitle: 'ወራዊ ሪፖርት',
  yearlyTitle: 'አመታዊ ሪፖርት',
  era: 'ዓ.ም',
  generatedOn: 'የተዘጋጀበት ቀን',
  generatedBy: 'አዘጋጅ',

  incomeSummary: 'የገቢ ማጠቃለያ',
  expenseSummary: 'የወጪ ማጠቃለያ',
  accountBalances: 'የአካውንት ሂሳቦች',
  discrepancies: 'ልዩነቶች',
  missingReceipts: 'የጎደሉ ደረሰኞች',
  pendingApprovals: 'በማጽደቅ ላይ',
  adjustmentsLog: 'የማስተካከያ መዝገብ',
  summary: 'ማጠቃለያ',

  totalIncome: 'ጠቅላላ ገቢ',
  totalExpense: 'ጠቅላላ ወጪ',
  net: 'የተጣራ ሂሳብ',
  none: 'የለም',

  income: 'ገቢ',
  expense: 'ወጪ',

  studentFeeBatchNote: 'የተማሪ ክፍያ ድምር እስከ',
  studentFeeBatchNotedAt: 'ድረስ ወቅታዊ ነው (በዕለታዊ ቡድን ስራ መሰረት)',
} as const;

/** Warning marker for discrepancy statuses — ASCII-safe (no ⚠ glyph in the bundled fonts). */
export const WARN_MARK = '[!]';
