import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PrintableDocumentType, QuotationRecord } from '../../core/models/domain.models';
import { AppStoreService } from '../../core/services/app-store.service';
import { QuotationValidationService } from '../../core/services/quotation-validation.service';
import {
  documentDate as resolveDocumentDate,
  documentNumber as resolveDocumentNumber,
  documentStatus as resolveDocumentStatus,
} from '../../shared/utils/document-identifiers';

@Component({
  imports: [RouterLink, CurrencyPipe, DatePipe, DecimalPipe],
  templateUrl: './quotation-print.page.html',
  styleUrl: './quotation-print.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuotationPrintPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  readonly store = inject(AppStoreService);
  private readonly validator = inject(QuotationValidationService);
  readonly quote = signal<QuotationRecord | null>(null);
  readonly documentType = signal<PrintableDocumentType>('quotation');
  readonly validationIssues = computed(() => {
    const record = this.quote();
    return record ? this.validator.validateForDocument(record, this.documentType()) : [];
  });
  readonly validationErrors = computed(() => this.validationIssues().filter(item => item.level === 'error'));
  readonly validationWarnings = computed(() => this.validationIssues().filter(item => item.level === 'warning'));
  readonly validationMessage = signal('');
  readonly recalculating = signal(false);
  readonly recalculationMessage = signal('');
  readonly recalculationError = signal('');

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.quote.set(this.store.findQuotation(id) ?? null);
  }

  setDocument(type: PrintableDocumentType): void {
    this.documentType.set(type);
    this.validationMessage.set('');
  }

  async recalculateSavedDraft(): Promise<void> {
    const current = this.quote();
    if (!current || this.store.isQuotationLocked(current) || this.recalculating()) return;
    this.recalculating.set(true);
    this.recalculationMessage.set('');
    this.recalculationError.set('');
    try {
      const updated = await this.store.recalculateDraftQuotation(current.id);
      this.quote.set(updated);
      this.recalculationMessage.set('Draft recalculated with current rules and saved to the data file.');
    } catch (error: unknown) {
      this.recalculationError.set(error instanceof Error ? error.message : 'The Draft could not be recalculated.');
    } finally {
      this.recalculating.set(false);
    }
  }
  print(): void {
    const errors = this.validationErrors();
    if (errors.length) {
      this.validationMessage.set(`PDF blocked: resolve ${errors.length} critical check${errors.length === 1 ? '' : 's'} first.`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    this.validationMessage.set('');
    window.print();
  }

  unitPrice(record: QuotationRecord): number {
    return record.input.quoteCurrency === 'PKR'
      ? record.calculation.quotedPriceUsdPerMt * record.calculation.quotationFxRate
      : record.calculation.quotedPriceUsdPerMt;
  }

  totalValue(record: QuotationRecord): number {
    return record.input.quoteCurrency === 'PKR'
      ? record.calculation.invoiceTotalUsd * record.calculation.quotationFxRate
      : record.calculation.invoiceTotalUsd;
  }

  validUntil(record: QuotationRecord): Date {
    const value = new Date(`${record.input.quoteDate}T00:00:00`);
    value.setDate(value.getDate() + record.input.validityDays);
    return value;
  }

  documentNumber(record: QuotationRecord, type = this.documentType()): string {
    return resolveDocumentNumber(record, type);
  }

  documentDate(record: QuotationRecord, type = this.documentType()): string {
    return resolveDocumentDate(record, type);
  }

  documentStatus(record: QuotationRecord, type = this.documentType()): string {
    return resolveDocumentStatus(record, type);
  }

  productDisplay(record: QuotationRecord): string {
    const product = record.snapshots.product;
    const variety = product.variety.trim();
    const process = product.process.trim();
    const lowerVariety = variety.toLowerCase();
    const significant = process.toLowerCase().split(/[\/() -]+/).filter(word => word.length > 3);
    const containsProcess = significant.some(word => lowerVariety.includes(word));
    const base = containsProcess || !process ? variety : `${variety} ${process}`;
    return /\brice\b/i.test(base) ? base : `${base} Rice`;
  }

  destinationPort(record: QuotationRecord): string {
    return ['CFR', 'CNF', 'CIF', 'DAP', 'DDP'].includes(record.input.tradeTerm)
      ? record.snapshots.logistics.portOfDischarge || 'N/A'
      : 'N/A';
  }

  incotermText(record: QuotationRecord): string {
    if (record.input.tradeTerm === 'LOCAL') return `Local Delivery — ${record.document.incotermNamedPlace || record.snapshots.logistics.portOfDischarge}`;
    const place = record.document.incotermNamedPlace || this.fallbackNamedPlace(record);
    if (record.input.tradeTerm === 'CNF') return `CNF ${place} — commercial shorthand; CFR cost basis`;
    const carrierNote = ['FOB', 'CFR', 'CIF', 'DAP', 'DDP'].includes(record.input.tradeTerm)
      ? ' (Subject to approval from shipping line)'
      : '';
    return `${record.input.tradeTerm} ${place} - Incoterms 2020${carrierNote}`;
  }

  shipmentPlan(record: QuotationRecord): string {
    if (record.document.shipmentPlan) return record.document.shipmentPlan;
    if (record.input.containerType === 'LCL') return `${record.calculation.loading.totalNetMt} MT LCL, subject to final consolidation plan`;
    const size = record.input.containerType.startsWith("20'") ? '20 ft FCL' : '40 ft FCL';
    return `${record.input.containers} x ${size}, subject to final loading plan`;
  }



  footerPhone(record: QuotationRecord): string {
    const parts = (record.snapshots.company.phone || '').split('/').map(value => value.trim()).filter(Boolean);
    return parts.at(-1) || record.snapshots.company.phone || '';
  }

  approxGrossWeight(record: QuotationRecord): number {
    return record.snapshots.packaging.approxGrossWeightKg || record.snapshots.packaging.retailBagKg;
  }

  tareWeight(record: QuotationRecord): number {
    return record.calculation.loading.totalPackagingTareKg;
  }

  grossWeight(record: QuotationRecord): number {
    return record.calculation.loading.totalNetKg + this.tareWeight(record);
  }

  packageCount(record: QuotationRecord): number {
    const loading = record.calculation.loading;
    return loading.totalMasterBags || loading.totalCartons || loading.totalBags;
  }

  packageType(record: QuotationRecord): string {
    const loading = record.calculation.loading;
    if (loading.totalMasterBags) return 'Master Bags';
    if (loading.totalCartons) return 'Cartons';
    return 'Bags';
  }

  packageDimensions(record: QuotationRecord): string {
    const packaging = record.snapshots.packaging;
    if (packaging.lengthCm <= 0 || packaging.widthCm <= 0 || packaging.heightCm <= 0) return 'N/A';
    return `${packaging.lengthCm} x ${packaging.widthCm} x ${packaging.heightCm} cm`;
  }

  consignee(record: QuotationRecord): string {
    return record.document.consigneeDetails?.trim()
      || [record.snapshots.buyer.companyName, record.snapshots.buyer.address, record.snapshots.buyer.city, record.snapshots.buyer.country]
        .filter(Boolean).join(', ');
  }

  percent(value: number, suffix = ' maximum'): string {
    return `${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}%${suffix}`;
  }

  splitTerms(value: string): string[] {
    return (value || '').split(/\r?\n/).map(item => item.trim()).filter(Boolean);
  }

  termLabel(value: string): string {
    const index = value.indexOf(':');
    return index >= 0 ? value.slice(0, index + 1) : '';
  }

  termBody(value: string): string {
    const index = value.indexOf(':');
    return index >= 0 ? ` ${value.slice(index + 1).trim()}` : value;
  }

  private fallbackNamedPlace(record: QuotationRecord): string {
    if (record.input.tradeTerm === 'EXW') return record.snapshots.company.processingFacility || record.snapshots.company.address;
    if (record.input.tradeTerm === 'FCA' || record.input.tradeTerm === 'FOB') return record.snapshots.logistics.portOfLoading;
    return record.snapshots.logistics.portOfDischarge;
  }
}
