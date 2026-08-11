import {
  AppSettings,
  Buyer,
  CommissionAgent,
  CompanyProfile,
  LogisticsRate,
  PackagingOption,
  Product,
  SupplierPrice,
} from '../models/domain.models';

const createdAt = '2026-08-06T00:00:00.000Z';
const validTo = '2026-12-31';

export const demoCompany: CompanyProfile = {
  id: 'company-main', createdAt, updatedAt: createdAt,
  legalName: 'AVENA AGRO FOODS (PRIVATE) LIMITED',
  tradingName: 'Avena Agro Foods',
  tagline: 'Cultivating Nutrition. Sustaining Generations.',
  address: 'Al-Saeed Rice Industries, By Pass, Lodhran, Punjab, Pakistan',
  processingFacility: 'Al-Saeed Rice Industries, By Pass, Lodhran, Punjab, Pakistan',
  cityCountry: 'Punjab, Pakistan',
  phone: '+92 344 7178786 / +92 303 0655556',
  email: 'info@avenaagrofoods.com',
  website: 'www.avenaagrofoods.com',
  ntn: 'I595138-4',
  strn: '3277876391447',
  secpRegistration: '', rexId: '', pswId: '', bankName: '', bankBranch: '',
  accountIban: '', swiftCode: '', bankAddress: '',
  authorizedSignatory: 'Muhammad Usaid Sharif',
  authorizedDesignation: 'CEO',
};

export const demoSettings: AppSettings = {
  id: 'settings-main', createdAt, updatedAt: createdAt,
  spotExchangeRate: 285, fxBufferPercent: 2,
  minimumProfitPercent: 3, targetProfitPercent: 5, premiumProfitPercent: 8,
  contingencyPercent: 1, bankCostPercent: 0.5, priceRoundingUsdPerMt: 1,
  defaultValidityDays: 3, defaultShipmentDays: 10,
  defaultNetMt20Ft: 25, defaultNetMt40Ft: 25,
  exportQuoteSequenceStart: 1010,
};

function productDefaults(overrides: Partial<Product> & Pick<Product, 'id'|'code'|'variety'|'process'>): Product {
  return {
    createdAt, updatedAt: createdAt,
    commodity: 'Rice',
    brokenPercent: 0, aglMm: 0, moistureMaxPercent: 14,
    yellowGrainsMaxPercent: 0, damagedDiscolouredMaxPercent: 0, paddyGrainsPercent: 0,
    chalkyGrainsMaxPercent: 0, foreignMatterPercent: 0, otherVarietiesAdmixtureMaxPercent: 0,
    sortexStatus: 'Color Sorted', millingDegreePolish: 'Double Polished',
    samplingBasis: 'As per buyer’s requirement', gmoStatus: 'Non GMO - subject to certification if required',
    referenceSample: 'N/A', cropYear: '2025/2026', hsCode: '10063010', origin: 'Pakistan', notes: '',
    ...overrides,
  };
}

export const demoProducts: Product[] = [
  productDefaults({
    id: 'product-ir64-pb-05', code: 'IR64-PB-05', variety: 'IR64', process: 'Parboiled',
    brokenPercent: 5, aglMm: 6.0, moistureMaxPercent: 14,
    notes: 'Sample specification; confirm with buyer before issuing.',
  }),
  productDefaults({
    id: 'product-1121-white', code: '1121-W-00', variety: '1121 Basmati', process: 'White',
    brokenPercent: 0, aglMm: 8.2, moistureMaxPercent: 14,
  }),
  productDefaults({
    id: 'product-1121-sella', code: '1121-S-00', variety: '1121 Basmati', process: 'Parboiled / Sella',
    brokenPercent: 0, aglMm: 8.2, moistureMaxPercent: 14,
  }),
  productDefaults({
    id: 'product-1509-sella', code: '1509-S-03', variety: '1509 Basmati Parboiled (Sella)', process: 'Parboiled / Sella',
    brokenPercent: 3, aglMm: 8.36, moistureMaxPercent: 12,
    yellowGrainsMaxPercent: 1, damagedDiscolouredMaxPercent: 1, paddyGrainsPercent: 0,
    chalkyGrainsMaxPercent: 1, foreignMatterPercent: 0, otherVarietiesAdmixtureMaxPercent: 1,
    cropYear: '2025/2026', hsCode: '10063010',
  }),
  productDefaults({
    id: 'product-skb-white', code: 'SKB-W-05', variety: 'Super Kernel Basmati', process: 'White',
    brokenPercent: 5, aglMm: 7.2, moistureMaxPercent: 14,
  }),
];

export const demoSupplierPrices: SupplierPrice[] = demoProducts.slice(0, 4).map((product, index) => ({
  id: `supplier-alsa-${index + 1}`, createdAt, updatedAt: createdAt,
  supplierName: 'AL-Saeed Rice Industries', productId: product.id,
  ricePricePkrPerMt: 0, processingPkrPerMt: 0, otherPkrPerMt: 0,
  validFrom: '2026-08-06', validTo, stockMt: 0, notes: 'Enter the latest mill price.',
}));

demoSupplierPrices.push({
  id: 'supplier-other-ir64', createdAt, updatedAt: createdAt,
  supplierName: 'Other Mill', productId: 'product-ir64-pb-05',
  ricePricePkrPerMt: 0, processingPkrPerMt: 0, otherPkrPerMt: 0,
  validFrom: '2026-08-06', validTo, stockMt: 0, notes: 'Rename and update this supplier.',
});

function packagingDefaults(overrides: Partial<PackagingOption> & Pick<PackagingOption, 'id'|'code'|'description'|'retailBagKg'|'bagsPerCarton'|'cartonNetKg'>): PackagingOption {
  return {
    createdAt, updatedAt: createdAt,
    bagType: 'BOPP laminated bags',
    approxGrossWeightKg: overrides.retailBagKg, printing: 'Buyer private-label', artworkReference: 'N/A',
    artworkApproval: 'Required in writing before production', closure: 'Machine stitched',
    palletization: "Cargo palletized on the floor of 20’ FCL container",
    cylinderPlateCharges: 'After the approval of design', specialPackingNotes: 'As per buyer’s requirement',
    packingCostBasis: 'Included only as stated in the final price except cylinder charges',
    bagRatePkr: 0, cartonRatePkr: 0, bagTareGrams: 0, cartonTareKg: 0,
    lengthCm: 0, widthCm: 0, heightCm: 0, supplier: 'Packaging Supplier', validTo,
    ...overrides,
  };
}

export const demoPackaging: PackagingOption[] = [
  packagingDefaults({
    id: 'pack-1kg-carton', code: '1KG-10C', description: '10 × 1 kg retail bags in one 10 kg master carton',
    retailBagKg: 1, bagsPerCarton: 10, cartonNetKg: 10, bagTareGrams: 12, cartonTareKg: 0.45,
    lengthCm: 41, widthCm: 29, heightCm: 11.5,
  }),
  packagingDefaults({
    id: 'pack-5kg', code: '5KG-4B', description: '4 × 5 kg retail bags in one 20 kg bale/carton',
    retailBagKg: 5, bagsPerCarton: 4, cartonNetKg: 20, bagTareGrams: 35, cartonTareKg: 0.35,
    lengthCm: 55, widthCm: 37, heightCm: 20,
  }),
  packagingDefaults({
    id: 'pack-25kg', code: '25KG-BAG', description: 'BOPP Laminated 25 kg bags',
    retailBagKg: 25, bagsPerCarton: 1, cartonNetKg: 25, approxGrossWeightKg: 25,
    bagTareGrams: 90, cartonTareKg: 0, lengthCm: 75, widthCm: 45, heightCm: 15,
  }),
  packagingDefaults({
    id: 'pack-50kg', code: '50KG-BAG', description: 'Single 50 kg bag',
    retailBagKg: 50, bagsPerCarton: 1, cartonNetKg: 50, approxGrossWeightKg: 50,
    bagTareGrams: 130, cartonTareKg: 0, lengthCm: 95, widthCm: 55, heightCm: 18,
  }),
];

const emptyOrigin = {
  inlandTransportPkr: 0, containerPositioningPkr: 0, stuffingPkr: 0,
  customsDocsPkr: 0, portTerminalPkr: 0, vgmPkr: 0, sealPkr: 0,
  certificatesPkr: 0, inspectionPkr: 0, additionalPkr: 0,
};

export const demoLogistics: LogisticsRate[] = [
  {
    id: 'lane-tunisia-20', createdAt, updatedAt: createdAt, laneCode: 'PK-TUN-20',
    portOfLoading: 'Qasim Port / Karachi, Pakistan', portOfDischarge: '[Confirm Port], Tunisia',
    country: 'Tunisia', containerType: "20' Dry FCL", originCharges: {...emptyOrigin},
    oceanFreightUsd: 0, freightSurchargeUsd: 0, fixedInsuranceUsd: 0,
    insurancePercentOfCfr: 0.3, shippingLine: '', forwarder: '', transitDays: 0,
    freeDays: 0, validTo,
  },
  {
    id: 'lane-qatar-20', createdAt, updatedAt: createdAt, laneCode: 'PK-QAT-20',
    portOfLoading: 'Qasim Port / Karachi, Pakistan', portOfDischarge: 'Hamad Port, Qatar',
    country: 'Qatar', containerType: "20' Dry FCL", originCharges: {...emptyOrigin},
    oceanFreightUsd: 0, freightSurchargeUsd: 0, fixedInsuranceUsd: 0,
    insurancePercentOfCfr: 0.3, shippingLine: '', forwarder: '', transitDays: 0,
    freeDays: 0, validTo,
  },
  {
    id: 'lane-local-20', createdAt, updatedAt: createdAt, laneCode: 'LOCAL-PK-20',
    portOfLoading: 'Mill / Warehouse', portOfDischarge: 'Customer Location, Pakistan',
    country: 'Pakistan', containerType: "20' Dry FCL", originCharges: {...emptyOrigin},
    oceanFreightUsd: 0, freightSurchargeUsd: 0, fixedInsuranceUsd: 0,
    insurancePercentOfCfr: 0, shippingLine: 'Local Transport', forwarder: '', transitDays: 0,
    freeDays: 0, validTo,
  },
];

export const demoAgents: CommissionAgent[] = [
  {
    id: 'agent-none', createdAt, updatedAt: createdAt, code: 'NONE', name: 'No Agent',
    method: 'none', rate: 0, territory: '', paymentTiming: '', notes: '',
  },
  {
    id: 'agent-percent', createdAt, updatedAt: createdAt, code: 'AGENT-01', name: 'Commission Agent 1',
    method: 'invoice-percent', rate: 0, territory: '', paymentTiming: 'After buyer payment',
    notes: 'Enter the agreed percentage.',
  },
  {
    id: 'agent-mt', createdAt, updatedAt: createdAt, code: 'AGENT-02', name: 'Commission Agent 2',
    method: 'usd-per-mt', rate: 0, territory: '', paymentTiming: 'After buyer payment',
    notes: 'Enter USD per metric ton.',
  },
];

export const demoBuyers: Buyer[] = [
  {
    id: 'buyer-tunisia-demo', createdAt, updatedAt: createdAt,
    companyName: 'Al Massadai Agro Food', contactPerson: 'Mounir', country: 'Tunisia',
    city: '', email: '', phone: '', address: '', notes: 'Demo buyer from the IR64 inquiry.',
  },
];
