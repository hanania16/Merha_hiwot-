import * as ExcelJS from 'exceljs';
import { Response } from 'express';
import { LABELS, WARN_MARK } from './audit-export.constants';
import { AuditReport } from './audit-report.types';
import { ETHIOPIAN_MONTHS, formatEthiopianDate, toEthiopian } from '../../common/constants/ethiopian-calendar';

const GOLD = 'FFD4AF37';
const HEADER_FILL = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: GOLD } };
const ETB = '#,##0.00 "ETB"';

type CellValue = string | number | null;
type SheetRows = CellValue[][];
type Column = { header: string; key: string; width: number; currency?: boolean };

const amharicMonth = (monthNum: number) =>
  ETHIOPIAN_MONTHS.find((m) => m.order === monthNum)?.label ?? String(monthNum);

const isoDate = (d: Date | string | null | undefined) =>
  d ? new Date(d).toISOString().slice(0, 10) : '–';

const money = (n: number | null | undefined) =>
  (Number.isFinite(n) && n !== null && n !== undefined ? n : 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });



function styleSheet(sheet: ExcelJS.Worksheet, columns: Column[], rows: SheetRows, opts?: { currencyCols?: number[] }) {
  sheet.columns = columns.map(({ header, key, width }) => ({ header, key, width }));
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FF111111' } };
  headerRow.fill = HEADER_FILL;
  headerRow.alignment = { vertical: 'middle' };
  headerRow.height = 20;
  rows.forEach((r) => sheet.addRow(r));
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  (opts?.currencyCols ?? []).forEach((ci) => {
    const col = sheet.getColumn(ci);
    col.eachCell((cell, rowNumber) => {
      if (rowNumber > 1 && typeof cell.value === 'number') cell.numFmt = ETB;
    });
  });
}

function addSummarySheet(workbook: ExcelJS.Workbook, report: AuditReport, generatedBy: string) {
  const sheet = workbook.addWorksheet(LABELS.summary);
  sheet.columns = [
    { header: LABELS.summary, key: 'item', width: 32 },
    { header: '', key: 'value', width: 44 },
  ];
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FF111111' } };
  headerRow.fill = HEADER_FILL;
  headerRow.height = 20;
  sheet.mergeCells('A1:B1');
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  const { year, month } = toEthiopian(report.period.from);
  const from = report.period.from;
  const to = new Date(report.period.to.getTime() - 1);
  const periodGreg =
    report.kind === 'monthly'
      ? from.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
      : `${from.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })} – ${to.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`;
  const periodEth =
    report.kind === 'monthly'
      ? `${amharicMonth(month)} ${year} ${LABELS.era}`
      : `${year} ${LABELS.era}`;

  const items: CellValue[][] = [
    [LABELS.institution, ''],
    [report.kind === 'monthly' ? LABELS.monthlyTitle : LABELS.yearlyTitle, ''],
    ['Period / ወቅት', `${periodEth} / ${periodGreg}`],
    [`${LABELS.generatedOn}`, `${formatEthiopianDate(new Date())} / ${new Date().toISOString().slice(0, 10)}`],
    [`${LABELS.generatedBy}`, generatedBy],
    [],
    [LABELS.totalIncome, report.summary.totalIncome],
    [LABELS.totalExpense, report.summary.totalExpense],
    [LABELS.net, report.summary.net],
    [],
    [`${LABELS.summary} — ${report.requiresReview.total}`, ''],
  ];
  let row = 2;
  for (const item of items) {
    const r = sheet.getRow(row);
    if (item[0] === '') {
      r.getCell(1).value = '';
      r.getCell(2).value = '';
      r.height = 6;
    } else {
      r.getCell(1).value = item[0];
      r.getCell(2).value = item[1];
      if (typeof item[1] === 'number') r.getCell(2).numFmt = ETB;
      r.getCell(1).font = { bold: true };
    }
    row += 1;
  }
}

export async function exportAuditExcel(res: Response, report: AuditReport, filename: string, generatedBy: string) {
  const workbook = new ExcelJS.Workbook();
  addSummarySheet(workbook, report, generatedBy);

  const incomeRows: SheetRows = Object.entries(report.incomeBySourceType).map(([source, g]) => [
    source,
    g.count,
    g.total,
    report.summary.totalIncome ? Math.round((g.total / report.summary.totalIncome) * 1000) / 10 : 0,
  ]);
  styleSheet(
    workbook.addWorksheet(LABELS.incomeSummary),
    [
      { header: LABELS.income, key: 'source', width: 28 },
      { header: 'Count', key: 'count', width: 12 },
      { header: 'Total', key: 'total', width: 18, currency: true },
      { header: '%', key: 'pct', width: 12 },
    ],
    incomeRows,
    { currencyCols: [3] },
  );

  const expenseRows: SheetRows = Object.entries(report.expenseByCategory).map(([category, g]) => [
    category,
    g.count,
    g.total,
    report.summary.totalExpense ? Math.round((g.total / report.summary.totalExpense) * 1000) / 10 : 0,
  ]);
  styleSheet(
    workbook.addWorksheet(LABELS.expenseSummary),
    [
      { header: LABELS.expense, key: 'category', width: 28 },
      { header: 'Count', key: 'count', width: 12 },
      { header: 'Total', key: 'total', width: 18, currency: true },
      { header: '%', key: 'pct', width: 12 },
    ],
    expenseRows,
    { currencyCols: [3] },
  );

  const balanceRows: SheetRows = report.accountBalances.map((a) => {
    const warned = a.status === 'DISCREPANCY_FOUND' || a.status === 'UNDER_INVESTIGATION';
    return [
      a.accountName,
      a.reconciliationId ? a.expectedBalance : null,
      a.reconciliationId ? a.actualBalance : null,
      a.reconciliationId ? a.discrepancy : null,
      a.reconciliationId ? (warned ? `${WARN_MARK} ${a.status}` : a.status) : '–',
    ];
  });
  styleSheet(
    workbook.addWorksheet(LABELS.accountBalances),
    [
      { header: 'Account', key: 'account', width: 24 },
      { header: 'Expected', key: 'expected', width: 18, currency: true },
      { header: 'Actual', key: 'actual', width: 18, currency: true },
      { header: 'Discrepancy', key: 'disc', width: 18, currency: true },
      { header: 'Status', key: 'status', width: 22 },
    ],
    balanceRows,
    { currencyCols: [2, 3, 4] },
  );

  const discRows: SheetRows = report.discrepancies.map((d) => [
    d.accountName,
    d.expectedBalance,
    d.actualBalance,
    d.discrepancy,
    `${WARN_MARK} ${d.status}`,
    d.resolutionNotes ?? '–',
  ]);
  styleSheet(
    workbook.addWorksheet(LABELS.discrepancies),
    [
      { header: 'Account', key: 'account', width: 24 },
      { header: 'Expected', key: 'expected', width: 18, currency: true },
      { header: 'Actual', key: 'actual', width: 18, currency: true },
      { header: 'Discrepancy', key: 'disc', width: 18, currency: true },
      { header: 'Status', key: 'status', width: 22 },
      { header: 'Notes', key: 'notes', width: 34 },
    ],
    discRows,
    { currencyCols: [2, 3, 4] },
  );

  const missingRows: SheetRows = report.missingReceipts.records.map((r) => [
    isoDate(r.date),
    r.sourceType,
    r.amount,
    r.status,
  ]);
  styleSheet(
    workbook.addWorksheet(LABELS.missingReceipts),
    [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Source', key: 'source', width: 22 },
      { header: 'Amount', key: 'amount', width: 18, currency: true },
      { header: 'Status', key: 'status', width: 20 },
    ],
    missingRows,
    { currencyCols: [3] },
  );

  const pendingRows: SheetRows = [
    ...report.pendingApprovals.income.map((i) => [isoDate(i.date), LABELS.income, i.sourceType, i.amount]),
    ...report.pendingApprovals.expense.map((e) => [isoDate(e.date), LABELS.expense, e.category, e.amount]),
  ];
  styleSheet(
    workbook.addWorksheet(LABELS.pendingApprovals),
    [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Type', key: 'type', width: 14 },
      { header: 'Category', key: 'category', width: 22 },
      { header: 'Amount', key: 'amount', width: 18, currency: true },
    ],
    pendingRows,
    { currencyCols: [4] },
  );

  const adjRows: SheetRows = report.adjustments.map((a) => [
    isoDate(a.createdAt),
    a.entityType,
    a.action,
    a.reason ?? '–',
    a.changedByName ?? '–',
  ]);
  styleSheet(
    workbook.addWorksheet(LABELS.adjustmentsLog),
    [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Entity', key: 'entity', width: 14 },
      { header: 'Action', key: 'action', width: 26 },
      { header: 'Reason', key: 'reason', width: 34 },
      { header: 'By', key: 'by', width: 22 },
    ],
    adjRows,
  );

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
}
