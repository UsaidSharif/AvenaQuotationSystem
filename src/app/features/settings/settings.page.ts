import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppStoreService } from '../../core/services/app-store.service';

@Component({
  imports: [ReactiveFormsModule],
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly store = inject(AppStoreService);
  readonly savedMessage = signal('');
  readonly error = signal('');

  readonly companyForm = this.fb.nonNullable.group({
    legalName: ['', Validators.required], tradingName: [''], tagline: [''],
    address: [''], processingFacility: [''], cityCountry: ['Pakistan'],
    phone: [''], email: [''], website: [''], ntn: [''], strn: [''],
    secpRegistration: [''], rexId: [''], pswId: [''],
    bankName: [''], bankBranch: [''], accountIban: [''], swiftCode: [''], bankAddress: [''],
    authorizedSignatory: ['Muhammad Usaid Sharif'], authorizedDesignation: ['CEO'],
  });

  readonly defaultsForm = this.fb.nonNullable.group({
    spotExchangeRate: [285, [Validators.required, Validators.min(1)]], fxBufferPercent: [2, [Validators.required, Validators.min(0), Validators.max(25)]],
    minimumProfitPercent: [3, Validators.min(0)], targetProfitPercent: [5, Validators.min(0)], premiumProfitPercent: [8, Validators.min(0)],
    contingencyPercent: [1, Validators.min(0)], bankCostPercent: [0.5, Validators.min(0)], priceRoundingUsdPerMt: [1, Validators.min(0.01)],
    defaultValidityDays: [3, Validators.min(1)], defaultShipmentDays: [10, Validators.min(1)],
    defaultNetMt20Ft: [25, Validators.min(0.1)], defaultNetMt40Ft: [25, Validators.min(0.1)],
    exportQuoteSequenceStart: [1010, Validators.min(1)],
  });

  ngOnInit(): void {
    this.companyForm.patchValue(this.store.company());
    this.defaultsForm.patchValue(this.store.settings());
  }

  async saveCompany(): Promise<void> {
    if (this.companyForm.invalid) return;
    try {
      await this.store.saveCompany({ ...this.store.company(), ...this.companyForm.getRawValue() });
      this.showSaved('Company details saved.');
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'Unable to save company details.');
    }
  }

  async saveDefaults(): Promise<void> {
    if (this.defaultsForm.invalid) return;
    try {
      await this.store.saveSettings({ ...this.store.settings(), ...this.defaultsForm.getRawValue() });
      this.showSaved('Default calculation settings saved.');
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'Unable to save default settings.');
    }
  }

  private showSaved(text: string): void {
    this.error.set('');
    this.savedMessage.set(text);
    setTimeout(() => this.savedMessage.set(''), 1800);
  }
}
