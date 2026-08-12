export type TradeTerm = 'LOCAL' | 'EXW' | 'FCA' | 'FOB' | 'CFR' | 'CNF' | 'CIF' | 'DAP' | 'DDP';
export type QuoteScenario = 'Minimum' | 'Target' | 'Premium';
export type QuoteCurrency = 'USD' | 'PKR';
export type QuoteStatus = 'Draft' | 'Sent' | 'Under Negotiation' | 'Accepted' | 'Rejected' | 'Expired';
export type DocumentStatus = 'Draft' | 'Final';
export type ContainerType = "20' Dry FCL" | "40' Dry FCL" | 'LCL';
export type ProfitMethod = 'margin' | 'markup';
export type CommissionMethod = 'none' | 'invoice-percent' | 'usd-per-mt' | 'fixed-per-container';
export type PaymentMethod = 'advance-tt' | 'tt' | 'lc-at-sight' | 'usance-lc' | 'cad' | 'dp' | 'da' | 'open-account' | 'custom';
export type BrandingType = 'Plain / Generic' | 'Private Label' | 'OEM Packing';
export type OuterPackType = 'Carton' | 'Master Bag' | 'None';
export type VesselService = 'Direct Vessel' | 'Transshipment' | 'To Be Confirmed';
export type PrintableDocumentType = 'quotation' | 'proforma' | 'sales-contract' | 'commercial-invoice' | 'packing-list';

export interface BaseRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyProfile extends BaseRecord {
  legalName: string;
  tradingName: string;
  tagline: string;
  address: string;
  processingFacility: string;
  cityCountry: string;
  phone: string;
  email: string;
  website: string;
  ntn: string;
  strn: string;
  secpRegistration: string;
  rexId: string;
  pswId: string;
  bankName: string;
  bankBranch: string;
  accountIban: string;
  swiftCode: string;
  bankAddress: string;
  authorizedSignatory: string;
  authorizedDesignation: string;
}

export interface AppSettings extends BaseRecord {
  spotExchangeRate: number;
  fxBufferPercent: number;
  minimumProfitPercent: number;
  targetProfitPercent: number;
  premiumProfitPercent: number;
  contingencyPercent: number;
  bankCostPercent: number;
  priceRoundingUsdPerMt: number;
  defaultValidityDays: number;
  defaultShipmentDays: number;
  defaultNetMt20Ft: number;
  defaultNetMt40Ft: number;
  exportQuoteSequenceStart: number;
}

export interface Buyer extends BaseRecord {
  companyName: string;
  contactPerson: string;
  country: string;
  city: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
}

export interface Product extends BaseRecord {
  code: string;
  commodity: string;
  variety: string;
  process: string;
  brokenPercent: number;
  aglMm: number;
  moistureMaxPercent: number;
  yellowGrainsMaxPercent: number;
  damagedDiscolouredMaxPercent: number;
  paddyGrainsPercent: number;
  chalkyGrainsMaxPercent: number;
  foreignMatterPercent: number;
  otherVarietiesAdmixtureMaxPercent: number;
  sortexStatus: string;
  millingDegreePolish: string;
  samplingBasis: string;
  gmoStatus: string;
  referenceSample: string;
  cropYear: string;
  moqMt: number;
  hsCode: string;
  origin: string;
  notes: string;
}

export interface SupplierPrice extends BaseRecord {
  supplierName: string;
  productId: string;
  ricePricePkrPerMt: number;
  processingPkrPerMt: number;
  otherPkrPerMt: number;
  validFrom: string;
  validTo: string;
  stockMt: number;
  notes: string;
}

export interface PackagingOption extends BaseRecord {
  code: string;
  description: string;
  bagType: string;
  brandingType: BrandingType;
  outerPackType: OuterPackType;
  retailBagKg: number;
  bagsPerCarton: number;
  cartonNetKg: number;
  bagsPerMasterBag: number;
  masterBagRatePkr: number;
  masterBagTareKg: number;
  approxGrossWeightKg: number;
  printing: string;
  artworkReference: string;
  artworkApproval: string;
  closure: string;
  palletization: string;
  cylinderPlateCharges: string;
  specialPackingNotes: string;
  packingCostBasis: string;
  bagRatePkr: number;
  cartonRatePkr: number;
  bagTareGrams: number;
  cartonTareKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  supplier: string;
  validTo: string;
}

export interface OriginCharges {
  inlandTransportPkr: number;
  containerPositioningPkr: number;
  stuffingPkr: number;
  customsDocsPkr: number;
  portTerminalPkr: number;
  vgmPkr: number;
  sealPkr: number;
  certificatesPkr: number;
  inspectionPkr: number;
  additionalPkr: number;
}

export interface LogisticsRate extends BaseRecord {
  laneCode: string;
  portOfLoading: string;
  portOfDischarge: string;
  country: string;
  containerType: ContainerType;
  originCharges: OriginCharges;
  oceanFreightUsd: number;
  freightSurchargeUsd: number;
  lclFreightUsdPerCbm: number;
  lclFreightUsdPerMt: number;
  minimumLclFreightUsd: number;
  fixedInsuranceUsd: number;
  insurancePercentOfCfr: number;
  destinationDeliveryUsd: number;
  destinationCustomsClearanceUsd: number;
  destinationDutiesTaxesUsd: number;
  shippingLine: string;
  forwarder: string;
  transitDays: number;
  freeDays: number;
  validTo: string;
}

export interface CommissionAgent extends BaseRecord {
  code: string;
  name: string;
  method: CommissionMethod;
  rate: number;
  territory: string;
  paymentTiming: string;
  notes: string;
}

export interface QuotationInput {
  quoteDate: string;
  validityDays: number;
  buyerId: string;
  tradeTerm: TradeTerm;
  scenario: QuoteScenario;
  quoteCurrency: QuoteCurrency;
  productId: string;
  supplierPriceId: string;
  packagingId: string;
  logisticsId: string;
  containerType: ContainerType;
  containers: number;
  netMtPerContainer: number;
  paymentTerms: string;
  paymentMethod: PaymentMethod;
  advancePercent: number;
  balancePercent: number;
  paymentTenorDays: number;
  paymentTrigger: string;
  paymentFinancingAnnualPercent: number;
  paymentBankChargesUsd: number;
  paymentRiskBufferPercent: number;
  shipmentDays: number;
  agentId: string;
  spotExchangeRate: number;
  fxBufferPercent: number;
  profitMethod: ProfitMethod;
  minimumProfitPercent: number;
  targetProfitPercent: number;
  premiumProfitPercent: number;
  contingencyPercent: number;
  bankCostPercent: number;
  priceRoundingUsdPerMt: number;
  buyerTargetUsdPerMt: number;
}

export interface QuotationDocumentDetails {
  revisionNo: string;
  buyerRfqRef: string;
  documentStatus: DocumentStatus;
  quantityTolerancePercent: number;
  incotermNamedPlace: string;
  priceBasis: string;
  finalInvoiceBasis: string;
  shipmentPlan: string;
  lcOpeningDeadline: string;
  partialShipment: string;
  transshipment: string;
  vesselService: VesselService;
  containerStuffing: string;
  stuffingDate: string;
  sealNumber: string;
  verifiedGrossMassKg: number;
  etd: string;
  eta: string;
  shipmentCommencement: string;
  latestShipmentDateText: string;
  lcExpiryPlace: string;
  presentationPeriod: string;
  lcConfirmation: string;
  confirmationCharges: string;
  bankCharges: string;
  amendmentCharges: string;
  documentDiscrepancyCharges: string;
  draftLcReview: string;
  lcGoverningRules: string;
  freightValidity: string;
  insuranceForCif: string;
  taxesDuties: string;
  specialLegalization: string;
  buyerDocumentaryWording: string;
  finalShipmentInstructions: string;
  standardDocumentsIncluded: string;
  additionalDocuments: string;
  commercialConditions: string;
  qualityPackingInspectionTerms: string;
  shipmentDocumentationTerms: string;
  paymentSecurityTerms: string;
  authenticityAcceptanceTerms: string;
  securityNotice: string;
  buyerAcknowledgement: string;
  proformaInvoiceNumber: string;
  proformaInvoiceDate: string;
  proformaInvoiceStatus: DocumentStatus;
  salesContractNumber: string;
  salesContractDate: string;
  salesContractStatus: DocumentStatus;
  commercialInvoiceNumber: string;
  commercialInvoiceDate: string;
  commercialInvoiceStatus: DocumentStatus;
  packingListNumber: string;
  packingListDate: string;
  packingListStatus: DocumentStatus;
  purchaseOrderRef: string;
  billOfLadingNumber: string;
  vesselName: string;
  voyageNumber: string;
  containerNumbers: string;
  consigneeDetails: string;
  notifyParty: string;
}

export interface LoadingResult {
  totalNetMt: number;
  totalNetKg: number;
  totalBags: number;
  totalCartons: number;
  totalMasterBags: number;
  totalPackagingTareKg: number;
  grossCargoPerContainerKg: number;
  cargoVolumePerContainerCbm: number;
  payloadLimitKg: number;
  usableVolumeCbm: number;
  recommendedMaxCartons: number;
  recommendedMaxNetMt: number;
  weightUtilizationPercent: number;
  volumeUtilizationPercent: number;
  withinLimits: boolean;
}

export interface CostBreakdown {
  productAndProcessingPkr: number;
  packagingPkr: number;
  originChargesPkr: number;
  localChargesPkr: number;
  directFobUsd: number;
  contingencyUsd: number;
  bankCostUsd: number;
  exwCostUsd: number;
  fcaCostUsd: number;
  fobCostUsd: number;
  freightUsd: number;
  cfrCostUsd: number;
  fixedInsuranceUsd: number;
  variableInsuranceUsd: number;
  cifCostUsd: number;
  destinationDeliveryUsd: number;
  destinationCustomsClearanceUsd: number;
  destinationDutiesTaxesUsd: number;
  dapCostUsd: number;
  ddpCostUsd: number;
  paymentFinancingUsd: number;
  paymentBankChargesUsd: number;
  paymentRiskBufferUsd: number;
  paymentCostsUsd: number;
  selectedTermCostUsd: number;
}

export interface QuoteCalculation {
  quotationFxRate: number;
  selectedProfitPercent: number;
  loading: LoadingResult;
  costs: CostBreakdown;
  quotedPriceUsdPerMt: number;
  invoiceTotalUsd: number;
  commissionUsd: number;
  netProfitUsd: number;
  actualGrossMarginPercent: number;
  breakEvenUsdPerMt: number;
  buyerTargetDifferenceUsdPerMt: number;
  warnings: string[];
}

export interface QuotationSnapshots {
  buyer: Buyer;
  product: Product;
  supplier: SupplierPrice;
  packaging: PackagingOption;
  logistics: LogisticsRate;
  agent: CommissionAgent;
  company: CompanyProfile;
}

export interface QuotationRecord extends BaseRecord {
  quoteNumber: string;
  status: QuoteStatus;
  isLocked?: boolean;
  lockedAt?: string;
  revisionOfId?: string;
  revisionRootId?: string;
  input: QuotationInput;
  document: QuotationDocumentDetails;
  calculation: QuoteCalculation;
  snapshots: QuotationSnapshots;
  notes: string;
}

export interface BackupBundle {
  version: 1;
  exportedAt: string;
  company: CompanyProfile;
  settings: AppSettings;
  buyers: Buyer[];
  products: Product[];
  supplierPrices: SupplierPrice[];
  packaging: PackagingOption[];
  logistics: LogisticsRate[];
  agents: CommissionAgent[];
  quotations: QuotationRecord[];
}
