import { Injectable } from '@angular/core';
import { QuotationRecord } from '../models/domain.models';

export type ValidationLevel = 'error' | 'warning';

export interface QuotationValidationIssue {
  code: string;
  level: ValidationLevel;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class QuotationValidationService {
  validateForPdf(record: QuotationRecord): QuotationValidationIssue[] {
    const issues: QuotationValidationIssue[] = [];
    const add = (code: string, level: ValidationLevel, message: string) => {
      if (!issues.some(item => item.code === code || item.message === message)) issues.push({ code, level, message });
    };

    const buyer = record.snapshots.buyer;
    const product = record.snapshots.product;
    const logistics = record.snapshots.logistics;
    const company = record.snapshots.company;
    const document = record.document;
    const calc = record.calculation;
    const term = record.input.tradeTerm;

    if (!record.quoteNumber?.trim()) add('quote-number', 'error', 'Quotation number is missing.');
    if (!document.revisionNo?.trim()) add('revision-number', 'error', 'Revision number is missing.');
    if (!record.input.quoteDate) add('quote-date', 'error', 'Quotation date is missing.');

    if (!buyer.companyName?.trim()) add('buyer-company', 'error', 'Buyer company name is missing.');
    if (!buyer.country?.trim()) add('buyer-country', 'error', 'Buyer country is missing.');
    if (!buyer.contactPerson?.trim()) add('buyer-contact', 'warning', 'Buyer contact person is blank.');
    if (!buyer.phone?.trim() && !buyer.email?.trim()) add('buyer-contact-details', 'warning', 'Buyer phone and email are both blank.');

    if (!company.legalName?.trim()) add('seller-company', 'error', 'Seller company name is missing.');
    if (!company.authorizedSignatory?.trim()) add('authorized-signatory', 'error', 'Authorized signatory is missing.');
    if (!company.authorizedDesignation?.trim()) add('authorized-designation', 'warning', 'Authorized signatory designation is blank.');

    if (!product.variety?.trim()) add('product-variety', 'error', 'Product / variety is missing.');
    if (!product.origin?.trim()) add('product-origin', 'error', 'Product origin is missing.');
    if (term !== 'LOCAL' && !product.hsCode?.trim()) add('hs-code', 'error', 'HS code is missing.');
    if (!product.cropYear?.trim()) add('crop-year', 'warning', 'Crop year is blank.');

    if (calc.loading.totalNetMt <= 0) add('quantity', 'error', 'Shipment quantity must be greater than zero.');
    if (calc.quotedPriceUsdPerMt <= 0) add('selling-price', 'error', 'Selling price is zero.');
    if (calc.invoiceTotalUsd <= 0) add('invoice-total', 'error', 'Total contract value is zero.');
    if (!record.input.paymentTerms?.trim()) add('payment-terms', 'error', 'Payment terms are missing.');

    const namedPlace = (document.incotermNamedPlace || '').trim();
    if (term !== 'LOCAL' && !namedPlace) add('named-place', 'error', 'Incoterm named place / port is missing.');
    if ((term === 'CFR' || term === 'CIF') && this.isPlaceholder(logistics.portOfDischarge)) {
      add('destination-port', 'error', 'Confirm the exact destination port before generating the PDF.');
    }
    if ((term === 'FOB' || term === 'FCA') && this.isPlaceholder(logistics.portOfLoading)) {
      add('loading-port', 'error', 'Confirm the exact loading / named place before generating the PDF.');
    }

    if ((term === 'CFR' || term === 'CIF') && calc.costs.freightUsd <= 0) {
      add('freight', 'error', 'Ocean freight is zero for a CFR/CIF quotation.');
    }
    if (term === 'CIF' && calc.costs.fixedInsuranceUsd + calc.costs.variableInsuranceUsd <= 0) {
      add('insurance', 'error', 'Insurance is zero for a CIF quotation.');
    }
    if (!calc.loading.withinLimits) add('container-load', 'error', 'Planned cargo exceeds the container weight or volume planning limit.');

    if (this.isExpired(record.snapshots.supplier.validTo, record.input.quoteDate)) {
      add('supplier-expired', 'error', 'Supplier price validity has expired for the quotation date.');
    }
    if (this.isExpired(record.snapshots.packaging.validTo, record.input.quoteDate)) {
      add('packaging-expired', 'error', 'Packaging price validity has expired for the quotation date.');
    }
    if (this.isExpired(logistics.validTo, record.input.quoteDate)) {
      add('logistics-expired', 'error', 'Logistics / freight rate validity has expired for the quotation date.');
    }

    if (term !== 'LOCAL' && !document.standardDocumentsIncluded?.trim()) add('standard-documents', 'error', 'Standard export documents wording is empty.');
    if (!document.commercialConditions?.trim()) add('commercial-terms', 'error', 'Commercial Conditions on Page 4 are empty.');
    if (!document.qualityPackingInspectionTerms?.trim()) add('quality-terms', 'error', 'Quality, Packing & Inspection terms are empty.');
    if (!document.shipmentDocumentationTerms?.trim()) add('shipment-terms', 'error', 'Shipment & Documentation terms are empty.');
    if (!document.paymentSecurityTerms?.trim()) add('payment-security', 'error', 'Payment Security & Bank Details terms are empty.');
    if (!document.authenticityAcceptanceTerms?.trim()) add('authenticity-terms', 'error', 'Authenticity, Acceptance & Contract Status terms are empty.');
    if (!document.securityNotice?.trim()) add('security-notice', 'warning', 'Security notice is blank.');

    if (document.documentStatus === 'Draft') {
      add('draft-status', 'warning', 'Document Status is Draft. The PDF will be visibly identified as a draft in its control table.');
    }

    for (const warning of calc.warnings ?? []) {
      const level: ValidationLevel = /FCA, confirm the exact named place/i.test(warning) ? 'warning' : 'error';
      add(`calc-${this.slug(warning)}`, level, warning);
    }

    return issues;
  }

  errors(record: QuotationRecord): QuotationValidationIssue[] {
    return this.validateForPdf(record).filter(item => item.level === 'error');
  }

  warnings(record: QuotationRecord): QuotationValidationIssue[] {
    return this.validateForPdf(record).filter(item => item.level === 'warning');
  }

  private isPlaceholder(value: string): boolean {
    const normalized = (value || '').trim().toLowerCase();
    return !normalized || normalized === 'n/a' || normalized.includes('[exact') || normalized.includes('confirm') || normalized.includes('tbd');
  }

  private isExpired(validTo: string, quoteDateValue: string): boolean {
    if (!validTo || !quoteDateValue) return false;
    const expiry = new Date(`${validTo}T23:59:59`);
    const quoteDate = new Date(`${quoteDateValue}T00:00:00`);
    return Number.isFinite(expiry.getTime()) && Number.isFinite(quoteDate.getTime()) && expiry < quoteDate;
  }

  private slug(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
  }
}
