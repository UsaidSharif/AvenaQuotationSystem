import { DocumentStatus, PrintableDocumentType, QuotationRecord } from '../../core/models/domain.models';

const documentPrefix: Record<Exclude<PrintableDocumentType, 'quotation'>, string> = {
  proforma: 'PI',
  'sales-contract': 'SC',
  'commercial-invoice': 'CI',
  'packing-list': 'PL',
};

export function deriveDocumentNumber(quoteNumber: string, type: Exclude<PrintableDocumentType, 'quotation'>): string {
  const normalized = quoteNumber.trim();
  const match = /^AAF-(?:EQ|LQ|EXP|LOC)-(.+)$/i.exec(normalized);
  const suffix = match?.[1] ?? (normalized.replace(/^AAF-/i, '') || 'DRAFT');
  return `AAF-${documentPrefix[type]}-${suffix}`;
}

export function documentNumber(record: QuotationRecord, type: PrintableDocumentType): string {
  if (type === 'quotation') return record.quoteNumber;
  const explicit = {
    proforma: record.document.proformaInvoiceNumber,
    'sales-contract': record.document.salesContractNumber,
    'commercial-invoice': record.document.commercialInvoiceNumber,
    'packing-list': record.document.packingListNumber,
  }[type];
  return explicit?.trim() || deriveDocumentNumber(record.quoteNumber, type);
}

export function documentDate(record: QuotationRecord, type: PrintableDocumentType): string {
  if (type === 'quotation') return record.input.quoteDate;
  return ({
    proforma: record.document.proformaInvoiceDate,
    'sales-contract': record.document.salesContractDate,
    'commercial-invoice': record.document.commercialInvoiceDate,
    'packing-list': record.document.packingListDate,
  }[type] || record.input.quoteDate);
}

export function documentStatus(record: QuotationRecord, type: PrintableDocumentType): DocumentStatus {
  if (type === 'quotation') return record.document.documentStatus;
  return ({
    proforma: record.document.proformaInvoiceStatus,
    'sales-contract': record.document.salesContractStatus,
    'commercial-invoice': record.document.commercialInvoiceStatus,
    'packing-list': record.document.packingListStatus,
  }[type] || 'Draft');
}
