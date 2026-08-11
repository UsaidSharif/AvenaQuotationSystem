import { Injectable } from '@angular/core';
import { QuotationRecord } from '../models/domain.models';

@Injectable({ providedIn: 'root' })
export class ExportService {
  quotationCsv(quotes: QuotationRecord[]): string {
    const rows = [
      ['Quote No','Revision','Document Status','Locked','Date','Buyer','Country','Product','Term','Scenario','Containers','Net MT','USD/MT','Total USD','Margin %','Status'],
      ...quotes.map(q => [
        q.quoteNumber, q.document.revisionNo, q.document.documentStatus, q.isLocked ? 'Yes' : 'No', q.input.quoteDate, q.snapshots.buyer.companyName, q.snapshots.buyer.country,
        `${q.snapshots.product.variety} ${q.snapshots.product.process}`, q.input.tradeTerm, q.input.scenario,
        q.input.containers, q.calculation.loading.totalNetMt, q.calculation.quotedPriceUsdPerMt,
        q.calculation.invoiceTotalUsd, q.calculation.actualGrossMarginPercent, q.status,
      ]),
    ];
    return rows.map(row => row.map(value => this.csvCell(value)).join(',')).join('\r\n');
  }

  private csvCell(value: unknown): string {
    return `"${String(value ?? '').replaceAll('"', '""')}"`;
  }
}
