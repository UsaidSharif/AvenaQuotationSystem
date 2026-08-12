import { describe, expect, it } from 'vitest';
import { QuotationRecord } from '../../core/models/domain.models';
import { createDefaultQuotationDocument } from '../../core/data/quotation-document.defaults';
import { deriveDocumentNumber, documentDate, documentNumber, documentStatus } from './document-identifiers';

function record(): QuotationRecord {
  const document = createDefaultQuotationDocument();
  return {
    quoteNumber: 'AAF-EQ-2026-1010',
    input: { quoteDate: '2026-08-12' },
    document,
  } as QuotationRecord;
}

describe('document identifiers', () => {
  it.each([
    ['proforma', 'AAF-PI-2026-1010'],
    ['sales-contract', 'AAF-SC-2026-1010'],
    ['commercial-invoice', 'AAF-CI-2026-1010'],
    ['packing-list', 'AAF-PL-2026-1010'],
  ] as const)('derives the %s number from an export quotation', (type, expected) => {
    expect(deriveDocumentNumber('AAF-EQ-2026-1010', type)).toBe(expected);
  });

  it('derives identifiers from local and legacy quotation prefixes', () => {
    expect(deriveDocumentNumber('AAF-LQ-1012', 'commercial-invoice')).toBe('AAF-CI-1012');
    expect(deriveDocumentNumber('AAF-EXP-88', 'packing-list')).toBe('AAF-PL-88');
    expect(deriveDocumentNumber('', 'sales-contract')).toBe('AAF-SC-DRAFT');
  });

  it('uses explicit per-document controls when they are present', () => {
    const item = record();
    item.document.commercialInvoiceNumber = 'CUSTOM-CI-9';
    item.document.commercialInvoiceDate = '2026-08-20';
    item.document.commercialInvoiceStatus = 'Final';

    expect(documentNumber(item, 'commercial-invoice')).toBe('CUSTOM-CI-9');
    expect(documentDate(item, 'commercial-invoice')).toBe('2026-08-20');
    expect(documentStatus(item, 'commercial-invoice')).toBe('Final');
  });

  it('falls back to the quotation date, a derived number, and Draft status for old records', () => {
    const item = record();
    item.document.packingListNumber = '';
    item.document.packingListDate = '';
    item.document.packingListStatus = undefined as never;

    expect(documentNumber(item, 'packing-list')).toBe('AAF-PL-2026-1010');
    expect(documentDate(item, 'packing-list')).toBe('2026-08-12');
    expect(documentStatus(item, 'packing-list')).toBe('Draft');
  });
});
