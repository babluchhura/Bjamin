/**
 * Minimal, dependency-free PDF writer for e-tickets.
 * Produces a single A4 page using the built-in Helvetica fonts.
 */

type Op = string;

function ascii(input: string): string {
  return String(input ?? '')
    .replace(/₹/g, 'Rs. ')
    .replace(/[^\x20-\x7E]/g, '');
}

function esc(input: string): string {
  return ascii(input).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

class PdfPage {
  ops: Op[] = [];

  text(x: number, y: number, size: number, value: string, opts?: { bold?: boolean; gray?: number }) {
    const font = opts?.bold ? '/F2' : '/F1';
    const gray = opts?.gray ?? 0;
    this.ops.push(`BT ${gray} g ${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${esc(value)}) Tj ET`);
  }

  rect(x: number, y: number, w: number, h: number, fillGray: number) {
    this.ops.push(`${fillGray} g ${x} ${y} ${w} ${h} re f`);
  }

  line(x1: number, y1: number, x2: number, y2: number, gray = 0.8, width = 0.8) {
    this.ops.push(`${gray} G ${width} w ${x1} ${y1} m ${x2} ${y2} l S`);
  }

  toStream(): string {
    return this.ops.join('\n');
  }
}

export function buildTicketPdf(lines: Array<{ label: string; value: string }>, title: string, footer: string): Buffer {
  const page = new PdfPage();
  const width = 595.28;
  const height = 841.89;

  // header band
  page.rect(0, height - 130, width, 130, 0.06);
  page.text(48, height - 62, 24, 'Utkal Yatra', { bold: true });
  page.text(48, height - 84, 11, 'Odisha Online Bus Ticket Booking');
  page.text(48, height - 110, 16, title, { bold: true });

  let y = height - 170;
  page.text(48, y, 11, 'BOOKING DETAILS', { bold: true, gray: 0.35 });
  y -= 8;
  page.line(48, y, width - 48, y);
  y -= 26;

  for (const row of lines) {
    page.text(48, y, 10, row.label, { gray: 0.4 });
    page.text(240, y, 11, row.value, { bold: true });
    y -= 26;
    if (y < 120) break;
  }

  page.line(48, 110, width - 48, 110);
  page.text(48, 92, 9, footer, { gray: 0.4 });
  page.text(48, 74, 9, 'Please carry a valid photo ID. Reach your boarding point 15 minutes early.', { gray: 0.4 });
  page.text(48, 56, 9, 'Support: support@utkalyatra.in | +91 90909 09090', { gray: 0.4 });

  const content = page.toStream();
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width.toFixed(2)} ${height.toFixed(2)}] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'latin1');
}
