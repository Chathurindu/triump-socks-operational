'use client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/* ── Brand Colours ──────────────────────────────────────── */
const AMBER   = [217, 119, 6] as const;   // amber-600
const DARK    = [30, 30, 30] as const;     // near-black
const GRAY    = [100, 116, 139] as const;  // slate-500
const LIGHT   = [248, 250, 252] as const;  // slate-50
const WHITE   = [255, 255, 255] as const;
const RED     = [220, 38, 38] as const;
const GREEN   = [22, 163, 74] as const;

/* ── Helpers ────────────────────────────────────────────── */
function fmtCurrency(v: number) {
  return `Rs ${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ── Letterhead ─────────────────────────────────────────── */
function drawLetterhead(doc: jsPDF, docType: string, docNumber: string) {
  const pw = doc.internal.pageSize.getWidth();

  // Top amber bar
  doc.setFillColor(...AMBER);
  doc.rect(0, 0, pw, 4, 'F');

  // Company logo block
  doc.setFillColor(...AMBER);
  doc.roundedRect(14, 14, 14, 14, 2, 2, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('TS', 21, 23.5, { align: 'center' });

  // Company name
  doc.setTextColor(...DARK);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Triumph Socks', 32, 20);

  // Subtitle
  doc.setTextColor(...GRAY);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('PREMIUM SOCK MANUFACTURER — SRI LANKA', 32, 26);

  // Document type badge (top right)
  const badgeW = 52;
  const badgeX = pw - 14 - badgeW;
  doc.setFillColor(...DARK);
  doc.roundedRect(badgeX, 12, badgeW, 18, 2, 2, 'F');
  doc.setTextColor(...AMBER);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(docType.toUpperCase(), badgeX + badgeW / 2, 19.5, { align: 'center' });
  doc.setTextColor(...WHITE);
  doc.setFontSize(11);
  doc.text(docNumber, badgeX + badgeW / 2, 26.5, { align: 'center' });

  // Divider
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.line(14, 34, pw - 14, 34);

  return 38; // Y position after letterhead
}

/* ── Footer ─────────────────────────────────────────────── */
function drawFooter(doc: jsPDF) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  // Bottom amber bar
  doc.setFillColor(...AMBER);
  doc.rect(0, ph - 14, pw, 14, 'F');

  doc.setTextColor(...WHITE);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Triumph Socks  •  Premium Quality Since Day One  •  Sri Lanka', pw / 2, ph - 7, { align: 'center' });

  // Subtle line above footer
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(14, ph - 18, pw - 14, ph - 18);
}

/* ── Info Grid (customer, dates, etc.) ──────────────────── */
function drawInfoGrid(
  doc: jsPDF,
  y: number,
  leftFields: { label: string; value: string }[],
  rightFields: { label: string; value: string }[],
) {
  const pw = doc.internal.pageSize.getWidth();
  const midX = pw / 2;

  // Light background card
  doc.setFillColor(...LIGHT);
  const cardH = Math.max(leftFields.length, rightFields.length) * 11 + 8;
  doc.roundedRect(14, y, pw - 28, cardH, 2, 2, 'F');

  let ly = y + 8;
  for (const f of leftFields) {
    doc.setTextColor(...GRAY);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(f.label, 20, ly);
    doc.setTextColor(...DARK);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(f.value, 20, ly + 5);
    ly += 11;
  }

  let ry = y + 8;
  for (const f of rightFields) {
    doc.setTextColor(...GRAY);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(f.label, midX + 6, ry);
    doc.setTextColor(...DARK);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(f.value, midX + 6, ry + 5);
    ry += 11;
  }

  return y + cardH + 6;
}

/* ── Items Table ────────────────────────────────────────── */
function drawItemsTable(
  doc: jsPDF,
  y: number,
  items: { product_name?: string; description?: string; quantity: number; unit_price: string; line_total: string }[],
) {
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [['#', 'Product', 'Description', 'Qty', 'Unit Price', 'Total']],
    body: items.map((it, i) => [
      String(i + 1),
      it.product_name ?? '—',
      it.description ?? '—',
      String(it.quantity),
      fmtCurrency(parseFloat(it.unit_price)),
      fmtCurrency(parseFloat(it.line_total)),
    ]),
    headStyles: {
      fillColor: [...DARK] as [number, number, number],
      textColor: [...WHITE] as [number, number, number],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 3.5,
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: [51, 65, 85] as [number, number, number], // slate-700
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] as [number, number, number], // slate-50
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 'auto' },
      3: { halign: 'center', cellWidth: 16 },
      4: { halign: 'right', cellWidth: 32 },
      5: { halign: 'right', cellWidth: 32 },
    },
    styles: {
      lineColor: [226, 232, 240] as [number, number, number],
      lineWidth: 0.2,
      overflow: 'linebreak',
    },
    theme: 'grid',
  });

  return (doc as any).lastAutoTable.finalY + 6;
}

/* ── Totals Block ───────────────────────────────────────── */
function drawTotals(
  doc: jsPDF,
  y: number,
  data: {
    subtotal: number;
    discount: number;
    taxRate: number;
    taxAmount: number;
    grandTotal: number;
    amountPaid?: number;
  },
) {
  const pw = doc.internal.pageSize.getWidth();
  const boxW = 76;
  const boxX = pw - 14 - boxW;
  let cy = y;

  // Subtotal
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text('Subtotal', boxX, cy);
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.text(fmtCurrency(data.subtotal), pw - 14, cy, { align: 'right' });
  cy += 7;

  // Discount
  if (data.discount > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text('Discount', boxX, cy);
    doc.setTextColor(...RED);
    doc.setFont('helvetica', 'bold');
    doc.text(`-${fmtCurrency(data.discount)}`, pw - 14, cy, { align: 'right' });
    cy += 7;
  }

  // Tax
  if (data.taxAmount > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text(`Tax (${data.taxRate}%)`, boxX, cy);
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'bold');
    doc.text(fmtCurrency(data.taxAmount), pw - 14, cy, { align: 'right' });
    cy += 7;
  }

  // Grand Total bar
  cy += 2;
  doc.setFillColor(...AMBER);
  doc.roundedRect(boxX - 4, cy - 4, boxW + 4, 14, 2, 2, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL', boxX, cy + 4);
  doc.setFontSize(11);
  doc.text(fmtCurrency(data.grandTotal), pw - 14, cy + 4.5, { align: 'right' });
  cy += 16;

  // Paid / Balance (invoices only)
  if (data.amountPaid !== undefined) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GREEN);
    doc.text('Amount Paid', boxX, cy);
    doc.setFont('helvetica', 'bold');
    doc.text(fmtCurrency(data.amountPaid), pw - 14, cy, { align: 'right' });
    cy += 7;

    const balance = data.grandTotal - data.amountPaid;
    doc.setTextColor(balance > 0 ? RED[0] : GREEN[0], balance > 0 ? RED[1] : GREEN[1], balance > 0 ? RED[2] : GREEN[2]);
    doc.setFont('helvetica', 'normal');
    doc.text('Balance Due', boxX, cy);
    doc.setFont('helvetica', 'bold');
    doc.text(fmtCurrency(balance), pw - 14, cy, { align: 'right' });
    cy += 7;
  }

  return cy + 4;
}

/* ── Notes / Terms Block ────────────────────────────────── */
function drawNotes(doc: jsPDF, y: number, notes?: string, terms?: string) {
  let cy = y;
  if (notes) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text('Notes', 14, cy);
    cy += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.setFontSize(7.5);
    const lines = doc.splitTextToSize(notes, doc.internal.pageSize.getWidth() - 28);
    doc.text(lines, 14, cy);
    cy += lines.length * 4 + 4;
  }
  if (terms) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text('Terms & Conditions', 14, cy);
    cy += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.setFontSize(7.5);
    const lines = doc.splitTextToSize(terms, doc.internal.pageSize.getWidth() - 28);
    doc.text(lines, 14, cy);
    cy += lines.length * 4 + 4;
  }
  return cy;
}

/* ═══════════════════════════════════════════════════════════
   PUBLIC: Generate Quotation PDF
   ═══════════════════════════════════════════════════════════ */
export function generateQuotationPDF(
  quote: {
    quote_number: string;
    customer_name?: string;
    quote_date: string;
    valid_until?: string;
    status: string;
    subtotal: string;
    discount: string;
    tax_rate: string;
    tax_amount: string;
    grand_total: string;
    notes?: string;
    terms?: string;
  },
  items: {
    product_name?: string;
    description?: string;
    quantity: number;
    unit_price: string;
    line_total: string;
  }[],
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  let y = drawLetterhead(doc, 'Quotation', quote.quote_number);

  y = drawInfoGrid(doc, y, [
    { label: 'BILL TO', value: quote.customer_name ?? '—' },
    { label: 'STATUS', value: quote.status.toUpperCase() },
  ], [
    { label: 'QUOTATION DATE', value: fmtDate(quote.quote_date) },
    { label: 'VALID UNTIL', value: fmtDate(quote.valid_until) },
  ]);

  y = drawItemsTable(doc, y, items);

  y = drawTotals(doc, y, {
    subtotal: parseFloat(quote.subtotal),
    discount: parseFloat(quote.discount),
    taxRate: parseFloat(quote.tax_rate),
    taxAmount: parseFloat(quote.tax_amount),
    grandTotal: parseFloat(quote.grand_total),
  });

  drawNotes(doc, y, quote.notes ?? undefined, quote.terms ?? undefined);
  drawFooter(doc);

  doc.save(`${quote.quote_number}.pdf`);
}

/* ═══════════════════════════════════════════════════════════
   PUBLIC: Generate Invoice PDF
   ═══════════════════════════════════════════════════════════ */
export function generateInvoicePDF(
  invoice: {
    invoice_number: string;
    customer_name?: string;
    invoice_date: string;
    due_date?: string;
    status: string;
    subtotal: string;
    discount: string;
    tax_rate: string;
    tax_amount: string;
    grand_total: string;
    amount_paid?: string;
    notes?: string;
    terms?: string;
  },
  items: {
    product_name?: string;
    description?: string;
    quantity: number;
    unit_price: string;
    line_total: string;
  }[],
  payments?: {
    payment_date: string;
    amount: string;
    method: string;
    reference?: string;
  }[],
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  let y = drawLetterhead(doc, 'Invoice', invoice.invoice_number);

  y = drawInfoGrid(doc, y, [
    { label: 'BILL TO', value: invoice.customer_name ?? '—' },
    { label: 'STATUS', value: invoice.status.toUpperCase() },
  ], [
    { label: 'INVOICE DATE', value: fmtDate(invoice.invoice_date) },
    { label: 'DUE DATE', value: fmtDate(invoice.due_date) },
  ]);

  y = drawItemsTable(doc, y, items);

  y = drawTotals(doc, y, {
    subtotal: parseFloat(invoice.subtotal),
    discount: parseFloat(invoice.discount),
    taxRate: parseFloat(invoice.tax_rate),
    taxAmount: parseFloat(invoice.tax_amount),
    grandTotal: parseFloat(invoice.grand_total),
    amountPaid: parseFloat(invoice.amount_paid ?? '0'),
  });

  // Payment history table
  if (payments && payments.length > 0) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text('Payment History', 14, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [['Date', 'Method', 'Reference', 'Amount']],
      body: payments.map(p => [
        fmtDate(p.payment_date),
        p.method.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        p.reference || '—',
        fmtCurrency(parseFloat(p.amount)),
      ]),
      headStyles: {
        fillColor: [22, 163, 74] as [number, number, number], // green-600
        textColor: [...WHITE] as [number, number, number],
        fontStyle: 'bold',
        fontSize: 7.5,
        cellPadding: 3,
      },
      bodyStyles: { fontSize: 7.5, cellPadding: 2.5, textColor: [51, 65, 85] as [number, number, number] },
      columnStyles: {
        3: { halign: 'right', fontStyle: 'bold' },
      },
      styles: { lineColor: [226, 232, 240] as [number, number, number], lineWidth: 0.2 },
      theme: 'grid',
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  drawNotes(doc, y, invoice.notes ?? undefined, invoice.terms ?? undefined);
  drawFooter(doc);

  doc.save(`${invoice.invoice_number}.pdf`);
}
