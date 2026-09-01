'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export type Lang = 'en' | 'am';

type Entry = string | { en: string; am: string };

const DICTIONARY: Record<string, Entry> = {
  // Navigation / layout
  dashboard: { en: 'Dashboard', am: 'ዳሽቦርድ' },
  students: { en: 'Students', am: 'ተማሪዎች' },
  analytics: { en: 'Analytics', am: 'ትንተና' },
  reports: { en: 'Reports', am: 'ሪፖርቶች' },
  finance: { en: 'Finance', am: 'ፋይናንስ' },
  studentFees: { en: 'Student Fees', am: 'የተማሪ ክፍያ' },
  income: { en: 'Income', am: 'ገቢ' },
  expenses: { en: 'Expenses', am: 'ወጪ' },
  expense: { en: 'Expense', am: 'ወጪ' },
  receipts: { en: 'Receipts', am: 'ደረሰኞች' },
  admin: { en: 'Admin', am: 'አስተዳደር' },
  inactiveStudents: { en: 'Inactive Students', am: 'ንቁ ያልሆኑ ተማሪዎች' },
  signOut: { en: 'Sign out', am: 'ውጣ' },
  notifications: { en: 'Notifications', am: 'ማሳወቂያዎች' },
  totalStudents: { en: 'Total Students', am: 'ጠቅላላ ተማሪዎች' },
  activeStudents: { en: 'Active Students', am: 'ንቁ ተማሪዎች' },
  registerStudent: { en: 'Register Student', am: 'ተማሪ መዝግብ' },
  recordPayment: { en: 'Record Payment', am: 'ክፍያ መዝግብ' },
  search: { en: 'Search', am: 'ፈልግ' },
  studentManagementAttendance: { en: 'Student Management', am: 'የተማሪ አስተዳደር' },

  // Common
  loading: { en: 'Loading…', am: 'በመጫን ላይ…' },
  cancel: { en: 'Cancel', am: 'ሰርዝ' },
  save: { en: 'Save', am: 'አስቀምጥ' },
  saving: { en: 'Saving…', am: 'በማስቀመጥ ላይ…' },
  delete: { en: 'Delete', am: 'ሰርዝ' },
  edit: { en: 'Edit', am: 'አስተካክል' },
  close: { en: 'Close', am: 'ዝጋ' },
  view: { en: 'View', am: 'ተመልከት' },
  generate: { en: 'Generate', am: 'አዘጋጅ' },
  date: { en: 'Date', am: 'ቀን' },
  status: { en: 'Status', am: 'ሁኔታ' },
  name: { en: 'Name', am: 'ስም' },
  amount: { en: 'Amount', am: 'መጠን' },
  description: { en: 'Description', am: 'መግለጫ' },
  from: { en: 'From', am: 'ከ' },
  to: { en: 'To', am: 'እስከ' },
  class: { en: 'Class', am: 'ክፍል' },
  allClasses: { en: 'All classes', am: 'ሁሉም ክፍሎች' },
  any: { en: 'Any', am: 'ማንኛውም' },
  all: { en: 'All', am: 'ሁሉም' },
  male: { en: 'Male', am: 'ወንድ' },
  female: { en: 'Female', am: 'ሴት' },
  gender: { en: 'Gender', am: 'ፆታ' },
  student: { en: 'Student', am: 'ተማሪ' },
  parent: { en: 'Parent', am: 'ወላጅ' },
  age: { en: 'Age', am: 'ዕድሜ' },
  phone: { en: 'Phone', am: 'ስልክ' },
  exportExcel: { en: 'Export Excel', am: 'ኤክሴል አውርድ' },
  exportPdf: { en: 'Export PDF', am: 'PDF አውርድ' },
  category: { en: 'Category', am: 'ምድብ' },
  recordedBy: { en: 'Recorded By', am: 'የመዘገበው' },
  approvedBy: { en: 'Approved By', am: 'ያጸደቀው' },
  print: { en: 'Print', am: 'አትም' },

  // Enums / status labels
  ACTIVE: { en: 'Active', am: 'ንቁ' },
  INACTIVE: { en: 'Inactive', am: 'ንቁ ያልሆነ' },
  PAID: { en: 'Paid', am: 'የተከፈለ' },
  UNPAID: { en: 'Unpaid', am: 'ያልተከፈለ' },
  PARTIAL: { en: 'Partial', am: 'በከፊል' },
  MALE: { en: 'Male', am: 'ወንድ' },
  FEMALE: { en: 'Female', am: 'ሴት' },
  INCOME: { en: 'Income', am: 'ገቢ' },
  EXPENSE: { en: 'Expense', am: 'ወጪ' },
  REVERSAL: { en: 'Reversal', am: 'መቀልበስ' },
  OPENING_BALANCE: { en: 'Opening Balance', am: 'የመክፈቻ ቀሪ' },
  STUDENT_FEES: { en: 'Student Fees', am: 'የተማሪ ክፍያ' },
  DONATIONS: { en: 'Donations', am: 'መዋጮ' },
  DEVELOPMENT_DEPART: { en: 'Development Department', am: 'የልማት ክፍል' },
  OTHERS: { en: 'Others', am: 'ሌሎች' },
  DONATION: { en: 'Donation', am: 'መዋጮ' },
  CHURCH_CONTRIBUTION: { en: 'Church Contribution', am: 'የቤተክርስቲያን መዋጮ' },
  FUNDRAISING: { en: 'Fundraising', am: 'የገንዘብ ማሰባሰብ' },
  SPECIAL_OFFERING: { en: 'Special Offering', am: 'ልዩ መባ' },
  DEBRE_TABOR_FEAST: { en: 'Debre Tabor Feast', am: 'ለደብረ ታቦር በዓል' },
  NEW_YEAR: { en: 'New Year', am: 'ለአዲስ ዓመት' },
  MESKEL_FEAST: { en: 'Meskel Feast', am: 'ለመስቀል በዓል' },
  OTHER: { en: 'Other', am: 'ሌላ' },
  CASH: { en: 'Cash', am: 'ጥሬ ገንዘብ' },
  BANK_TRANSFER: { en: 'Bank Transfer', am: 'የባንክ ዝውውር' },
  MOBILE_MONEY: { en: 'Mobile Money', am: 'ሞባይል ገንዘብ' },
  CHEQUE: { en: 'Cheque', am: 'ቼክ' },
  TELEBIRR_TRANSFER: { en: 'Telebirr Transfer', am: 'የቴሌብር ዝውውር' },
  TEACHING_MATERIALS: { en: 'Teaching Materials', am: 'የማስተማሪያ ቁሳቁሶች' },
  STATIONERY: { en: 'Stationery', am: 'የቢሮ ቁሳቁሶች' },
  SNACKS: { en: 'Snacks', am: 'መክሰስ' },
  TRANSPORTATION: { en: 'Transportation', am: 'መጓጓዣ' },
  EQUIPMENT: { en: 'Equipment', am: 'መሳሪያዎች' },
  MAINTENANCE: { en: 'Maintenance', am: 'ጥገና' },
  EVENTS: { en: 'Events', am: 'ዝግጅቶች' },
  CHARITY: { en: 'Charity', am: 'በጎ አድራጎት' },
  MISCELLANEOUS: { en: 'Others', am: 'ሌሎች' },
  MONTHLY: { en: 'Monthly', am: 'ወርሃዊ' },
  YEARLY: { en: 'Yearly', am: 'አመታዊ' },

  ADMINISTRATOR: { en: 'Administrator', am: 'አስተዳዳሪ' },
  FINANCE_OFFICER: { en: 'Finance Officer', am: 'የፋይናንስ ኃላፊ' },

  // Login
  sundaySchoolMgmt: { en: 'Sunday School Management System', am: 'የሰንበት ትምህርት ቤት አስተዳደር ስርዓት' },
  email: { en: 'Email', am: 'ኢሜይል' },
  password: { en: 'Password', am: 'የይለፍ ቃል' },
  signIn: { en: 'Sign in', am: 'ግባ' },
  signingIn: { en: 'Signing in…', am: 'በመግባት ላይ…' },
  enterEmailPassword: { en: 'Please enter your email and password', am: 'እባክዎ ኢሜይልዎን እና የይለፍ ቃልዎን ያስገቡ' },
  enterEmail: { en: 'Please enter your email', am: 'እባክዎ ኢሜይልዎን ያስገቡ' },
  enterPassword: { en: 'Please enter your password', am: 'እባክዎ የይለፍ ቃልዎን ያስገቡ' },
  incorrectCredentials: { en: 'Incorrect email or password', am: 'የተሳሳተ ኢሜይል ወይም የይለፍ ቃል' },
  unableToSignIn: { en: 'Unable to sign in', am: 'መግባት አልተቻለም' },
  roles: { en: 'Administrator · Attendance Officer · Finance Officer', am: 'አስተዳዳሪ · የክትትል ኃላፊ · የፋይናንስ ኃላፊ' },

  // Students page
  inactiveStudentsShort: { en: 'Inactive Students', am: 'ንቁ ያልሆኑ ተማሪዎች' },
  studentsPaid: { en: 'Students Paid', am: 'የከፈሉ ተማሪዎች' },
  studentsUnpaid: { en: 'Students Unpaid', am: 'ያልከፈሉ ተማሪዎች' },
  studentRegistration: { en: 'Student Registration', am: 'የተማሪ ምዝገባ' },
  studentRegistrationSub: { en: 'Register, search, and manage students across all classes', am: 'ተማሪዎችን ይመዝግቡ፣ ይፈልጉ እና ያስተዳድሩ' },
  registerStudentCta: { en: '+ Register Student', am: '+ ተማሪ መዝግብ' },
  searchPlaceholder: { en: 'Name (EN/AM), ID, parent, phone…', am: 'ስም (EN/AM)፣ መለያ፣ ወላጅ፣ ስልክ…' },
  id: { en: 'ID', am: 'መለያ' },
  workingMember: { en: 'Working Member', am: 'ሰራተኛ አባል' },
  viewProfile: { en: 'View Profile', am: 'መገለጫ ይመልከቱ' },
  noStudentsMatch: { en: 'No students match this filter.', am: 'በዚህ ማጣሪያ የሚገጥም ተማሪ የለም።' },
  fullNameEnglish: { en: 'Full Name (English)', am: 'ሙሉ ስም (እንግሊዝኛ)' },
  fullNameAmharic: { en: 'Full Name (Amharic)', am: 'ሙሉ ስም (አማርኛ)' },
  dateOfBirth: { en: 'Date of Birth', am: 'የትውልድ ቀን' },
  enrollmentDate: { en: 'Enrollment Date', am: 'የመመዝገቢያ ቀን' },
  studentPhoneOptional: { en: 'Student Phone (optional)', am: 'የተማሪ ስልክ (አማራጭ)' },
  parentGuardianName: { en: 'Parent/Guardian Name', am: 'የወላጅ/አሳዳጊ ስም' },
  parentPhone: { en: 'Parent Phone', am: 'የወላጅ ስልክ' },
  workingMemberLabel: { en: 'Working member (pays 2% of monthly salary instead of the class fee)', am: 'ሰራተኛ አባል (ከክፍል ክፍያ ይልቅ 2% ወርሃዊ ደመወዝ ይከፍላል)' },
  monthlySalaryBirr: { en: 'Monthly Salary (Birr)', am: 'ወርሃዊ ደመወዝ (ብር)' },
  salaryRequired: { en: 'Salary is required for working members (fee = 2% of salary).', am: 'ለሰራተኛ አባላት ደመወዝ ያስፈልጋል (ክፍያ = 2% ደመወዝ)።' },
  register: { en: 'Register', am: 'መዝግብ' },

  // Student profile
  personalInformation: { en: 'Personal Information', am: 'የግል መረጃ' },
  parentGuardian: { en: 'Parent/Guardian: {name}', am: 'ወላጅ/አሳዳጊ፡ {name}' },
  parentPhoneLabel: { en: 'Parent Phone: {phone}', am: 'የወላጅ ስልክ፡ {phone}' },
  enrolledOn: { en: 'Enrolled: {date}', am: 'የተመዘገበበት ቀን፡ {date}' },
  feeStatusReadOnly: { en: 'Fee Status (Read Only)', am: 'የክፍያ ሁኔታ (ተነባቢ ብቻ)' },
  unpaidMonths: { en: 'Unpaid months: {n}', am: 'ያልተከፈሉ ወራት፡ {n}' },
  lastPaidMonth: { en: 'Last paid month: {m}', am: 'የመጨረሻ የተከፈለበት ወር፡ {m}' },
  deleteStudent: { en: 'Delete Student', am: 'ተማሪ ሰርዝ' },
  deleteConfirm: { en: 'Are you sure you want to permanently delete {name}? This will erase all of their fee payments and receipts. This cannot be undone.', am: 'እርግጠኛ ነዎት {name} ለዘለቄታው መሰረዝ ይፈልጋሉ? ይህ ሁሉንም የክፍያ መግባቶች እና ደረሰኞች ያጠፋል። ይህ ሊቀለበስ አይችልም።' },
  deleting: { en: 'Deleting…', am: 'በመሰረዝ ላይ…' },
  deleteFailed: { en: 'Failed to delete student.', am: 'ተማሪን መሰረዝ አልተሳካም።' },
  editStudent: { en: 'Edit Student', am: 'ተማሪ አስተካክል' },

  // Finance dashboard
  financeDashboard: { en: 'Finance Dashboard', am: 'የፋይናንስ ዳሽቦርድ' },
  ethiopianYear: { en: 'Ethiopian year {year}', am: 'የኢትዮጵያ ዓመት {year}' },
  monthlyIncome: { en: 'Monthly Income', am: 'ወርሃዊ ገቢ' },
  monthlyExpenses: { en: 'Monthly Expenses', am: 'ወርሃዊ ወጪ' },
  currentBalance: { en: 'Current Balance', am: 'የአሁን ቀሪ' },
  studentFeesCollected: { en: 'Student Fees Collected', am: 'የተሰበሰበ የተማሪ ክፍያ' },
  todaysIncome: { en: "Today's Income", am: 'የዛሬ ገቢ' },
  todaysExpenses: { en: "Today's Expenses", am: 'የዛሬ ወጪ' },
  outstandingFeeMonths: { en: 'Outstanding Fee-Months', am: 'ያልተከፈለ ክፍያ-ወራት' },
  unpaidAcrossActive: { en: 'Unpaid months across all active students', am: 'በሁሉም ንቁ ተማሪዎች ላይ ያልተከፈሉ ወራት' },
  yearIncome: { en: 'Year Income', am: 'ዓመታዊ ገቢ' },
  yearExpenses: { en: 'Year Expenses', am: 'ዓመታዊ ወጪ' },
  noAccountFound: { en: 'No account found. An account is required to track the balance and statement.', am: 'መለያ አልተገኘም። ቀሪ እና ማስረጃ ለመከታተል መለያ ያስፈልጋል።' },
  accountStatement: { en: 'Account Statement — {name}', am: 'የመለያ ማስረጃ — {name}' },
  noLedgerEntries: { en: 'No ledger entries on this account yet.', am: 'በዚህ መለያ ላይ እስካሁን የሒሳብ መዝገብ የለም።' },
  typeLabel: { en: 'Type', am: 'አይነት' },
  balance: { en: 'Balance', am: 'ቀሪ' },
  reversing: { en: 'Reversing…', am: 'በመቀልበስ ላይ…' },
  reversed: { en: 'Reversed', am: 'ተቀልብሷል' },
  reverse: { en: 'Reverse', am: 'ቀልብስ' },
  ledgerAppendOnly: { en: 'Ledger is append-only: rows are never edited or deleted. Corrections are booked as REVERSAL entries.', am: 'የሒሳብ መዝገብ የመደመር ብቻ ነው፡ ረድፎች በጭራሽ አይስተካከሉም ወይም አይጠፉም። እርማቶች እንደ REVERSAL (መቀልበስ) መዝገብ ይመዘገባሉ።' },
  monthlyActivityTimeline: { en: 'Monthly Activity Timeline', am: 'ወርሃዊ የእንቅስቃሴ መስመር' },
  noActivityThisMonth: { en: 'No activity recorded this month yet.', am: 'በዚህ ወር እስካሁን እንቅስቃሴ አልተመዘገበም።' },
  reverseConfirm: { en: 'Reverse this {type} of {amount}?\n\nA reversal entry will be booked — the original row is never edited or deleted.', am: 'ይህን {type} የ {amount} ይቀልብሱ?\n\nየመቀልበስ መዝገብ ይመዘገባል — ዋናው ረድፍ በጭራሽ አይስተካከልም ወይም አይጠፋም።' },
  reversalFailed: { en: 'Reversal failed', am: 'መቀልበስ አልተሳካም' },

  // Student fees
  studentFeeManagement: { en: 'Student Fee Management', am: 'የተማሪ ክፍያ አስተዳደር' },
  studentFeeSub: { en: 'Fees follow class rules — 20 Birr (1-3), 30 Birr (4-6), 50 Birr (7-12), or 2% of salary for working members. Tracking starts at Nehase 2018 — no late penalties.', am: 'ክፍያዎች በክፍል ህግ ይከተላሉ — 20 ብር (1-3)፣ 30 ብር (4-6)፣ 50 ብር (7-12)፣ ወይም ለሰራተኛ አባላት 2% ደመወዝ። ክትትል ከነሐሴ 2018 ይጀምራል — የዘገየ ቅጣት የለም።' },
  searchNameId: { en: 'Name, ID, parent…', am: 'ስም፣ መለያ፣ ወላጅ…' },
  feeStatus: { en: 'Fee status', am: 'የክፍያ ሁኔታ' },
  outstanding: { en: 'Outstanding', am: 'ያልተከፈለ ቀሪ' },
  lastPaid: { en: 'Last Paid', am: 'የመጨረሻ ክፍያ' },
  unpaidMonthsLabel: { en: 'Unpaid Months', am: 'ያልተከፈሉ ወራት' },
  recordPaymentTitle: { en: 'Record Payment — {name}', am: 'ክፍያ መዝግብ — {name}' },
  previousUnpaidMonths: { en: 'Previous unpaid months', am: 'ያለፉ ያልተከፈሉ ወራት' },
  currentMonthFee: { en: 'Current month fee', am: 'የአሁኑ ወር ክፍያ' },
  totalAmountDue: { en: 'Total Amount Due', am: 'ጠቅላላ የሚከፈል' },
  selectMonthsToPay: { en: 'Select Ethiopian month(s) to mark as paid', am: 'የተከፈለ ሆኖ ለመመዝገብ የኢትዮጵያ ወር(ዎችን) ይምረጡ' },
  monthlyFee: { en: 'Monthly fee ({class})', am: 'ወርሃዊ ክፍያ ({class})' },
  monthsSelected: { en: 'Months selected', am: 'የተመረጡ ወራት' },
  totalAmount: { en: 'Total Amount', am: 'ጠቅላላ መጠን' },
  amountPerMonth: { en: 'Amount per month (ETB) — defaults to the class/working-member rule', am: 'ወርሃዊ መጠን (ETB) — በክፍል/ሰራተኛ-አባል ህግ ይመረጣል' },
  notesOptional: { en: 'Notes (optional)', am: 'ማስታወሻ (አማራጭ)' },
  saveAmount: { en: 'Save ({amount})', am: 'አስቀምጥ ({amount})' },

  // Income
  incomeManagement: { en: 'Income Management', am: 'የገቢ አስተዳደር' },
  incomeManagementSub: { en: 'Student fees (automatic batches), donations, development department, and other income', am: 'የተማሪ ክፍያ (ራስ-ሰር ባች)፣ መዋጮ፣ የልማት ክፍል እና ሌሎች ገቢዎች' },
  incomeBatchNote: { en: 'Class fee income is recorded in batches around the 26th of each Ethiopian month, so the', am: 'የክፍል ክፍያ ገቢ በእያንዳንዱ የኢትዮጵያ ወር በ26ኛው ቀን ባች ሆኖ ይመዘገባል፣ ስለዚህ' },
  incomeBatchNote2: { en: 'total on this page can lag behind the amounts actually paid until the next batch run.', am: 'በዚህ ገጽ ላይ ያለው ጠቅላላ ድምር እስከ ቀጣዩ ባች እስኪሰራ ድረስ ከተከፈለው መጠን ሊዘገይ ይችላል።' },
  incomeAutoNote: { en: 'Student fees are recorded automatically on the 26th of each Ethiopian month.', am: 'የተማሪ ክፍያ በእያንዳንዱ የኢትዮጵያ ወር በ26ኛው ቀን በራስ-ሰር ይመዘገባል።' },
  runFeeBatchNow: { en: 'Run fee batch now', am: 'የክፍያ ባች አሁን አሂድ' },
  feeBatchRunning: { en: 'Running batch…', am: 'ባች በመስራት ላይ…' },
  feeBatchDoneOne: { en: 'Fee batch complete — booked {n} fee record.', am: 'የክፍያ ባች ተጠናቋል — {n} የክፍያ መዝገብ ተመዝግቧል።' },
  feeBatchDoneMany: { en: 'Fee batch complete — booked {n} fee records.', am: 'የክፍያ ባች ተጠናቋል — {n} የክፍያ መዝገቦች ተመዝግበዋል።' },
  feeBatchIdle: { en: 'Fee batch complete — no new fees to book.', am: 'የክፍያ ባች ተጠናቋል — የሚመዘገብ አዲስ ክፍያ የለም።' },
  feeBatchError: { en: 'Fee batch failed: {error}', am: 'የክፍያ ባች አልተሳካም፦ {error}' },
  recordIncome: { en: '+ Record Income', am: '+ ገቢ መዝግብ' },
  noIncomeYet: { en: 'No income recorded yet.', am: 'እስካሁን ገቢ አልተመዘገበም።' },
  recordIncomeTitle: { en: 'Record Income', am: 'ገቢ መዝግብ' },
  sourceType: { en: 'Source Type', am: 'የምንጭ አይነት' },
  paymentMethod: { en: 'Payment Method', am: 'የክፍያ ዘዴ' },
  account: { en: 'Account', am: 'መለያ' },
  noAccountsAvailable: { en: 'No accounts available', am: 'መለያዎች አይገኙም' },
  amountETB: { en: 'Amount (ETB)', am: 'መጠን (ETB)' },
  specifyIncome: { en: 'Please specify what kind of income this is in the description below.', am: 'እባክዎ ይህ ምን ዓይነት ገቢ እንደሆነ ከታች ባለው መግለጫ ይግለጹ።' },
  specifyIncomeHint: { en: 'Please enter at least 3 words describing this income.', am: 'እባክዎ ይህንን ገቢ የሚገልጹ ቢያንስ 3 ቃላት ያስገቡ።' },
  senderName: { en: 'Sender Name', am: 'የላኪ ስም' },
  senderAccountNumber: { en: 'Sender Account Number', am: 'የላኪ የመለያ ቁጥር' },
  accountOwnerName: { en: 'Account Owner Name', am: 'የሂሳብ ባለቤት ስም' },
  transferAccountNumber: { en: 'Account Number', am: 'የሂሳብ ቁጥር' },
  accountOwnerNameRequiredHint: { en: 'Account owner name is required for bank transfer.', am: 'ለባንክ ዝውውር የሂሳብ ባለቤት ስም ያስፈልጋል።' },
  accountOwner: { en: 'Account Owner Name', am: 'የመለያ ባለቤት ስም' },
  accountOwnerRequiredHint: { en: 'Account owner name is required for bank transfer.', am: 'ለባንክ ዝውውር የመለያ ባለቤት ስም ያስፈልጋል።' },
  phoneNumber: { en: 'Phone Number', am: 'ስልክ ቁጥር' },
  phoneNumberRequiredHint: { en: 'Phone number is required for Telebirr transfer.', am: 'ለቴሌብር ዝውውር ስልክ ቁጥር ያስፈልጋል።' },

  // Expense
  expenseManagement: { en: 'Expense Management', am: 'የወጪ አስተዳደር' },
  expenseManagementSub: { en: 'Teaching materials, events, maintenance, and more', am: 'የማስተማሪያ ቁሳቁሶች፣ ዝግጅቶች፣ ጥገና እና ሌሎች' },
  recordExpense: { en: '+ Record Expense', am: '+ ወጪ መዝግብ' },
  noExpensesYet: { en: 'No expenses recorded yet.', am: 'እስካሁን ወጪ አልተመዘገበም።' },
  recordExpenseTitle: { en: 'Record Expense', am: 'ወጪ መዝግብ' },
  specifyExpense: { en: 'Please specify what this expense is for in the description below.', am: 'እባክዎ ይህ ወጪ ለምን እንደሆነ ከታች ባለው መግለጫ ይግለጹ።' },
  specifyExpenseHint: { en: 'Description is required for the Others expense type.', am: 'ለሌሎች የወጪ አይነት መግለጫ ያስፈልጋል።' },

  // Receipts
  receiptsSub: { en: 'Printable receipts and uploaded receipt photos', am: 'የሚታተሙ ደረሰኞች እና የተጫኑ የደረሰኝ ፎቶዎች' },
  uploadReceiptPhoto: { en: 'Upload Receipt Photo', am: 'የደረሰኝ ፎቶ አውርድ' },
  dragDropPhoto: { en: 'Drag & drop a PNG or JPG here, or click to browse', am: 'እዚህ PNG ወይም JPG ይጎትቱ እና ይጣሉ፣ ወይም ለመቃኘት ይጫኑ' },
  max5MB: { en: 'Max 5 MB', am: 'ከፍተኛ 5 MB' },
  photoNotePlaceholder: { en: 'Add a note about this receipt photo…', am: 'ስለዚህ የደረሰኝ ፎቶ ማስታወሻ ይጨምሩ…' },
  uploading: { en: 'Uploading…', am: 'በመጫን ላይ…' },
  uploadPhoto: { en: 'Upload Photo', am: 'ፎቶ አውርድ' },
  savedReceiptPhotos: { en: 'Saved Receipt Photos', am: 'የተቀመጡ የደረሰኝ ፎቶዎች' },
  receiptNo: { en: 'Receipt No', am: 'የደረሰኝ ቁጥር' },
  months: { en: 'Months', am: 'ወራት' },
  issuedBy: { en: 'Issued By', am: 'የሰጠው' },
  noReceiptsYet: { en: 'No receipts yet.', am: 'እስካሁን ደረሰኞች የሉም።' },

  // Finance analytics
  financialAnalytics: { en: 'Financial Analytics', am: 'የፋይናንስ ትንተና' },
  financialAnalyticsSub: { en: 'Trends and breakdowns across income, expenses, and fee collection', am: 'የገቢ፣ የወጪ እና የክፍያ አዝማሚያዎች እና ክፍፍሎች' },
  collectionRate: { en: 'Collection Rate', am: 'የመሰብሰብ መጠን' },
  monthsPaid: { en: 'Months Paid', am: 'የተከፈሉ ወራት' },
  monthsPossible: { en: 'Months Possible', am: 'ሊከፈሉ የሚችሉ ወራት' },
  notPaid: { en: 'Not Paid', am: 'ያልተከፈለ' },
  paidToday: { en: 'Paid Today', am: 'ዛሬ የተከፈለ' },
  paidThisMonth: { en: 'Paid This Month', am: 'በዚህ ወር የተከፈለ' },
  incomeVsExpenseTrend: { en: 'Income vs Expense Trend', am: 'የገቢ vs ወጪ አዝማሚያ' },
  expensesByCategory: { en: 'Expenses by Category', am: 'ወጪ በምድብ' },
  donationTrend: { en: 'Donation Trend', am: 'የመዋጮ አዝማሚያ' },
  yearlyFinancialTrend: { en: 'Yearly Financial Trend', am: 'ዓመታዊ የፋይናንስ አዝማሚያ' },

  // Finance reports
  financialReports: { en: 'Financial Reports', am: 'የፋይናንስ ሪፖርቶች' },
  financialReportsSub: { en: 'Daily, monthly, and yearly reports with saved history', am: 'የዕለት፣ ወርሃዊ እና አመታዊ ሪፖርቶች ከተቀመጠ ታሪክ ጋር' },
  periodReport: { en: 'Period Report', am: 'የጊዜ ሪፖርት' },
  monthly: { en: 'Monthly', am: 'ወርሃዊ' },
  yearly: { en: 'Yearly', am: 'አመታዊ' },
  reportHistory: { en: 'Report History', am: 'የሪፖርት ታሪክ' },
  generating: { en: 'Generating…', am: 'በማዘጋጀት ላይ…' },
  generateReport: { en: 'Generate Report', am: 'ሪፖርት አዘጋጅ' },
  totalIncome: { en: 'Total Income', am: 'ጠቅላላ ገቢ' },
  totalExpenses: { en: 'Total Expenses', am: 'ጠቅላላ ወጪ' },
  donations: { en: 'Donations', am: 'መዋጮ' },
  incomesByCategory: { en: 'Incomes by Category', am: 'ገቢ በምድብ' },
  ethiopianYearLabel: { en: 'Ethiopian Year', am: 'የኢትዮጵያ ዓመት' },
  era: { en: 'E.C.', am: 'ዓ.ም' },
  month: { en: 'Month', am: 'ወር' },
  generateMonthlyReport: { en: 'Generate Monthly Report', am: 'ወርሃዊ ሪፖርት አዘጋጅ' },
  saveToHistory: { en: 'Save to History', am: 'ወደ ታሪክ አስቀምጥ' },
  monthlySaved: { en: 'Monthly report saved to history.', am: 'ወርሃዊ ሪፖርት ወደ ታሪክ ተቀመጠ።' },
  yearlySaved: { en: 'Yearly report saved to history.', am: 'አመታዊ ሪፖርት ወደ ታሪክ ተቀመጠ።' },
  generateYearlyReport: { en: 'Generate Yearly Report', am: 'አመታዊ ሪፖርት አዘጋጅ' },
  period: { en: 'Period', am: 'ጊዜ' },
  net: { en: 'Net', am: 'ትርፍ/ኪሳራ' },
  generated: { en: 'Generated', am: 'የተዘጋጀበት' },
  actions: { en: 'Actions', am: 'ተግባራት' },
  noSavedReports: { en: 'No saved reports yet. They are generated automatically at the end of each Ethiopian month and year.', am: 'እስካሁን የተቀመጡ ሪፖርቶች የሉም። በእያንዳንዱ የኢትዮጵያ ወር እና ዓመት መጨረሻ በራስ-ሰር ይዘጋጃሉ።' },
  yearN: { en: 'Year {year}', am: 'ዓመት {year}' },
  savedReport: { en: 'Saved Report', am: 'የተቀመጠ ሪፖርት' },
  netBalance: { en: 'Net Balance', am: 'ትርፍ/ኪሳራ ቀሪ' },
  incomeBySource: { en: 'Income by Source', am: 'ገቢ በምንጭ' },
  source: { en: 'Source', am: 'ምንጭ' },
  records: { en: 'Records', am: 'መዝገቦች' },
  noIncomeThisPeriod: { en: 'No income in this period.', am: 'በዚህ ጊዜ ገቢ የለም።' },
  noExpensesThisPeriod: { en: 'No expenses in this period.', am: 'በዚህ ጊዜ ወጪ የለም።' },
  transactions: { en: 'Transactions', am: 'ግብይቶች' },
  noTransactionsThisPeriod: { en: 'No transactions in this period.', am: 'በዚህ ጊዜ ግብይቶች የሉም።' },
  recordS: { en: '{n} record(s)', am: '{n} መዝገብ(ዎች)' },

  studentFeesBatchNotePrefix: { en: 'Student fee totals current as of', am: 'የተማሪ ክፍያ ድምር በዕለታዊ ቡድን ስራ መሰረት እስከ' },
  studentFeesBatchNoteSuffix: { en: '(last daily batch)', am: 'ድረስ ወቅታዊ ነው' },

  // Admin
  adminOverview: { en: 'Admin Overview', am: 'የአስተዳዳሪ እይታ' },
  adminOverviewSub: { en: 'Live, synchronized across every module · Ethiopian year {year}', am: 'በሁሉም ሞዱሎች ላይ በቅጽበት፣ የተመሳሰለ · የኢትዮጵያ ዓመት {year}' },
  newRegistrations: { en: 'New Registrations', am: 'አዲስ ምዝገባዎች' },
  outstandingFees: { en: 'Outstanding Fees', am: 'ያልተከፈለ ክፍያ' },

  // Notifications
  markAllRead: { en: 'Mark all read', am: 'ሁሉንም እንደተነበቡ ምልክት አድርግ' },
  noNotifications: { en: 'No notifications yet.', am: 'እስካሁን ማሳወቂያዎች የሉም።' },
};

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
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

  function t(key: string, params?: Record<string, string | number>) {
    const entry = DICTIONARY[key];
    const str = typeof entry === 'string' ? entry : entry?.[lang] ?? key;
    if (!params) return str;
    return Object.entries(params).reduce((acc, [k, v]) => acc.replace(`{${k}}`, String(v)), str);
  }

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}
