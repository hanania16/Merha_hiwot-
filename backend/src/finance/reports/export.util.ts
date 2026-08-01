import * as ExcelJS from 'exceljs';
import PDFDocument = require('pdfkit');
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';

const LOGO_PATH = path.join(process.cwd(), 'assets', 'logo.jpg');

const FONT_REG = path.join(process.cwd(), 'assets', 'fonts', 'NotoSansEthiopic-Regular.ttf');
const FONT_BOLD = path.join(process.cwd(), 'assets', 'fonts', 'NotoSansEthiopic-Bold.ttf');

export async function exportToExcel(
  res: Response,
  filename: string,
  columns: { header: string; key: string; width?: number }[],
  rows: Record<string, unknown>[],
) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Report');
  sheet.columns = columns;
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4AF37' } };
  rows.forEach((r) => sheet.addRow(r));

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
}

export function exportToPdf(res: Response, filename: string, title: string, lines: string[]) {
  const doc = new PDFDocument({ margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
  doc.pipe(res);

  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, doc.page.width / 2 - 30, 30, { width: 60, height: 60 });
    doc.moveDown(4);
  }

  if (fs.existsSync(FONT_REG)) doc.registerFont('Ethiopic', FONT_REG);
  if (fs.existsSync(FONT_BOLD)) doc.registerFont('EthiopicBold', FONT_BOLD);
  if (fs.existsSync(FONT_BOLD)) doc.font('EthiopicBold');
  doc.fontSize(18).fillColor('#111111').text('መርሃ ህይወት ሰ/ቤት', { align: 'center' });
  doc.fontSize(10).fillColor('#4B5563').text('Sunday School Management System', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(12).fillColor('#111111').text(title, { align: 'center' });
  doc.moveTo(40, doc.y + 8).lineTo(doc.page.width - 40, doc.y + 8).strokeColor('#D4AF37').lineWidth(1.5).stroke();
  doc.moveDown(1.5);

  lines.forEach((line) => {
    doc.fontSize(10).fillColor('#111111').text(line);
  });

  doc.end();
}
