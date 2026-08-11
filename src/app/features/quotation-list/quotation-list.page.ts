import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { QuoteStatus } from '../../core/models/domain.models';
import { AppStoreService } from '../../core/services/app-store.service';

@Component({
  imports: [RouterLink, FormsModule, CurrencyPipe, DatePipe],
  templateUrl: './quotation-list.page.html',
  styleUrl: './quotation-list.page.scss',
})
export class QuotationListPage {
  readonly store = inject(AppStoreService);
  private readonly router = inject(Router);
  readonly search = signal('');
  readonly status = signal<'All' | QuoteStatus>('All');
  readonly statuses: ('All' | QuoteStatus)[] = ['All','Draft','Sent','Under Negotiation','Accepted','Rejected','Expired'];
  readonly filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    return this.store.quotations().filter(quote => {
      const statusMatch = this.status() === 'All' || quote.status === this.status();
      const text = `${quote.quoteNumber} ${quote.snapshots.buyer.companyName} ${quote.snapshots.buyer.country} ${quote.snapshots.product.variety}`.toLowerCase();
      return statusMatch && (!query || text.includes(query));
    });
  });

  duplicate(id: string): void {
    void this.router.navigate(['/quotes/new'], { queryParams: { copy: id } });
  }

  async changeStatus(id: string, status: QuoteStatus): Promise<void> {
    await this.store.updateQuotationStatus(id, status);
  }

  async remove(id: string): Promise<void> {
    if (confirm('Delete this quotation? This cannot be undone.')) await this.store.deleteQuotation(id);
  }
}
