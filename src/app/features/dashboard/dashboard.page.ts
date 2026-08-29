import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AppStoreService } from '../../core/services/app-store.service';
import { StatCard } from '../../shared/components/stat-card/stat-card';

@Component({
  imports: [RouterLink, CurrencyPipe, DatePipe, DecimalPipe, StatCard],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  readonly store = inject(AppStoreService);
  readonly accepted = computed(() => this.store.quotations().filter(q => q.status === 'Accepted'));
  readonly negotiation = computed(() => this.store.quotations().filter(q => q.status === 'Under Negotiation').length);
  readonly totalValue = computed(() => this.store.quotations().reduce((sum, q) => sum + q.calculation.invoiceTotalUsd, 0));
  readonly acceptedValue = computed(() => this.accepted().reduce((sum, q) => sum + q.calculation.invoiceTotalUsd, 0));
  readonly averageMargin = computed(() => {
    const quotes = this.store.quotations();
    return quotes.length ? quotes.reduce((sum, q) => sum + q.calculation.actualGrossMarginPercent, 0) / quotes.length : 0;
  });
  readonly recent = computed(() => this.store.quotations().slice(0, 6));
}
