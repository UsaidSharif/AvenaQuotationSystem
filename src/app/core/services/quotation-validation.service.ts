import { Injectable } from '@angular/core';
import { PrintableDocumentType, QuotationRecord } from '../models/domain.models';
import { isLcPayment } from '../../shared/utils/commercial-terms';
import { documentDate, documentNumber, documentStatus } from '../../shared/utils/document-identifiers';

export type ValidationLevel = 'error' | 'warning';

export interface QuotationValidationIssue {
  code: string;
  level: ValidationLevel;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class QuotationValidationService {
  validateForPdf(record: QuotationRecord): QuotationValidationIssue[] {
    return this.validateForDocument(record, 'quotation');
  }

  validateForDocument(record: QuotationRecord, type: PrintableDocumentType): QuotationValidationIssue[] {
    if (type === 'quotation') return this.validateQuotation(record);
    if (type === 'proforma') {
      const quotationIssues = this.validateQuotation(record).filter(item => item.code !== 'draft-status');
      return this.addDocumentControls(record, type, quotationIssues);
    }
    return this.validateTransactionDocument(record, type);
  }

  errors(record: QuotationRecord, type: PrintableDocumentType = 'quotation'): QuotationValidationIssue[] {
    return this.validateForDocument(record, type).filter(item => item.level === 'error');
  }

  warnings(record: QuotationRecord, type: PrintableDocumentType = 'quotation'): QuotationValidationIssue[] {
    return this.validateForDocument(record, type).filter(item => item.level === 'warning');
  }

  private validateQuotation(record: QuotationRecord): QuotationValidationIssue[] {
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
    if (!record.input.paymentMethod) add('payment-method', 'error', 'Select a structured payment method.');
    const paymentTotal = Number(record.input.advancePercent || 0) + Number(record.input.balancePercent || 0);
    if (Math.abs(paymentTotal - 100) > 0.001) {
      add('payment-split', 'error', 'Advance and balance percentages must total 100%.');
    }
    if (record.input.paymentMethod === 'advance-tt' && record.input.advancePercent !== 100) {
      add('advance-tt-percent', 'error', '100% Advance TT requires an advance percentage of 100%.');
    }
    if (['usance-lc', 'da', 'open-account'].includes(record.input.paymentMethod) && record.input.paymentTenorDays <= 0) {
      add('payment-tenor', 'error', 'Usance LC, D/A and Open Account require a payment tenor in days.');
    }
    if (isLcPayment(record.input.paymentMethod) && (!document.lcGoverningRules?.trim() || document.lcGoverningRules === 'N/A')) {
      add('lc-rules', 'error', 'LC payment requires governing rules and LC controls.');
    }
    if (document.vesselService === 'Direct Vessel' && !/^not allowed$/i.test(document.transshipment.trim())) {
      add('vessel-routing', 'error', 'Direct Vessel conflicts with the transshipment setting.');
    }
    if (document.etd && document.eta && new Date(document.eta) < new Date(document.etd)) {
      add('eta-before-etd', 'error', 'ETA cannot be earlier than ETD.');
    }
    if (document.stuffingDate && document.etd && new Date(document.stuffingDate) > new Date(document.etd)) {
      add('stuffing-after-etd', 'error', 'Container stuffing date cannot be later than ETD.');
    }

    const namedPlace = (document.incotermNamedPlace || '').trim();
    if (term !== 'LOCAL' && !namedPlace) add('named-place', 'error', 'Incoterm named place / port is missing.');
    if (['CFR', 'CNF', 'CIF', 'DAP', 'DDP'].includes(term) && this.isPlaceholder(logistics.portOfDischarge)) {
      add('destination-port', 'error', 'Confirm the exact destination port before generating the PDF.');
    }
    if ((term === 'FOB' || term === 'FCA') && this.isPlaceholder(logistics.portOfLoading)) {
      add('loading-port', 'error', 'Confirm the exact loading / named place before generating the PDF.');
    }

    if (['CFR', 'CNF', 'CIF', 'DAP', 'DDP'].includes(term) && calc.costs.freightUsd <= 0) {
      add('freight', 'error', 'Freight is zero for a CFR/CNF/CIF/DAP/DDP quotation.');
    }
    if (term === 'CIF' && calc.costs.fixedInsuranceUsd + calc.costs.variableInsuranceUsd <= 0) {
      add('insurance', 'error', 'Insurance is zero for a CIF quotation.');
    }
    if ((term === 'DAP' || term === 'DDP') && calc.costs.destinationDeliveryUsd <= 0) {
      add('destination-delivery', 'error', `Destination delivery is zero for a ${term} quotation.`);
    }
    if (term === 'DDP' && calc.costs.destinationCustomsClearanceUsd + calc.costs.destinationDutiesTaxesUsd <= 0) {
      add('ddp-import-costs', 'error', 'DDP requires confirmed import-clearance, duty and tax costs.');
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
      const level: ValidationLevel = /FCA, confirm the exact named place|CNF is commercial shorthand/i.test(warning) ? 'warning' : 'error';
      add(`calc-${this.slug(warning)}`, level, warning);
    }

    return issues;
  }

  private validateTransactionDocument(
    record: QuotationRecord,
    type: Exclude<PrintableDocumentType, 'quotation' | 'proforma'>,
  ): QuotationValidationIssue[] {
    const issues: QuotationValidationIssue[] = [];
    const add = (code: string, level: ValidationLevel, message: string) => {
      if (!issues.some(item => item.code === code || item.message === message)) issues.push({ code, level, message });
    };
    const buyer = record.snapshots.buyer;
    const product = record.snapshots.product;
    const company = record.snapshots.company;
    const logistics = record.snapshots.logistics;
    const document = record.document;
    const calc = record.calculation;
    const final = documentStatus(record, type) === 'Final';
    const label = this.documentLabel(type);

    this.addDocumentControls(record, type, issues);
    if (!company.legalName?.trim()) add('seller-company', 'error', 'Seller company name is missing.');
    if (!company.address?.trim()) add('seller-address', 'error', 'Seller address is missing.');
    if (!company.authorizedSignatory?.trim()) add('authorized-signatory', 'error', 'Authorized signatory is missing.');
    if (!buyer.companyName?.trim()) add('buyer-company', 'error', 'Buyer / consignee company name is missing.');
    if (!buyer.country?.trim()) add('buyer-country', 'error', 'Buyer / consignee country is missing.');
    if (!buyer.address?.trim()) add('buyer-address', final ? 'error' : 'warning', `Buyer / consignee address is missing for the ${label}.`);
    if (!product.variety?.trim()) add('product-variety', 'error', 'Product / variety is missing.');
    if (!product.origin?.trim()) add('product-origin', 'error', 'Product origin is missing.');
    if (record.input.tradeTerm !== 'LOCAL' && !product.hsCode?.trim()) add('hs-code', 'error', 'HS code is missing.');
    if (calc.loading.totalNetMt <= 0) add('quantity', 'error', 'Shipment quantity must be greater than zero.');
    if (!calc.loading.withinLimits) add('container-load', 'error', 'Planned cargo exceeds the container weight or volume planning limit.');

    if (type !== 'packing-list') {
      if (calc.quotedPriceUsdPerMt <= 0) add('selling-price', 'error', 'Selling price is zero.');
      if (calc.invoiceTotalUsd <= 0) add('invoice-total', 'error', 'Total contract / invoice value is zero.');
      if (!record.input.paymentTerms?.trim()) add('payment-terms', 'error', 'Payment terms are missing.');
      if (record.input.tradeTerm !== 'LOCAL' && !document.incotermNamedPlace?.trim()) {
        add('named-place', 'error', 'Incoterm named place / port is missing.');
      }
    }

    if (type === 'sales-contract') {
      if (!document.commercialConditions?.trim()) add('commercial-terms', 'error', 'Sales Contract commercial conditions are empty.');
      if (!document.qualityPackingInspectionTerms?.trim()) add('quality-terms', 'error', 'Sales Contract quality and packing terms are empty.');
      if (!document.shipmentDocumentationTerms?.trim()) add('shipment-terms', 'error', 'Sales Contract shipment terms are empty.');
      if (!document.paymentSecurityTerms?.trim()) add('payment-security', 'error', 'Sales Contract payment and bank terms are empty.');
    }

    if (type === 'commercial-invoice') {
      if (!document.purchaseOrderRef?.trim() || /^n\/?a$/i.test(document.purchaseOrderRef.trim())) add('po-reference', 'warning', 'Purchase Order reference is blank or N/A.');
      if (!document.billOfLadingNumber?.trim()) add('bill-of-lading', 'warning', 'Bill of Lading number is blank.');
      if (record.input.containerType !== 'LCL' && !document.containerNumbers?.trim()) add('container-numbers', 'warning', 'Container number(s) are blank.');
      if (!document.vesselName?.trim()) add('vessel-name', 'warning', 'Vessel name is blank.');
      if (record.input.tradeTerm !== 'LOCAL' && this.isPlaceholder(logistics.portOfLoading)) add('loading-port', 'error', 'Confirm the exact port of loading.');
      if (record.input.tradeTerm !== 'LOCAL' && this.isPlaceholder(logistics.portOfDischarge)) add('destination-port', 'error', 'Confirm the exact port of discharge.');
    }

    if (type === 'packing-list') {
      if (!record.snapshots.packaging.description?.trim()) add('packing-description', 'error', 'Packing description is missing.');
      if (calc.loading.totalBags <= 0) add('package-count', 'error', 'Package / bag count must be greater than zero.');
      if (calc.loading.totalPackagingTareKg < 0) add('tare-weight', 'error', 'Tare weight cannot be negative.');
      if (calc.loading.totalNetKg + calc.loading.totalPackagingTareKg <= 0) add('gross-weight', 'error', 'Gross weight must be greater than zero.');
      if (record.input.containerType !== 'LCL') {
        if (!document.containerNumbers?.trim()) add('container-numbers', final ? 'error' : 'warning', 'Container number(s) are blank for this FCL shipment.');
        if (!document.sealNumber?.trim()) add('seal-number', final ? 'error' : 'warning', 'Seal number is blank for this FCL shipment.');
      }
      if (!document.billOfLadingNumber?.trim()) add('bill-of-lading', 'warning', 'Bill of Lading number is blank.');
      if (document.verifiedGrossMassKg <= 0) add('vgm', 'warning', 'Actual Verified Gross Mass (VGM) has not been entered.');
    }

    if (document.etd && document.eta && new Date(document.eta) < new Date(document.etd)) {
      add('eta-before-etd', 'error', 'ETA cannot be earlier than ETD.');
    }
    if (document.stuffingDate && document.etd && new Date(document.stuffingDate) > new Date(document.etd)) {
      add('stuffing-after-etd', 'error', 'Container stuffing date cannot be later than ETD.');
    }
    return issues;
  }

  private addDocumentControls(
    record: QuotationRecord,
    type: Exclude<PrintableDocumentType, 'quotation'>,
    issues: QuotationValidationIssue[],
  ): QuotationValidationIssue[] {
    const add = (code: string, level: ValidationLevel, message: string) => {
      if (!issues.some(item => item.code === code || item.message === message)) issues.push({ code, level, message });
    };
    const label = this.documentLabel(type);
    if (!documentNumber(record, type).trim()) add(`${type}-number`, 'error', `${label} number is missing.`);
    if (!documentDate(record, type)) add(`${type}-date`, 'error', `${label} date is missing.`);
    if (documentStatus(record, type) === 'Draft') {
      add(`${type}-draft-status`, 'warning', `${label} status is Draft. The printed document will be visibly identified as a draft.`);
    }
    return issues;
  }

  private documentLabel(type: Exclude<PrintableDocumentType, 'quotation'>): string {
    return {
      proforma: 'Proforma Invoice',
      'sales-contract': 'Sales Contract',
      'commercial-invoice': 'Commercial Invoice',
      'packing-list': 'Packing List',
    }[type];
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
