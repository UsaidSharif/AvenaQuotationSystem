import { describe, expect, it } from 'vitest';
import { QuotationInput, QuotationRecord } from '../models/domain.models';
import { createDefaultQuotationDocument } from '../data/quotation-document.defaults';
import {
  demoAgents,
  demoBuyers,
  demoCompany,
  demoLogistics,
  demoPackaging,
  demoProducts,
  demoSettings,
  demoSupplierPrices,
} from '../data/demo-data';
import { QuotationCalculatorService } from './quotation-calculator.service';
import { QuotationValidationService } from './quotation-validation.service';

function validRecord(): QuotationRecord {
  const product = structuredClone(demoProducts[0]);
  const supplier = { ...structuredClone(demoSupplierPrices[0]), ricePricePkrPerMt: 150_000, processingPkrPerMt: 10_000 };
  const packaging = structuredClone(demoPackaging[0]);
  const logistics = { ...structuredClone(demoLogistics[1]), oceanFreightUsd: 1_100, shippingLine: 'Test Line' };
  const agent = structuredClone(demoAgents[0]);
  const buyer = {
    ...structuredClone(demoBuyers[0]),
    address: '1 Buyer Street', city: 'Doha', country: 'Qatar',
    email: 'buyer@example.com', phone: '+974 5555 0000',
  };
  const input: QuotationInput = {
    quoteDate: '2026-08-12', validityDays: 7, buyerId: buyer.id,
    tradeTerm: 'CFR', scenario: 'Target', quoteCurrency: 'USD',
    productId: product.id, supplierPriceId: supplier.id, packagingId: packaging.id,
    logisticsId: logistics.id, containerType: "20' Dry FCL", containers: 1, netMtPerContainer: 10,
    paymentTerms: '100% Advance TT', paymentMethod: 'advance-tt', advancePercent: 100, balancePercent: 0,
    paymentTenorDays: 0, paymentTrigger: 'Before production', paymentFinancingAnnualPercent: 0,
    paymentBankChargesUsd: 0, paymentRiskBufferPercent: 0, shipmentDays: 10, agentId: agent.id,
    spotExchangeRate: 285, fxBufferPercent: 2, profitMethod: 'markup', minimumProfitPercent: 3,
    targetProfitPercent: 5, premiumProfitPercent: 8, contingencyPercent: 1, bankCostPercent: 0.5,
    priceRoundingUsdPerMt: 1, buyerTargetUsdPerMt: 0,
  };
  const document = createDefaultQuotationDocument(input.paymentTerms, input.shipmentDays, input.tradeTerm, input.paymentMethod);
  Object.assign(document, {
    incotermNamedPlace: logistics.portOfDischarge,
    shipmentPlan: '1 x 20 ft FCL',
    proformaInvoiceStatus: 'Final', salesContractStatus: 'Final', commercialInvoiceStatus: 'Final', packingListStatus: 'Final',
    proformaInvoiceDate: input.quoteDate, salesContractDate: input.quoteDate,
    commercialInvoiceDate: input.quoteDate, packingListDate: input.quoteDate,
    purchaseOrderRef: 'PO-100', billOfLadingNumber: 'BL-100', vesselName: 'MV Test', voyageNumber: 'V-1',
    containerNumbers: 'ABCD1234567', sealNumber: 'SEAL-1', verifiedGrossMassKg: 10_700,
    stuffingDate: '2026-08-14', etd: '2026-08-15', eta: '2026-08-25',
  });
  const calculation = new QuotationCalculatorService().calculate(input, {
    product, supplier, packaging, logistics, agent, settings: structuredClone(demoSettings),
  });

  return {
    id: 'quote-1', createdAt: '2026-08-12T00:00:00.000Z', updatedAt: '2026-08-12T00:00:00.000Z',
    quoteNumber: 'AAF-EQ-2026-1010', status: 'Accepted', input, document, calculation,
    snapshots: { buyer, product, supplier, packaging, logistics, agent, company: structuredClone(demoCompany) },
    notes: '',
  };
}

describe('QuotationValidationService document modes', () => {
  const validator = new QuotationValidationService();

  it.each(['sales-contract', 'commercial-invoice', 'packing-list'] as const)(
    'accepts a complete final %s',
    type => expect(validator.errors(validRecord(), type)).toEqual([]),
  );

  it('requires the buyer address on a final Commercial Invoice', () => {
    const record = validRecord();
    record.snapshots.buyer.address = '';
    expect(validator.errors(record, 'commercial-invoice').map(issue => issue.code)).toContain('buyer-address');
  });

  it('treats missing FCL container and seal references as blocking only on a final Packing List', () => {
    const record = validRecord();
    record.document.containerNumbers = '';
    record.document.sealNumber = '';

    expect(validator.errors(record, 'packing-list').map(issue => issue.code)).toEqual(expect.arrayContaining(['container-numbers', 'seal-number']));
    expect(validator.errors(record, 'commercial-invoice').map(issue => issue.code)).not.toContain('container-numbers');
    expect(validator.warnings(record, 'commercial-invoice').map(issue => issue.code)).toContain('container-numbers');
  });

  it('checks package count and gross weight without requiring commercial values on a Packing List', () => {
    const record = validRecord();
    record.calculation.quotedPriceUsdPerMt = 0;
    record.calculation.invoiceTotalUsd = 0;
    record.input.paymentTerms = '';

    const codes = validator.errors(record, 'packing-list').map(issue => issue.code);
    expect(codes).not.toContain('selling-price');
    expect(codes).not.toContain('invoice-total');
    expect(codes).not.toContain('payment-terms');
  });

  it('warns when a generated document is still Draft', () => {
    const record = validRecord();
    record.document.salesContractStatus = 'Draft';
    expect(validator.warnings(record, 'sales-contract').map(issue => issue.code)).toContain('sales-contract-draft-status');
  });

  it('requires all Sales Contract term sections', () => {
    const record = validRecord();
    record.document.commercialConditions = '';
    record.document.qualityPackingInspectionTerms = '';
    expect(validator.errors(record, 'sales-contract').map(issue => issue.code)).toEqual(expect.arrayContaining(['commercial-terms', 'quality-terms']));
  });

  it('blocks invalid payment splits, commission rates, and future supplier prices', () => {
    const record = validRecord();
    record.input.advancePercent = 60;
    record.input.balancePercent = 30;
    record.input.quoteDate = '2026-01-15';
    record.snapshots.supplier.validFrom = '2026-02-01';
    record.snapshots.agent.method = 'invoice-percent';
    record.snapshots.agent.rate = 100;

    const codes = validator.errors(record).map(issue => issue.code);

    expect(codes).toEqual(expect.arrayContaining(['payment-split', 'commission-rate', 'supplier-not-yet-valid']));
  });
});
