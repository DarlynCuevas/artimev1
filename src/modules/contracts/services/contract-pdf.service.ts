import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import puppeteer from 'puppeteer';

type TemplateData = Record<string, unknown>;

@Injectable()
export class ContractPdfService {
  private readonly fallbackTemplate = `
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Contrato</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111827; margin: 24px; }
    h1 { margin: 0 0 12px; font-size: 20px; }
    p { margin: 0 0 8px; font-size: 12px; color: #374151; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    td { border: 1px solid #e5e7eb; padding: 8px; font-size: 12px; vertical-align: top; }
    td:first-child { width: 30%; font-weight: 600; background: #f9fafb; }
  </style>
</head>
<body>
  <h1>Contrato firmado</h1>
  <p>Documento generado por ARTIME.</p>
  <table>{{rows}}</table>
</body>
</html>
`;

  private async loadTemplateHtml(): Promise<string> {
    const templateCandidates = [
      path.resolve(process.cwd(), 'docs/contracts/contract-template.html'),
      path.resolve(__dirname, '../../../../docs/contracts/contract-template.html'),
    ];

    for (const templatePath of templateCandidates) {
      try {
        return await fs.readFile(templatePath, 'utf-8');
      } catch {
        // Try next candidate.
      }
    }

    return this.fallbackTemplate;
  }

  async renderHtml(templateData: TemplateData): Promise<string> {
    let html = await this.loadTemplateHtml();

    if (html.includes('{{rows}}')) {
      const rows = Object.entries(templateData ?? {})
        .map(([key, value]) => `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(normalizeTemplateValue(value))}</td></tr>`)
        .join('');
      return html.replace('{{rows}}', rows || '<tr><td>Estado</td><td>Sin datos</td></tr>');
    }

    html = html.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
      const value = normalizeTemplateValue(templateData[key]);
      return value.trim() ? escapeHtml(value) : '---';
    });

    return html;
  }

  async generatePdfBuffer(templateData: TemplateData): Promise<Buffer> {
    try {
      const html = await this.renderHtml(templateData);
      const launchOptions: Parameters<typeof puppeteer.launch>[0] = {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      };
      if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      }
      const browser = await puppeteer.launch(launchOptions);
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '18mm',
          bottom: '20mm',
          left: '18mm',
        },
      });
      await browser.close();
      return Buffer.from(pdf);
    } catch (error) {
      console.error('[ContractPdfService] Puppeteer failed, using fallback PDF:', error);
      return buildFallbackPdf(templateData);
    }
  }
}

function normalizeTemplateValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function escapeHtml(value: unknown): string {
  const safeValue = normalizeTemplateValue(value);
  return safeValue
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapePdfText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildFallbackPdf(templateData: TemplateData): Buffer {
  const pairs = Object.entries(templateData ?? {}).slice(0, 28);
  const lines = [
    'Contrato firmado - ARTIME',
    '',
    ...(pairs.length
      ? pairs.map(([key, value]) => `${key}: ${normalizeTemplateValue(value) || '---'}`)
      : ['Sin datos de contrato']),
  ];

  const content = [
    'BT',
    '/F1 11 Tf',
    '50 790 Td',
    ...lines.map((line, index) =>
      `${index === 0 ? '' : '0 -16 Td '}(${escapePdfText(line.slice(0, 110))}) Tj`,
    ),
    'ET',
  ].join('\n');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream\nendobj\n`,
  ];

  let pdf = '%PDF-1.4\n';
  const xrefPositions: number[] = [0];
  for (const objectText of objects) {
    xrefPositions.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += objectText;
  }

  const xrefStart = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(xrefPositions[index]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
}
