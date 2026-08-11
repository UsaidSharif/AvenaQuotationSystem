import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  CommissionAgent, ContainerType, DocumentStatus, LogisticsRate, PackagingOption, Product,
  ProfitMethod, QuoteCalculation, QuoteCurrency, QuoteScenario, QuotationDocumentDetails,
  QuotationInput, QuotationRecord, SupplierPrice, TradeTerm,
} from '../../core/models/domain.models';
import { AppStoreService } from '../../core/services/app-store.service';
import { QuotationCalculatorService } from '../../core/services/quotation-calculator.service';
import { QuotationValidationService } from '../../core/services/quotation-validation.service';
import { createDefaultQuotationDocument } from '../../core/data/quotation-document.defaults';
import { createId, nowIso, todayIso } from '../../shared/utils/ids';

@Component({
  imports: [ReactiveFormsModule, RouterLink, CurrencyPipe, DecimalPipe],
  templateUrl: './quote-wizard.page.html',
  styleUrl: './quote-wizard.page.scss',
})
export class QuoteWizardPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly store = inject(AppStoreService);
  private readonly calculator = inject(QuotationCalculatorService);
  private readonly validator = inject(QuotationValidationService);

  readonly step = signal(0);
  readonly calculation = signal<QuoteCalculation | null>(null);
  readonly saving = signal(false);
  readonly message = signal('');
  readonly steps = ['Buyer & terms', 'Product & packing', 'Shipment & freight', 'Profit & commission', 'Document controls', 'Review'];
  quoteTitle(): string { return this.revisionSourceId ? 'Create Quotation Revision' : this.existingId ? 'Edit Quotation' : 'Create New Quotation'; }

  existingId = '';
  existingStatus: QuotationRecord['status'] = 'Draft';
  existingQuoteNumber = '';
  revisionSourceId = '';
  revisionRootId = '';
  revisionSourceNo = '';

  readonly form = this.fb.nonNullable.group({
    quoteDate: [todayIso(), Validators.required],
    validityDays: [3, [Validators.required, Validators.min(1)]],
    buyerId: ['', Validators.required],
    tradeTerm: ['FOB' as TradeTerm, Validators.required],
    scenario: ['Target' as QuoteScenario, Validators.required],
    quoteCurrency: ['USD' as QuoteCurrency, Validators.required],
    productId: ['', Validators.required],
    supplierPriceId: ['', Validators.required],
    packagingId: ['', Validators.required],
    logisticsId: ['', Validators.required],
    containerType: ["20' Dry FCL" as ContainerType, Validators.required],
    containers: [1, [Validators.required, Validators.min(1)]],
    netMtPerContainer: [25, [Validators.required, Validators.min(0.1)]],
    paymentTerms: ['100% Advance', Validators.required],
    shipmentDays: [10, [Validators.required, Validators.min(1)]],
    agentId: ['agent-none', Validators.required],
    spotExchangeRate: [285, [Validators.required, Validators.min(1)]],
    fxBufferPercent: [2, [Validators.required, Validators.min(0), Validators.max(25)]],
    profitMethod: ['margin' as ProfitMethod, Validators.required],
    minimumProfitPercent: [3, [Validators.required, Validators.min(0)]],
    targetProfitPercent: [5, [Validators.required, Validators.min(0)]],
    premiumProfitPercent: [8, [Validators.required, Validators.min(0)]],
    contingencyPercent: [1, [Validators.required, Validators.min(0)]],
    bankCostPercent: [0.5, [Validators.required, Validators.min(0)]],
    priceRoundingUsdPerMt: [1, [Validators.required, Validators.min(0.01)]],
    buyerTargetUsdPerMt: [0, [Validators.min(0)]],

    revisionNo: ['00', Validators.required],
    buyerRfqRef: ['N/A'],
    documentStatus: ['Final' as DocumentStatus, Validators.required],
    quantityTolerancePercent: [5, [Validators.required, Validators.min(0), Validators.max(100)]],
    incotermNamedPlace: [''],
    priceBasis: [''],
    finalInvoiceBasis: [''],
    shipmentPlan: [''],
    lcOpeningDeadline: ['N/A'],
    partialShipment: ['Not Allowed'],
    transshipment: ['Not Allowed'],
    shipmentCommencement: [''],
    latestShipmentDateText: [''],
    lcExpiryPlace: ['N/A'],
    presentationPeriod: ['N/A'],
    lcConfirmation: ['N/A'],
    confirmationCharges: ['N/A'],
    bankCharges: [''],
    amendmentCharges: ['N/A'],
    documentDiscrepancyCharges: ['N/A'],
    draftLcReview: ['N/A'],
    lcGoverningRules: ['N/A'],
    freightValidity: ['N/A'],
    insuranceForCif: ['N/A'],
    taxesDuties: [''],
    specialLegalization: ['N/A'],
    buyerDocumentaryWording: ['N/A'],
    finalShipmentInstructions: ['Required before production and booking'],
    standardDocumentsIncluded: [''],
    additionalDocuments: [''],
    commercialConditions: [''],
    qualityPackingInspectionTerms: [''],
    shipmentDocumentationTerms: [''],
    paymentSecurityTerms: [''],
    authenticityAcceptanceTerms: [''],
    securityNotice: [''],
    buyerAcknowledgement: [''],
    notes: [''],
  });

  async ngOnInit(): Promise<void> {
    await this.store.initialize();
    this.applyDefaultValues();
    this.loadRequestedQuotation();

    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.recalculate());
    this.form.controls.productId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(productId => {
      const matches = this.store.supplierPrices().filter(item => item.productId === productId);
      if (!matches.some(item => item.id === this.form.controls.supplierPriceId.value)) {
        this.form.controls.supplierPriceId.setValue(matches[0]?.id ?? '');
      }
    });
    this.form.controls.containerType.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(type => {
      const settings = this.store.settings();
      this.form.controls.netMtPerContainer.setValue(type === "40' Dry FCL" ? settings.defaultNetMt40Ft : settings.defaultNetMt20Ft);
    });
    this.form.controls.logisticsId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.refreshNamedPlace());
    this.form.controls.tradeTerm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.refreshNamedPlace());
    this.recalculate();
  }

  filteredSupplierPrices(): SupplierPrice[] {
    return this.store.supplierPrices().filter(item => item.productId === this.form.controls.productId.value);
  }

  selectedProduct(): Product | undefined { return this.store.products().find(item => item.id === this.form.controls.productId.value); }
  selectedSupplier(): SupplierPrice | undefined { return this.store.supplierPrices().find(item => item.id === this.form.controls.supplierPriceId.value); }
  selectedPackaging(): PackagingOption | undefined { return this.store.packaging().find(item => item.id === this.form.controls.packagingId.value); }
  selectedLogistics(): LogisticsRate | undefined { return this.store.logistics().find(item => item.id === this.form.controls.logisticsId.value); }
  selectedAgent(): CommissionAgent | undefined { return this.store.agents().find(item => item.id === this.form.controls.agentId.value); }

  previewQuoteNumber(): string {
    return this.existingQuoteNumber || this.store.nextQuoteNumber(this.form.controls.quoteDate.value, this.form.controls.tradeTerm.value);
  }

  next(): void {
    if (!this.validateCurrentStep()) return;
    this.step.update(value => Math.min(this.steps.length - 1, value + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  previous(): void {
    this.step.update(value => Math.max(0, value - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  goToStep(index: number): void { this.step.set(index); }

  recalculate(): void {
    const product = this.selectedProduct();
    const supplier = this.selectedSupplier();
    const packaging = this.selectedPackaging();
    const logistics = this.selectedLogistics();
    const agent = this.selectedAgent();
    if (!product || !supplier || !packaging || !logistics || !agent) {
      this.calculation.set(null);
      return;
    }
    this.calculation.set(this.calculator.calculate(this.buildInput(), {
      product, supplier, packaging, logistics, agent, settings: this.store.settings(),
    }));
  }

  quotedPrice(): number {
    const result = this.calculation();
    if (!result) return 0;
    return this.form.controls.quoteCurrency.value === 'PKR'
      ? result.quotedPriceUsdPerMt * result.quotationFxRate : result.quotedPriceUsdPerMt;
  }

  invoiceTotal(): number {
    const result = this.calculation();
    if (!result) return 0;
    return this.form.controls.quoteCurrency.value === 'PKR'
      ? result.invoiceTotalUsd * result.quotationFxRate : result.invoiceTotalUsd;
  }

  resetDocumentControls(): void {
    const currentRevision = this.form.controls.revisionNo.value;
    const currentDocumentStatus = this.form.controls.documentStatus.value;
    const currentBuyerRfqRef = this.form.controls.buyerRfqRef.value;
    const defaults = createDefaultQuotationDocument(
      this.form.controls.paymentTerms.value,
      this.form.controls.shipmentDays.value,
      this.form.controls.tradeTerm.value,
    );
    defaults.incotermNamedPlace = this.defaultNamedPlace();
    defaults.shipmentPlan = this.defaultShipmentPlan();
    this.form.patchValue({
      ...defaults,
      revisionNo: currentRevision,
      documentStatus: currentDocumentStatus,
      buyerRfqRef: currentBuyerRfqRef,
    });
  }

  async save(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || !this.calculation()) {
      this.message.set('Complete all required fields before saving.');
      this.step.set(0);
      return;
    }
    const buyer = this.store.buyers().find(item => item.id === this.form.controls.buyerId.value);
    const product = this.selectedProduct();
    const supplier = this.selectedSupplier();
    const packaging = this.selectedPackaging();
    const logistics = this.selectedLogistics();
    const agent = this.selectedAgent();
    if (!buyer || !product || !supplier || !packaging || !logistics || !agent) return;

    const timestamp = nowIso();
    const input = this.buildInput();
    const document = this.buildDocumentDetails();
    const record: QuotationRecord = {
      id: this.existingId || createId('quote'),
      createdAt: this.existingId ? (this.store.findQuotation(this.existingId)?.createdAt ?? timestamp) : timestamp,
      updatedAt: timestamp,
      quoteNumber: this.previewQuoteNumber(),
      status: this.revisionSourceId ? 'Draft' : this.existingStatus,
      revisionOfId: this.revisionSourceId || undefined,
      revisionRootId: this.revisionRootId || undefined,
      input,
      document,
      calculation: this.calculation()!,
      snapshots: {
        buyer: structuredClone(buyer), product: structuredClone(product), supplier: structuredClone(supplier),
        packaging: structuredClone(packaging), logistics: structuredClone(logistics), agent: structuredClone(agent),
        company: structuredClone(this.store.company()),
      },
      notes: this.form.controls.notes.value,
    };

    if (document.documentStatus === 'Final') {
      const errors = this.validator.errors(record);
      if (errors.length) {
        this.message.set(`Final quotation cannot be saved yet: ${errors[0].message}${errors.length > 1 ? ` (+${errors.length - 1} more checks)` : ''}`);
        this.step.set(5);
        return;
      }
    }

    this.saving.set(true);
    try {
      await this.store.saveQuotation(record);
      await this.router.navigate(['/quotes', record.id, 'print']);
    } catch (error: unknown) {
      this.message.set(error instanceof Error ? error.message : 'The quotation could not be saved.');
    } finally {
      this.saving.set(false);
    }
  }

  private applyDefaultValues(): void {
    const settings = this.store.settings();
    const product = this.store.products()[0];
    const supplier = this.store.supplierPrices().find(item => item.productId === product?.id);
    const packageOption = this.store.packaging()[0];
    const lane = this.store.logistics()[0];
    const documentDefaults = createDefaultQuotationDocument('100% Advance', settings.defaultShipmentDays, 'FOB');
    this.form.patchValue({
      validityDays: settings.defaultValidityDays,
      shipmentDays: settings.defaultShipmentDays,
      spotExchangeRate: settings.spotExchangeRate,
      fxBufferPercent: settings.fxBufferPercent,
      minimumProfitPercent: settings.minimumProfitPercent,
      targetProfitPercent: settings.targetProfitPercent,
      premiumProfitPercent: settings.premiumProfitPercent,
      contingencyPercent: settings.contingencyPercent,
      bankCostPercent: settings.bankCostPercent,
      priceRoundingUsdPerMt: settings.priceRoundingUsdPerMt,
      netMtPerContainer: settings.defaultNetMt20Ft,
      buyerId: this.store.buyers()[0]?.id ?? '', productId: product?.id ?? '',
      supplierPriceId: supplier?.id ?? '', packagingId: packageOption?.id ?? '',
      logisticsId: lane?.id ?? '', agentId: this.store.agents()[0]?.id ?? '',
      ...documentDefaults,
    }, { emitEvent: false });
    this.form.controls.incotermNamedPlace.setValue(this.defaultNamedPlace(), { emitEvent: false });
    this.form.controls.shipmentPlan.setValue('', { emitEvent: false });
  }

  private loadRequestedQuotation(): void {
    const editId = this.route.snapshot.paramMap.get('id');
    const copyId = this.route.snapshot.queryParamMap.get('copy');
    const source = this.store.findQuotation(editId || copyId || '');
    if (!source) return;

    const document = source.document ?? createDefaultQuotationDocument(source.input.paymentTerms, source.input.shipmentDays, source.input.tradeTerm);
    if (editId && this.store.isQuotationLocked(source)) {
      this.revisionSourceId = source.id;
      this.revisionRootId = source.revisionRootId || source.id;
      this.revisionSourceNo = document.revisionNo;
      this.existingStatus = 'Draft';
      this.existingQuoteNumber = source.quoteNumber;
      this.form.patchValue({
        ...source.input,
        ...document,
        quoteDate: todayIso(),
        revisionNo: this.store.nextRevisionNo(source.quoteNumber),
        documentStatus: 'Draft',
        notes: source.notes,
      }, { emitEvent: false });
      return;
    }

    if (editId) {
      this.existingId = source.id;
      this.existingStatus = source.status;
      this.existingQuoteNumber = source.quoteNumber;
      this.revisionRootId = source.revisionRootId || source.id;
    }
    this.form.patchValue({
      ...source.input,
      ...document,
      revisionNo: copyId ? '00' : document.revisionNo,
      documentStatus: copyId ? 'Draft' : document.documentStatus,
      notes: source.notes,
    }, { emitEvent: false });
  }

  private buildInput(): QuotationInput {
    const raw = this.form.getRawValue();
    return {
      quoteDate: raw.quoteDate, validityDays: raw.validityDays, buyerId: raw.buyerId,
      tradeTerm: raw.tradeTerm, scenario: raw.scenario, quoteCurrency: raw.quoteCurrency,
      productId: raw.productId, supplierPriceId: raw.supplierPriceId, packagingId: raw.packagingId,
      logisticsId: raw.logisticsId, containerType: raw.containerType, containers: raw.containers,
      netMtPerContainer: raw.netMtPerContainer, paymentTerms: raw.paymentTerms,
      shipmentDays: raw.shipmentDays, agentId: raw.agentId, spotExchangeRate: raw.spotExchangeRate,
      fxBufferPercent: raw.fxBufferPercent, profitMethod: raw.profitMethod,
      minimumProfitPercent: raw.minimumProfitPercent, targetProfitPercent: raw.targetProfitPercent,
      premiumProfitPercent: raw.premiumProfitPercent, contingencyPercent: raw.contingencyPercent,
      bankCostPercent: raw.bankCostPercent, priceRoundingUsdPerMt: raw.priceRoundingUsdPerMt,
      buyerTargetUsdPerMt: raw.buyerTargetUsdPerMt,
    };
  }

  private buildDocumentDetails(): QuotationDocumentDetails {
    const raw = this.form.getRawValue();
    return {
      revisionNo: raw.revisionNo, buyerRfqRef: raw.buyerRfqRef || 'N/A', documentStatus: raw.documentStatus,
      quantityTolerancePercent: raw.quantityTolerancePercent, incotermNamedPlace: raw.incotermNamedPlace || this.defaultNamedPlace(),
      priceBasis: raw.priceBasis, finalInvoiceBasis: raw.finalInvoiceBasis,
      shipmentPlan: raw.shipmentPlan || this.defaultShipmentPlan(), lcOpeningDeadline: raw.lcOpeningDeadline,
      partialShipment: raw.partialShipment, transshipment: raw.transshipment,
      shipmentCommencement: raw.shipmentCommencement, latestShipmentDateText: raw.latestShipmentDateText,
      lcExpiryPlace: raw.lcExpiryPlace, presentationPeriod: raw.presentationPeriod,
      lcConfirmation: raw.lcConfirmation, confirmationCharges: raw.confirmationCharges,
      bankCharges: raw.bankCharges, amendmentCharges: raw.amendmentCharges,
      documentDiscrepancyCharges: raw.documentDiscrepancyCharges, draftLcReview: raw.draftLcReview,
      lcGoverningRules: raw.lcGoverningRules, freightValidity: raw.freightValidity,
      insuranceForCif: raw.insuranceForCif, taxesDuties: raw.taxesDuties,
      specialLegalization: raw.specialLegalization, buyerDocumentaryWording: raw.buyerDocumentaryWording,
      finalShipmentInstructions: raw.finalShipmentInstructions, standardDocumentsIncluded: raw.standardDocumentsIncluded,
      additionalDocuments: raw.additionalDocuments, commercialConditions: raw.commercialConditions,
      qualityPackingInspectionTerms: raw.qualityPackingInspectionTerms,
      shipmentDocumentationTerms: raw.shipmentDocumentationTerms, paymentSecurityTerms: raw.paymentSecurityTerms,
      authenticityAcceptanceTerms: raw.authenticityAcceptanceTerms, securityNotice: raw.securityNotice,
      buyerAcknowledgement: raw.buyerAcknowledgement,
    };
  }

  private refreshNamedPlace(): void {
    this.form.controls.incotermNamedPlace.setValue(this.defaultNamedPlace(), { emitEvent: false });
  }

  private defaultNamedPlace(): string {
    const lane = this.selectedLogistics();
    const term = this.form.controls.tradeTerm.value;
    if (term === 'EXW') return this.store.company().processingFacility || this.store.company().address;
    if (term === 'FCA' || term === 'FOB') return lane?.portOfLoading ?? '';
    return lane?.portOfDischarge ?? '';
  }

  private defaultShipmentPlan(): string {
    const type = this.form.controls.containerType.value.startsWith("20'") ? '20 ft FCL' : '40 ft FCL';
    return `${this.form.controls.containers.value} x ${type}, subject to final loading plan`;
  }

  private validateCurrentStep(): boolean {
    const controlsByStep = [
      ['quoteDate','validityDays','buyerId','tradeTerm','scenario','quoteCurrency','paymentTerms','shipmentDays'],
      ['productId','supplierPriceId','packagingId'],
      ['logisticsId','containerType','containers','netMtPerContainer'],
      ['agentId','spotExchangeRate','fxBufferPercent','profitMethod','minimumProfitPercent','targetProfitPercent','premiumProfitPercent','contingencyPercent','bankCostPercent','priceRoundingUsdPerMt'],
      ['revisionNo','documentStatus','quantityTolerancePercent'],
    ] as const;
    const names = controlsByStep[this.step()] ?? [];
    let valid = true;
    for (const name of names) {
      const control = this.form.controls[name];
      control.markAsTouched();
      if (control.invalid) valid = false;
    }
    if (!valid) this.message.set('Please complete the highlighted fields.');
    else this.message.set('');
    return valid;
  }
}
