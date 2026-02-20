import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import puppeteer from 'puppeteer';

type TemplateData = Record<string, string>;

@Injectable()
export class ContractPdfService {
  async renderHtml(templateData: TemplateData): Promise<string> {
    const templatePath = path.resolve(
      process.cwd(),
      'docs/contracts/contract-template.html',
    );

    let html = await fs.readFile(templatePath, 'utf-8');

    html = html.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
      const value = templateData[key];
      return value && value.trim() ? escapeHtml(value) : '---';
    });

    return html;
  }

  async generatePdfBuffer(templateData: TemplateData): Promise<Buffer> {
    const html = await this.renderHtml(templateData);
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
