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
    const html = await this.renderHtml(templateData);
    const launchOptions: Parameters<typeof puppeteer.launch>[0] = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    };
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }
    const browser = await puppeteer.launch(launchOptions);

    try {
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
      return Buffer.from(pdf);
    } finally {
      await browser.close();
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
