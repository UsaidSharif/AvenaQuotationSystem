import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { QuotationRecord } from '../../core/models/domain.models';
import { AppStoreService } from '../../core/services/app-store.service';
import { QuotationValidationService } from '../../core/services/quotation-validation.service';

@Component({
  imports: [RouterLink, CurrencyPipe, DatePipe, DecimalPipe],
  templateUrl: './quotation-print.page.html',
  styleUrl: './quotation-print.page.scss',
})
export class QuotationPrintPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  readonly store = inject(AppStoreService);
  private readonly validator = inject(QuotationValidationService);
  readonly quote = signal<QuotationRecord | null>(null);
  readonly documentType = signal<'quotation' | 'proforma'>('quotation');
  readonly validationIssues = computed(() => {
    const record = this.quote();
    return record ? this.validator.validateForPdf(record) : [];
  });
  readonly validationErrors = computed(() => this.validationIssues().filter(item => item.level === 'error'));
  readonly validationWarnings = computed(() => this.validationIssues().filter(item => item.level === 'warning'));
  readonly validationMessage = signal('');

  async ngOnInit(): Promise<void> {
    await this.store.initialize();
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.quote.set(this.store.findQuotation(id) ?? null);
  }

  setDocument(type: 'quotation' | 'proforma'): void { this.documentType.set(type); }
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

  piNumber(record: QuotationRecord): string {
    const match = /(?:AAF-(?:EQ|LQ|EXP|LOC)-)(.+)$/.exec(record.quoteNumber);
    return `AAF-PI-${match?.[1] ?? record.quoteNumber}`;
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
    return record.input.tradeTerm === 'CFR' || record.input.tradeTerm === 'CIF'
      ? record.snapshots.logistics.portOfDischarge || 'N/A'
      : 'N/A';
  }

  incotermText(record: QuotationRecord): string {
    if (record.input.tradeTerm === 'LOCAL') return `Local Delivery — ${record.document.incotermNamedPlace || record.snapshots.logistics.portOfDischarge}`;
    const place = record.document.incotermNamedPlace || this.fallbackNamedPlace(record);
    const carrierNote = ['FOB', 'CFR', 'CIF'].includes(record.input.tradeTerm)
      ? ' (Subject to approval from shipping line)'
      : '';
    return `${record.input.tradeTerm} ${place} - Incoterms 2020${carrierNote}`;
  }

  shipmentPlan(record: QuotationRecord): string {
    if (record.document.shipmentPlan) return record.document.shipmentPlan;
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
