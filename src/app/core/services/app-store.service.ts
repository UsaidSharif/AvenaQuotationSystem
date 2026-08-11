import { Injectable, WritableSignal, computed, inject, signal } from '@angular/core';
import {
  AppSettings, BackupBundle, Buyer, CommissionAgent, CompanyProfile, LogisticsRate,
  PackagingOption, Product, QuotationRecord, SupplierPrice,
} from '../models/domain.models';
import {
  demoAgents, demoBuyers, demoCompany, demoLogistics, demoPackaging,
  demoProducts, demoSettings, demoSupplierPrices,
} from '../data/demo-data';
import { createDefaultQuotationDocument } from '../data/quotation-document.defaults';
import { LocalFileDataService } from './local-file-data.service';
import { createId, nowIso } from '../../shared/utils/ids';

function normalizeProduct(item: Product): Product {
  return {
    ...item,
    yellowGrainsMaxPercent: item.yellowGrainsMaxPercent ?? 0,
    damagedDiscolouredMaxPercent: item.damagedDiscolouredMaxPercent ?? 0,
    paddyGrainsPercent: item.paddyGrainsPercent ?? 0,
    chalkyGrainsMaxPercent: item.chalkyGrainsMaxPercent ?? 0,
    foreignMatterPercent: item.foreignMatterPercent ?? 0,
    otherVarietiesAdmixtureMaxPercent: item.otherVarietiesAdmixtureMaxPercent ?? 0,
    sortexStatus: item.sortexStatus ?? 'As per agreed specification',
    millingDegreePolish: item.millingDegreePolish ?? 'As per agreed specification',
    samplingBasis: item.samplingBasis ?? 'As per buyer’s requirement',
    gmoStatus: item.gmoStatus ?? 'N/A',
    referenceSample: item.referenceSample ?? 'N/A',
  };
}

function normalizePackaging(item: PackagingOption): PackagingOption {
  return {
    ...item,
    bagType: item.bagType ?? item.description ?? 'As agreed',
    approxGrossWeightKg: item.approxGrossWeightKg ?? item.retailBagKg,
    printing: item.printing ?? 'As agreed',
    artworkReference: item.artworkReference ?? 'N/A',
    artworkApproval: item.artworkApproval ?? 'As agreed before production',
    closure: item.closure ?? 'As agreed',
    palletization: item.palletization ?? 'As per loading plan',
    cylinderPlateCharges: item.cylinderPlateCharges ?? 'As agreed',
    specialPackingNotes: item.specialPackingNotes ?? 'As per buyer’s requirement',
    packingCostBasis: item.packingCostBasis ?? 'Included only as stated in the final price',
  };
}

@Injectable({ providedIn: 'root' })
export class AppStoreService {
  private readonly file = inject(LocalFileDataService);

  readonly ready = signal(false);
  readonly company = signal<CompanyProfile>(structuredClone(demoCompany));
  readonly settings = signal<AppSettings>(structuredClone(demoSettings));
  readonly buyers = signal<Buyer[]>([]);
  readonly products = signal<Product[]>([]);
  readonly supplierPrices = signal<SupplierPrice[]>([]);
  readonly packaging = signal<PackagingOption[]>([]);
  readonly logistics = signal<LogisticsRate[]>([]);
  readonly agents = signal<CommissionAgent[]>([]);
  readonly quotations = signal<QuotationRecord[]>([]);
  readonly quoteCount = computed(() => this.quotations().length);

  readonly dataFileConnected = this.file.connected;
  readonly dataFileName = this.file.fileName;
  readonly lastSavedAt = this.file.lastSavedAt;
  readonly fileApiSupported = this.file.supported;
  readonly automaticBackupConfigured = this.file.automaticBackupConfigured;
  readonly automaticBackupFolderName = this.file.automaticBackupFolderName;
  readonly lastAutomaticBackupAt = this.file.lastAutomaticBackupAt;

  initialize(): Promise<void> {
    return Promise.resolve();
  }

  async openDataFile(): Promise<void> {
    const bundle = await this.file.openDataFile();
    this.validateBundle(bundle);
    this.loadBundle(bundle);
  }

  async createNewDataFile(): Promise<void> {
    const bundle = this.demoBundle();
    await this.file.createDataFile(bundle);
    this.loadBundle(bundle);
  }

  closeDataFile(): void {
    this.file.disconnect();
    this.clearMemory();
  }

  async saveCurrentFile(): Promise<void> {
    this.requireDataFile();
    await this.file.automaticBackupCurrent('manual-save');
    await this.file.writeCurrent(this.exportBundle());
  }

  async configureAutomaticBackupFolder(): Promise<void> {
    this.requireDataFile();
    await this.file.configureAutomaticBackupFolder();
    await this.file.automaticBackupCurrent('backup-enabled');
  }

  clearAutomaticBackupFolder(): void {
    this.file.clearAutomaticBackupFolder();
  }

  async saveBackupCopy(): Promise<void> {
    this.requireDataFile();
    const stamp = new Date().toISOString().replaceAll(':', '-').slice(0, 19);
    await this.file.saveBundleCopy(this.exportBundle(), `avena-backup-${stamp}.json`);
  }

  async saveQuotationCsv(contents: string): Promise<void> {
    const date = new Date().toISOString().slice(0, 10);
    await this.file.saveTextFile(contents, `avena-quotation-history-${date}.csv`, 'text/csv', '.csv');
  }

  async readBackupFile(file: File): Promise<BackupBundle> {
    const bundle = await this.file.readBundleFromFile(file);
    this.validateBundle(bundle);
    return bundle;
  }

  async replaceCurrentWithBundle(bundle: BackupBundle): Promise<void> {
    this.requireDataFile();
    this.validateBundle(bundle);
    await this.file.automaticBackupCurrent('before-restore');
    await this.file.writeCurrent(bundle);
    this.loadBundle(bundle);
  }

  isFilePickerCancellation(error: unknown): boolean {
    return this.file.isUserCancellation(error);
  }

  async saveCompany(value: CompanyProfile): Promise<void> {
    const previous = this.company();
    const record = { ...value, id: 'company-main', updatedAt: nowIso() };
    this.company.set(record);
    try { await this.persist(); }
    catch (error) { this.company.set(previous); throw error; }
  }

  async saveSettings(value: AppSettings): Promise<void> {
    const previous = this.settings();
    const record = { ...value, id: 'settings-main', updatedAt: nowIso() };
    this.settings.set(record);
    try { await this.persist(); }
    catch (error) { this.settings.set(previous); throw error; }
  }

  saveBuyer = (value: Buyer) => this.saveCollection(this.buyers, value);
  saveProduct = (value: Product) => this.saveCollection(this.products, value);
  saveSupplierPrice = (value: SupplierPrice) => this.saveCollection(this.supplierPrices, value);
  savePackaging = (value: PackagingOption) => this.saveCollection(this.packaging, value);
  saveLogistics = (value: LogisticsRate) => this.saveCollection(this.logistics, value);
  saveAgent = (value: CommissionAgent) => this.saveCollection(this.agents, value);

  deleteBuyer = (id: string) => this.deleteCollection(this.buyers, id);
  deleteProduct = (id: string) => this.deleteCollection(this.products, id);
  deleteSupplierPrice = (id: string) => this.deleteCollection(this.supplierPrices, id);
  deletePackaging = (id: string) => this.deleteCollection(this.packaging, id);
  deleteLogistics = (id: string) => this.deleteCollection(this.logistics, id);
  deleteAgent = (id: string) => this.deleteCollection(this.agents, id);

  async saveQuotation(value: QuotationRecord): Promise<void> {
    const previous = this.quotations();
    const existing = previous.find(item => item.id === value.id);
    if (existing && this.isQuotationLocked(existing)) {
      throw new Error(`Revision ${existing.document.revisionNo} of ${existing.quoteNumber} is Final and locked. Create a new revision instead.`);
    }

    const timestamp = nowIso();
    const shouldLock = value.document.documentStatus === 'Final';
    const record: QuotationRecord = {
      ...value,
      isLocked: shouldLock,
      lockedAt: shouldLock ? (value.lockedAt || timestamp) : undefined,
      revisionRootId: value.revisionRootId || value.revisionOfId || value.id,
      updatedAt: timestamp,
    };

    this.quotations.set([record, ...previous.filter(item => item.id !== record.id)]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    try { await this.persist('quotation-save'); }
    catch (error) { this.quotations.set(previous); throw error; }
  }

  async deleteQuotation(id: string): Promise<void> {
    const quote = this.findQuotation(id);
    if (quote && this.isQuotationLocked(quote)) {
      throw new Error('Final quotations are locked and cannot be deleted. Keep the revision for audit history.');
    }
    const previous = this.quotations();
    this.quotations.set(previous.filter(item => item.id !== id));
    try { await this.persist('quotation-delete'); }
    catch (error) { this.quotations.set(previous); throw error; }
  }

  findQuotation(id: string): QuotationRecord | undefined {
    return this.quotations().find(item => item.id === id);
  }

  isQuotationLocked(quote: QuotationRecord): boolean {
    return quote.isLocked === true || quote.document.documentStatus === 'Final';
  }

  nextRevisionNo(quoteNumber: string): string {
    const revisions = this.quotations()
      .filter(item => item.quoteNumber === quoteNumber)
      .map(item => Number.parseInt(item.document.revisionNo || '0', 10))
      .filter(value => Number.isFinite(value));
    const next = revisions.length ? Math.max(...revisions) + 1 : 1;
    return String(next).padStart(2, '0');
  }

  nextQuoteNumber(_dateValue: string, tradeTerm: string): string {
    if (tradeTerm === 'LOCAL') {
      const numbers = this.quotations()
        .map(q => /^AAF-LQ-(\d+)$/.exec(q.quoteNumber)?.[1])
        .filter((value): value is string => !!value)
        .map(Number);
      const next = numbers.length ? Math.max(...numbers) + 1 : 1001;
      return `AAF-LQ-${next}`;
    }

    const numbers = this.quotations()
      .map(q => /^AAF-EQ-(\d+)$/.exec(q.quoteNumber)?.[1])
      .filter((value): value is string => !!value)
      .map(Number);
    const start = Math.max(1, Number(this.settings().exportQuoteSequenceStart || 1010));
    const next = numbers.length ? Math.max(...numbers) + 1 : start;
    return `AAF-EQ-${next}`;
  }

  async updateQuotationStatus(id: string, status: QuotationRecord['status']): Promise<void> {
    const previous = this.quotations();
    const quote = previous.find(item => item.id === id);
    if (!quote) return;
    const updated = { ...quote, status, updatedAt: nowIso() };
    this.quotations.set([updated, ...previous.filter(item => item.id !== id)]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    try { await this.persist('quotation-status'); }
    catch (error) { this.quotations.set(previous); throw error; }
  }

  exportBundle(): BackupBundle {
    return {
      version: 1,
      exportedAt: nowIso(),
      company: structuredClone(this.company()),
      settings: structuredClone(this.settings()),
      buyers: structuredClone(this.buyers()),
      products: structuredClone(this.products()),
      supplierPrices: structuredClone(this.supplierPrices()),
      packaging: structuredClone(this.packaging()),
      logistics: structuredClone(this.logistics()),
      agents: structuredClone(this.agents()),
      quotations: structuredClone(this.quotations()),
    };
  }

  async resetDemoData(): Promise<void> {
    this.requireDataFile();
    const bundle = this.demoBundle();
    await this.file.automaticBackupCurrent('before-reset');
    await this.file.writeCurrent(bundle);
    this.loadBundle(bundle);
  }

  newRecord<T extends object>(prefix: string, defaults: T): T & { id: string; createdAt: string; updatedAt: string } {
    const timestamp = nowIso();
    return { ...defaults, id: createId(prefix), createdAt: timestamp, updatedAt: timestamp };
  }

  private async saveCollection<T extends { id: string; updatedAt: string }>(
    state: WritableSignal<T[]>,
    value: T,
  ): Promise<void> {
    const previous = state();
    const record = { ...value, updatedAt: nowIso() } as T;
    state.set([...previous.filter(item => item.id !== record.id), record]);
    try { await this.persist(); }
    catch (error) { state.set(previous); throw error; }
  }

  private async deleteCollection<T extends { id: string }>(state: WritableSignal<T[]>, id: string): Promise<void> {
    const previous = state();
    state.set(previous.filter(item => item.id !== id));
    try { await this.persist(); }
    catch (error) { state.set(previous); throw error; }
  }

  private async persist(reason = 'change'): Promise<void> {
    this.requireDataFile();
    await this.file.automaticBackupCurrent(reason);
    await this.file.writeCurrent(this.exportBundle());
  }

  private loadBundle(bundle: BackupBundle): void {
    const company = { ...structuredClone(demoCompany), ...structuredClone(bundle.company) };
    const settings = { ...structuredClone(demoSettings), ...structuredClone(bundle.settings) };
    const products = structuredClone(bundle.products).map(normalizeProduct);
    const packaging = structuredClone(bundle.packaging).map(normalizePackaging);
    const quotations = structuredClone(bundle.quotations).map(item => {
      const product = normalizeProduct(item.snapshots.product);
      const pack = normalizePackaging(item.snapshots.packaging);
      const quoteCompany = { ...structuredClone(demoCompany), ...item.snapshots.company };
      const defaults = createDefaultQuotationDocument(item.input.paymentTerms, item.input.shipmentDays, item.input.tradeTerm);
      const namedPlace = item.input.tradeTerm === 'EXW'
        ? quoteCompany.processingFacility
        : item.input.tradeTerm === 'FCA' || item.input.tradeTerm === 'FOB'
          ? item.snapshots.logistics.portOfLoading
          : item.snapshots.logistics.portOfDischarge;
      const document = {
        ...defaults,
        ...(item.document ?? {}),
        incotermNamedPlace: item.document?.incotermNamedPlace ?? namedPlace,
      };
      const costs = {
        ...item.calculation.costs,
        exwCostUsd: item.calculation.costs.exwCostUsd ?? item.calculation.costs.fobCostUsd,
        fcaCostUsd: item.calculation.costs.fcaCostUsd ?? item.calculation.costs.fobCostUsd,
      };
      const isLocked = item.isLocked ?? document.documentStatus === 'Final';
      return {
        ...item,
        isLocked,
        lockedAt: item.lockedAt ?? (isLocked ? item.updatedAt : undefined),
        revisionRootId: item.revisionRootId || item.revisionOfId || item.id,
        document,
        calculation: { ...item.calculation, costs },
        snapshots: { ...item.snapshots, product, packaging: pack, company: quoteCompany },
      };
    });

    this.company.set(company);
    this.settings.set(settings);
    this.buyers.set(structuredClone(bundle.buyers));
    this.products.set(products);
    this.supplierPrices.set(structuredClone(bundle.supplierPrices));
    this.packaging.set(packaging);
    this.logistics.set(structuredClone(bundle.logistics));
    this.agents.set(structuredClone(bundle.agents));
    this.quotations.set(quotations.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    this.ready.set(true);
  }

  private clearMemory(): void {
    this.ready.set(false);
    this.company.set(structuredClone(demoCompany));
    this.settings.set(structuredClone(demoSettings));
    this.buyers.set([]);
    this.products.set([]);
    this.supplierPrices.set([]);
    this.packaging.set([]);
    this.logistics.set([]);
    this.agents.set([]);
    this.quotations.set([]);
  }

  private demoBundle(): BackupBundle {
    return {
      version: 1,
      exportedAt: nowIso(),
      company: structuredClone(demoCompany),
      settings: structuredClone(demoSettings),
      buyers: structuredClone(demoBuyers),
      products: structuredClone(demoProducts),
      supplierPrices: structuredClone(demoSupplierPrices),
      packaging: structuredClone(demoPackaging),
      logistics: structuredClone(demoLogistics),
      agents: structuredClone(demoAgents),
      quotations: [],
    };
  }

  private validateBundle(bundle: BackupBundle): void {
    if (bundle.version !== 1) throw new Error('Unsupported Avena data-file version.');
    const requiredArrays = [bundle.buyers, bundle.products, bundle.supplierPrices, bundle.packaging, bundle.logistics, bundle.agents, bundle.quotations];
    if (!bundle.company || !bundle.settings || requiredArrays.some(value => !Array.isArray(value))) {
      throw new Error('The selected JSON file is missing required Avena data.');
    }
  }

  private requireDataFile(): void {
    if (!this.dataFileConnected()) throw new Error('Open or create an Avena data file first.');
  }
}
