import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  Buyer, CommissionAgent, LogisticsRate, PackagingOption, Product, SupplierPrice,
} from '../../core/models/domain.models';
import { AppStoreService } from '../../core/services/app-store.service';
import { todayIso } from '../../shared/utils/ids';

@Component({
  imports: [FormsModule],
  templateUrl: './master-data.page.html',
  styleUrl: './master-data.page.scss',
})
export class MasterDataPage {
  readonly store = inject(AppStoreService);
  readonly active = signal<'products'|'suppliers'|'packaging'|'logistics'|'agents'|'buyers'>('products');
  readonly message = signal('');

  setTab(value: 'products'|'suppliers'|'packaging'|'logistics'|'agents'|'buyers'): void { this.active.set(value); this.message.set(''); }
  productName(id: string): string { const p = this.store.products().find(item => item.id === id); return p ? `${p.code} — ${p.variety}` : 'Unknown product'; }

  async addProduct(): Promise<void> {
    const item = this.store.newRecord<Product>('product', {
      code: 'NEW', commodity: 'Rice', variety: '', process: '', brokenPercent: 0, aglMm: 0,
      moistureMaxPercent: 14, yellowGrainsMaxPercent: 0, damagedDiscolouredMaxPercent: 0,
      paddyGrainsPercent: 0, chalkyGrainsMaxPercent: 0, foreignMatterPercent: 0,
      otherVarietiesAdmixtureMaxPercent: 0, sortexStatus: 'Color Sorted', millingDegreePolish: 'Double Polished',
      samplingBasis: 'As per buyer’s requirement', gmoStatus: 'Non GMO - subject to certification if required',
      referenceSample: 'N/A', cropYear: '', hsCode: '10063010', origin: 'Pakistan', notes: '',
      id: '', createdAt: '', updatedAt: '',
    });
    await this.store.saveProduct(item);
  }

  async addSupplier(): Promise<void> {
    const item = this.store.newRecord<SupplierPrice>('supplier', {
      supplierName: '', productId: this.store.products()[0]?.id ?? '', ricePricePkrPerMt: 0,
      processingPkrPerMt: 0, otherPkrPerMt: 0, validFrom: todayIso(), validTo: todayIso(), stockMt: 0, notes: '',
      id: '', createdAt: '', updatedAt: '',
    });
    await this.store.saveSupplierPrice(item);
  }

  async addPackaging(): Promise<void> {
    const item = this.store.newRecord<PackagingOption>('pack', {
      code: 'NEW-PACK', description: '', bagType: 'BOPP laminated bags', retailBagKg: 1,
      bagsPerCarton: 1, cartonNetKg: 1, approxGrossWeightKg: 1, printing: 'Buyer private-label',
      artworkReference: 'N/A', artworkApproval: 'Required in writing before production', closure: 'Machine stitched',
      palletization: "Cargo palletized on the floor of 20’ FCL container", cylinderPlateCharges: 'After the approval of design',
      specialPackingNotes: 'As per buyer’s requirement', packingCostBasis: 'Included only as stated in the final price except cylinder charges',
      bagRatePkr: 0, cartonRatePkr: 0, bagTareGrams: 0, cartonTareKg: 0,
      lengthCm: 0, widthCm: 0, heightCm: 0, supplier: '', validTo: todayIso(),
      id: '', createdAt: '', updatedAt: '',
    });
    await this.store.savePackaging(item);
  }

  async addLogistics(): Promise<void> {
    const item = this.store.newRecord<LogisticsRate>('lane', {
      laneCode: 'NEW-LANE', portOfLoading: 'Qasim Port / Karachi, Pakistan', portOfDischarge: '', country: '',
      containerType: "20' Dry FCL", originCharges: {
        inlandTransportPkr: 0, containerPositioningPkr: 0, stuffingPkr: 0, customsDocsPkr: 0,
        portTerminalPkr: 0, vgmPkr: 0, sealPkr: 0, certificatesPkr: 0, inspectionPkr: 0, additionalPkr: 0,
      }, oceanFreightUsd: 0, freightSurchargeUsd: 0, fixedInsuranceUsd: 0, insurancePercentOfCfr: 0.3,
      shippingLine: '', forwarder: '', transitDays: 0, freeDays: 0, validTo: todayIso(),
      id: '', createdAt: '', updatedAt: '',
    });
    await this.store.saveLogistics(item);
  }

  async addAgent(): Promise<void> {
    const item = this.store.newRecord<CommissionAgent>('agent', {
      code: 'NEW', name: '', method: 'none', rate: 0, territory: '', paymentTiming: 'After buyer payment', notes: '',
      id: '', createdAt: '', updatedAt: '',
    });
    await this.store.saveAgent(item);
  }

  async addBuyer(): Promise<void> {
    const item = this.store.newRecord<Buyer>('buyer', {
      companyName: '', contactPerson: '', country: '', city: '', email: '', phone: '', address: '', notes: '',
      id: '', createdAt: '', updatedAt: '',
    });
    await this.store.saveBuyer(item);
  }

  async saved(action: Promise<void>): Promise<void> {
    await action;
    this.message.set('Saved successfully.');
    setTimeout(() => this.message.set(''), 1800);
  }

  async remove(kind: 'product'|'supplier'|'packaging'|'logistics'|'agent'|'buyer', id: string): Promise<void> {
    if (!confirm('Delete this record?')) return;
    if (kind === 'product') await this.store.deleteProduct(id);
    else if (kind === 'supplier') await this.store.deleteSupplierPrice(id);
    else if (kind === 'packaging') await this.store.deletePackaging(id);
    else if (kind === 'logistics') await this.store.deleteLogistics(id);
    else if (kind === 'agent') await this.store.deleteAgent(id);
    else await this.store.deleteBuyer(id);
  }
}
