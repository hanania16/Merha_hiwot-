import * as path from 'path';
import * as fs from 'fs';
import PDFDocument = require('pdfkit');
import { Response } from 'express';
import { LABELS, WARN_MARK } from './audit-export.constants';
import { AuditReport } from './audit-report.types';
import { ETHIOPIAN_MONTHS, formatEthiopianDate, toEthiopian } from '../../common/constants/ethiopian-calendar';

const FONT_REG = 'Ethiopic';
const FONT_BOLD = 'EthiopicBold';
const FONT_LATIN = 'Helvetica';
const FONT_LATIN_BOLD = 'Helvetica-Bold';

const FONT_DIR = path.join(process.cwd(), 'assets', 'fonts');
const FONT_REG_PATH = path.join(FONT_DIR, 'NotoSansEthiopic-Regular.ttf');
const FONT_BOLD_PATH = path.join(FONT_DIR, 'NotoSansEthiopic-Bold.ttf');
const LOGO_PATH = path.join(process.cwd(), 'assets', 'logo.jpg');

const MARGIN = 40;
const PAGE_HEIGHT = 841.89;
const PAGE_WIDTH = 595.28;
const CELL_PAD = 4;
const GOLD = '#D4AF37';
const LIGHT = '#F3F4F6';
const DARK = '#111111';
const GRAY = '#6B7280';
const LINE = '#E5E7EB';

const money = (n: number | null | undefined) =>
  (Number.isFinite(n) && n !== null && n !== undefined ? n : 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const isoDate = (d: Date | string | null | undefined) =>
  d ? new Date(d).toISOString().slice(0, 10) : '–';

const amharicMonth = (monthNum: number) =>
  ETHIOPIAN_MONTHS.find((m) => m.order === monthNum)?.label ?? String(monthNum);

// ---------------------------------------------------------------------------
// Mixed-script text layout. Noto Sans Ethiopic has no Latin glyphs, so any
// string is split into Ethiopic / Latin runs and each run is drawn with the
// font that actually contains the glyphs.
// ---------------------------------------------------------------------------

const ETHIOPIC_RE = /[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF\uAB00-\uAB2F]/;

type Run = { text: string; eth: boolean };

function splitRuns(text: string): Run[] {
  const runs: Run[] = [];
  let cur = '';
  let curEth = false;
  let hasCur = false;
  for (const ch of text) {
    const eth = ETHIOPIC_RE.test(ch);
    if (hasCur && eth !== curEth) {
      runs.push({ text: cur, eth: curEth });
      cur = '';
    }
    curEth = eth;
    cur += ch;
    hasCur = true;
  }
  if (hasCur) runs.push({ text: cur, eth: curEth });
  return runs;
}

function setMixedFont(doc: PDFKit.PDFDocument, run: Run, opts: { bold: boolean; size: number }) {
  if (run.eth) doc.font(opts.bold ? FONT_BOLD : FONT_REG);
  else doc.font(opts.bold ? FONT_LATIN_BOLD : FONT_LATIN);
  doc.fontSize(opts.size);
}

function widthOfRuns(doc: PDFKit.PDFDocument, runs: Run[], opts: { bold: boolean; size: number }): number {
  let w = 0;
  for (const r of runs) {
    setMixedFont(doc, r, opts);
    w += doc.widthOfString(r.text);
  }
  return w;
}

function lineHeightOf(size: number): number {
  return Math.round(size * 1.3);
}

/** Split text into wrapped lines; each line is a list of script runs. */
function wrapRuns(doc: PDFKit.PDFDocument, text: string, width: number, opts: { bold: boolean; size: number }): Run[][] {
  const words = text.split(/(\s+)/).filter((w) => w.length > 0);
  const lines: Run[][] = [];
  let line: Run[] = [];
  let lineWidth = 0;
  for (const word of words) {
    const wordRuns = splitRuns(word);
    const wordWidth = widthOfRuns(doc, wordRuns, opts);
    if (line.length > 0 && lineWidth + wordWidth > width) {
      lines.push(line);
      line = [];
      lineWidth = 0;
    }
    line.push(...wordRuns);
    lineWidth += wordWidth;
  }
  if (line.length > 0) lines.push(line);
  return lines;
}

/**
 * Draw text honouring mixed Ethiopic/Latin scripts. Returns the y position
 * just after the last drawn line.
 */
function drawText(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  width: number,
  opts: { bold?: boolean; size?: number; color?: string; align?: 'left' | 'center' | 'right' } = {},
): number {
  const { bold = false, size = 9, color = DARK, align = 'left' } = opts;
  const lines = wrapRuns(doc, text, width, { bold, size });
  const lh = lineHeightOf(size);
  let yy = y;
  for (const runs of lines) {
    const totalW = widthOfRuns(doc, runs, { bold, size });
    let xx = x;
    if (align === 'center') xx = x + (width - totalW) / 2;
    else if (align === 'right') xx = x + (width - totalW);
    doc.fillColor(color);
    for (const r of runs) {
      setMixedFont(doc, r, { bold, size });
      const rw = doc.widthOfString(r.text);
      doc.text(r.text, xx, yy, { lineBreak: false, width: rw });
      xx += rw;
    }
    yy += lh;
  }
  return yy;
}

/** Height (in points) of the wrapped text, mirroring drawText. */
function heightOfText(doc: PDFKit.PDFDocument, text: string, width: number, opts: { bold?: boolean; size?: number }): number {
  const { bold = false, size = 9 } = opts;
  const lines = wrapRuns(doc, text, width, { bold, size });
  return lines.length * lineHeightOf(size);
}

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  if (doc.y + needed > PAGE_HEIGHT - MARGIN) doc.addPage();
}

function sectionTitle(doc: PDFKit.PDFDocument, title: string) {
  ensureSpace(doc, 48);
  doc.moveDown(1.1);
  drawText(doc, title, MARGIN, doc.y, PAGE_WIDTH - MARGIN * 2, { bold: true, size: 11 });
  doc.y = doc.y + lineHeightOf(11);
  doc.moveTo(MARGIN, doc.y + 2).lineTo(PAGE_WIDTH - MARGIN, doc.y + 2).strokeColor(GOLD).lineWidth(0.8).stroke();
  doc.moveDown(0.8);
}

function noneLine(doc: PDFKit.PDFDocument) {
  drawText(doc, `(${LABELS.none})`, MARGIN, doc.y, PAGE_WIDTH - MARGIN * 2, { size: 9, color: GRAY });
  doc.y += lineHeightOf(9);
  doc.moveDown(0.2);
}

type Cell = string;
type Row = Cell[];

function drawTable(doc: PDFKit.PDFDocument, widths: number[], headers: Cell[], rows: Row[], fontSize = 8.5) {
  const totalWidth = widths.reduce((a, b) => a + b, 0);
  const x0 = MARGIN;
  const size = fontSize;

  const rowHeightOf = (cells: Cell[], bold: boolean) => {
    let h = 16;
    cells.forEach((c, i) => {
      h = Math.max(h, heightOfText(doc, c, widths[i] - CELL_PAD * 2, { bold, size }) + 6);
    });
    return h;
  };

  const headerH = Math.max(20, rowHeightOf(headers, true) + 4);
  ensureSpace(doc, headerH);
  const headerY = doc.y;
  doc.rect(x0, headerY, totalWidth, headerH).fill(LIGHT);
  let cx = x0;
  headers.forEach((c, i) => {
    drawText(doc, c, cx + CELL_PAD, headerY + 5, widths[i] - CELL_PAD * 2, { bold: true, size });
    cx += widths[i];
  });
  doc.y = headerY + headerH;

  for (const row of rows) {
    const h = rowHeightOf(row, false);
    ensureSpace(doc, h);
    const y = doc.y;
    let cxx = x0;
    row.forEach((c, i) => {
      drawText(doc, c, cxx + CELL_PAD, y + 3, widths[i] - CELL_PAD * 2, { size });
      cxx += widths[i];
    });
    doc.y = y + h;
    doc.moveTo(x0, doc.y).lineTo(x0 + totalWidth, doc.y).strokeColor(LINE).lineWidth(0.5).stroke();
    doc.y += 1;
  }
  doc.moveDown(0.4);
}

function drawHeader(doc: PDFKit.PDFDocument, report: AuditReport, generatedBy: string) {
  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, PAGE_WIDTH / 2 - 30, MARGIN - 10, { width: 60, height: 60 });
    doc.moveDown(4);
  }
  const cw = PAGE_WIDTH - MARGIN * 2;
  let y = doc.y;
  y = drawText(doc, LABELS.institution, MARGIN, y, cw, { bold: true, size: 16, align: 'center' });
  y = drawText(doc, LABELS.subtitle, MARGIN, y, cw, { size: 10, color: GRAY, align: 'center' });
  y += 6;
  y = drawText(doc, report.kind === 'monthly' ? LABELS.monthlyTitle : LABELS.yearlyTitle, MARGIN, y, cw, {
    bold: true,
    size: 13,
    align: 'center',
  });
  y = drawText(doc, reportKindPeriodEth(report), MARGIN, y, cw, { bold: true, size: 11, align: 'center' });
  y = drawText(doc, reportKindPeriodGreg(report), MARGIN, y, cw, { size: 9, color: GRAY, align: 'center' });
  y += 4;
  y = drawText(doc, `${LABELS.generatedOn}: ${formatEthiopianDate(new Date())} / ${new Date().toISOString().slice(0, 10)}`, MARGIN, y, cw, {
    size: 8.5,
    color: GRAY,
    align: 'center',
  });
  y = drawText(doc, `${LABELS.generatedBy}: ${generatedBy}`, MARGIN, y, cw, { size: 8.5, color: GRAY, align: 'center' });
  doc.y = y;
  doc.moveTo(MARGIN, doc.y + 8).lineTo(PAGE_WIDTH - MARGIN, doc.y + 8).strokeColor(GOLD).lineWidth(1.5).stroke();
  doc.moveDown(1);
}

function reportKindPeriodEth(report: AuditReport): string {
  const { year, month } = toEthiopian(report.period.from);
  if (report.kind === 'monthly') return `${amharicMonth(month)} ${year} ${LABELS.era}`;
  return `${year} ${LABELS.era}`;
}

function reportKindPeriodGreg(report: AuditReport): string {
  const from = report.period.from;
  const to = new Date(report.period.to.getTime() - 1);
  if (report.kind === 'monthly') {
    return `${from.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}`;
  }
  return `${from.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })} – ${to.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`;
}

const pct = (part: number, total: number) => (total ? `${((part / total) * 100).toFixed(1)}%` : '0.0%');

function drawIncomeSummary(doc: PDFKit.PDFDocument, report: AuditReport) {
  sectionTitle(doc, LABELS.incomeSummary);
  const entries = Object.entries(report.incomeBySourceType);
  if (entries.length === 0) return noneLine(doc);
  const rows = entries.map(([source, g]) => [source, String(g.count), `${money(g.total)} ETB`, pct(g.total, report.summary.totalIncome)]);
  drawTable(doc, [150, 60, 150, 120], [LABELS.income, 'ብዛት', 'ጠቅላላ', '%'], rows);
}

function drawExpenseSummary(doc: PDFKit.PDFDocument, report: AuditReport) {
  sectionTitle(doc, LABELS.expenseSummary);
  const entries = Object.entries(report.expenseByCategory);
  if (entries.length === 0) return noneLine(doc);
  const rows = entries.map(([category, g]) => [category, String(g.count), `${money(g.total)} ETB`, pct(g.total, report.summary.totalExpense)]);
  drawTable(doc, [150, 60, 150, 120], [LABELS.expense, 'ብዛት', 'ጠቅላላ', '%'], rows);
}

function drawAccountBalances(doc: PDFKit.PDFDocument, report: AuditReport) {
  sectionTitle(doc, LABELS.accountBalances);
  if (report.accountBalances.length === 0) return noneLine(doc);
  const rows = report.accountBalances.map((a) => {
    const warned = a.status === 'DISCREPANCY_FOUND' || a.status === 'UNDER_INVESTIGATION';
    const statusText = a.status ?? '–';
    return [
      a.accountName,
      a.reconciliationId ? `${money(a.expectedBalance)} ETB` : '–',
      a.reconciliationId ? `${money(a.actualBalance)} ETB` : '–',
      a.reconciliationId ? `${money(a.discrepancy)} ETB` : '–',
      a.reconciliationId ? (warned ? `${WARN_MARK} ${statusText}` : statusText) : '–',
    ];
  });
  drawTable(doc, [110, 90, 90, 90, 120], ['ሂሳብ', 'የሚጠበቅ', 'ተጨባጭ', 'ልዩነት', 'ሁኔታ'], rows);
}

function drawDiscrepancies(doc: PDFKit.PDFDocument, report: AuditReport) {
  sectionTitle(doc, LABELS.discrepancies);
  if (report.discrepancies.length === 0) return noneLine(doc);
  const rows = report.discrepancies.map((d) => [
    d.accountName,
    `${money(d.expectedBalance)} ETB`,
    `${money(d.actualBalance)} ETB`,
    `${money(d.discrepancy)} ETB`,
    `${WARN_MARK} ${d.status}`,
    d.resolutionNotes ?? '–',
  ]);
  drawTable(doc, [80, 80, 80, 80, 110, 100], ['ሂሳብ', 'የሚጠበቅ', 'ተጨባጭ', 'ልዩነት', 'ሁኔታ', 'ማስታወሻ'], rows);
}

function drawMissingReceipts(doc: PDFKit.PDFDocument, report: AuditReport) {
  sectionTitle(doc, LABELS.missingReceipts);
  if (report.missingReceipts.total === 0) return noneLine(doc);
  drawText(doc, `${LABELS.income}: ${report.missingReceipts.total}`, MARGIN, doc.y, PAGE_WIDTH - MARGIN * 2, { size: 9 });
  doc.y += lineHeightOf(9);
  doc.moveDown(0.3);
  const rows = report.missingReceipts.records.map((r) => [isoDate(r.date), r.sourceType, `${money(r.amount)} ETB`, r.status]);
  drawTable(doc, [110, 140, 130, 120], ['ቀን', 'ምንጭ', 'መጠን', 'ሁኔታ'], rows);
}

function drawPendingApprovals(doc: PDFKit.PDFDocument, report: AuditReport) {
  sectionTitle(doc, LABELS.pendingApprovals);
  const { income, expense } = report.pendingApprovals;
  if (income.length === 0 && expense.length === 0) return noneLine(doc);
  drawText(doc, `${LABELS.income}: ${income.length}  |  ${LABELS.expense}: ${expense.length}`, MARGIN, doc.y, PAGE_WIDTH - MARGIN * 2, { size: 9 });
  doc.y += lineHeightOf(9);
  doc.moveDown(0.3);
  const rows: Row[] = [
    ...income.map((i) => [isoDate(i.date), LABELS.income, i.sourceType, `${money(i.amount)} ETB`]),
    ...expense.map((e) => [isoDate(e.date), LABELS.expense, e.category, `${money(e.amount)} ETB`]),
  ];
  drawTable(doc, [110, 90, 140, 130], ['ቀን', 'ዓይነት', 'ምድብ', 'መጠን'], rows);
}

function drawAdjustments(doc: PDFKit.PDFDocument, report: AuditReport) {
  sectionTitle(doc, LABELS.adjustmentsLog);
  if (report.adjustments.length === 0) return noneLine(doc);
  const rows = report.adjustments.map((a) => [
    isoDate(a.createdAt),
    a.entityType,
    a.action,
    a.reason ?? '–',
    a.changedByName ?? '–',
  ]);
  drawTable(doc, [90, 80, 120, 120, 110], ['ቀን', 'ዓይነት', 'ድርጊት', 'ምክንያት', 'አከናዋኝ'], rows);
}

function drawSummaryFooter(doc: PDFKit.PDFDocument, report: AuditReport) {
  sectionTitle(doc, LABELS.summary);
  const rows: Row[] = [
    [LABELS.totalIncome, `${money(report.summary.totalIncome)} ETB`],
    [LABELS.totalExpense, `${money(report.summary.totalExpense)} ETB`],
    [LABELS.net, `${money(report.summary.net)} ETB`],
  ];
  drawTable(doc, [250, 150], ['', ''], rows);
  if (report.requiresReview.total > 0) {
    doc.moveDown(0.3);
    drawText(doc, `${WARN_MARK} ${report.requiresReview.total} እርምጃ የሚያስፈልጋቸው ነገሮች`, MARGIN, doc.y, PAGE_WIDTH - MARGIN * 2, {
      size: 9,
      color: GRAY,
    });
  }
}

export async function exportAuditPdf(res: Response, report: AuditReport, filename: string, generatedBy: string) {
  if (!fs.existsSync(FONT_REG_PATH) || !fs.existsSync(FONT_BOLD_PATH)) {
    throw new Error('Ethiopic fonts not found under backend/assets/fonts/');
  }

  const doc = new PDFDocument({ margin: MARGIN, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
  doc.pipe(res);

  doc.registerFont(FONT_REG, FONT_REG_PATH);
  doc.registerFont(FONT_BOLD, FONT_BOLD_PATH);

  drawHeader(doc, report, generatedBy);
  drawIncomeSummary(doc, report);
  drawExpenseSummary(doc, report);
  drawAccountBalances(doc, report);
  drawDiscrepancies(doc, report);
  drawMissingReceipts(doc, report);
  drawPendingApprovals(doc, report);
  drawAdjustments(doc, report);
  drawSummaryFooter(doc, report);

  doc.end();
}
