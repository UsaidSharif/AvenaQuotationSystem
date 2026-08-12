import { describe, expect, it } from 'vitest';
import {
  AppSettings,
  CommissionAgent,
  LogisticsRate,
  PackagingOption,
  Product,
  QuotationInput,
  SupplierPrice,
  TradeTerm,
} from '../models/domain.models';
import { QuotationCalculatorService } from './quotation-calculator.service';

type CalculationLookups = Parameters<QuotationCalculatorService['calculate']>[1];

const recordDates = {
  id: 'fixture',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function input(overrides: Partial<QuotationInput> = {}): QuotationInput {
  return {
    quoteDate: '2026-01-15',
    validityDays: 7,
    buyerId: 'buyer-1',
    tradeTerm: 'FOB',
    scenario: 'Target',
    quoteCurrency: 'USD',
    productId: 'product-1',
    supplierPriceId: 'supplier-1',
    packagingId: 'packaging-1',
    logisticsId: 'logistics-1',
    containerType: "20' Dry FCL",
    containers: 2,
    netMtPerContainer: 10,
    paymentTerms: '100% Advance',
    shipmentDays: 10,
    agentId: 'agent-none',
    spotExchangeRate: 300,
    fxBufferPercent: 5,
    profitMethod: 'markup',
    minimumProfitPercent: 5,
    targetProfitPercent: 10,
    premiumProfitPercent: 20,
    contingencyPercent: 2,
    bankCostPercent: 1,
    priceRoundingUsdPerMt: 0.01,
    buyerTargetUsdPerMt: 0,
    ...overrides,
  };
}

function lookups(): CalculationLookups {
  const product: Product = {
    ...recordDates,
    id: 'product-1',
    code: 'RICE',
    commodity: 'Rice',
    variety: '1121 Basmati',
    process: 'Steam',
    brokenPercent: 2,
    aglMm: 8.2,
    moistureMaxPercent: 12,
    yellowGrainsMaxPercent: 0,
    damagedDiscolouredMaxPercent: 0,
    paddyGrainsPercent: 0,
    chalkyGrainsMaxPercent: 0,
    foreignMatterPercent: 0,
    otherVarietiesAdmixtureMaxPercent: 0,
    sortexStatus: 'Sortexed',
    millingDegreePolish: 'Double polished',
    samplingBasis: 'Agreed sample',
    gmoStatus: 'Non-GMO',
    referenceSample: 'REF-1',
    cropYear: '2025/26',
    hsCode: '1006',
    origin: 'Pakistan',
    notes: '',
  };

  const supplier: SupplierPrice = {
    ...recordDates,
    id: 'supplier-1',
    supplierName: 'Test Mill',
    productId: product.id,
    ricePricePkrPerMt: 100_000,
    processingPkrPerMt: 10_000,
    otherPkrPerMt: 5_000,
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
    stockMt: 1_000,
    notes: '',
  };

  const packaging: PackagingOption = {
    ...recordDates,
    id: 'packaging-1',
    code: '10KG-X2',
    description: '2 x 10 kg carton',
    bagType: 'Bag',
    retailBagKg: 10,
    bagsPerCarton: 2,
    cartonNetKg: 20,
    approxGrossWeightKg: 21.2,
    printing: 'Printed',
    artworkReference: 'ART-1',
    artworkApproval: 'Approved',
    closure: 'Sealed',
    palletization: 'None',
    cylinderPlateCharges: 'Included',
    specialPackingNotes: '',
    packingCostBasis: 'Per unit',
    bagRatePkr: 10,
    cartonRatePkr: 100,
    bagTareGrams: 100,
    cartonTareKg: 1,
    lengthCm: 50,
    widthCm: 40,
    heightCm: 20,
    supplier: 'Test Packaging',
    validTo: '2026-12-31',
  };

  const logistics: LogisticsRate = {
    ...recordDates,
    id: 'logistics-1',
    laneCode: 'PK-TEST-20',
    portOfLoading: 'Port Qasim, Pakistan',
    portOfDischarge: 'Hamad Port, Qatar',
    country: 'Qatar',
    containerType: "20' Dry FCL",
    originCharges: {
      inlandTransportPkr: 50_000,
      containerPositioningPkr: 10_000,
      stuffingPkr: 20_000,
      customsDocsPkr: 15_000,
      portTerminalPkr: 30_000,
      vgmPkr: 5_000,
      sealPkr: 2_000,
      certificatesPkr: 8_000,
      inspectionPkr: 10_000,
      additionalPkr: 5_000,
    },
    oceanFreightUsd: 1_000,
    freightSurchargeUsd: 100,
    fixedInsuranceUsd: 50,
    insurancePercentOfCfr: 1,
    shippingLine: 'Test Line',
    forwarder: 'Test Forwarder',
    transitDays: 10,
    freeDays: 7,
    validTo: '2026-12-31',
  };

  const agent: CommissionAgent = {
    ...recordDates,
    id: 'agent-none',
    code: 'NONE',
    name: 'No agent',
    method: 'none',
    rate: 0,
    territory: '',
    paymentTiming: '',
    notes: '',
  };

  const settings: AppSettings = {
    ...recordDates,
    id: 'settings-main',
    spotExchangeRate: 300,
    fxBufferPercent: 5,
    minimumProfitPercent: 5,
    targetProfitPercent: 10,
    premiumProfitPercent: 20,
    contingencyPercent: 2,
    bankCostPercent: 1,
    priceRoundingUsdPerMt: 0.01,
    defaultValidityDays: 7,
    defaultShipmentDays: 10,
    defaultNetMt20Ft: 10,
    defaultNetMt40Ft: 20,
    exportQuoteSequenceStart: 1010,
  };

  return { product, supplier, packaging, logistics, agent, settings };
}

function zeroOriginCharges(data: CalculationLookups): void {
  for (const key of Object.keys(data.logistics.originCharges) as Array<keyof typeof data.logistics.originCharges>) {
    data.logistics.originCharges[key] = 0;
  }
}

function numericLeaves(value: unknown): number[] {
  if (typeof value === 'number') return [value];
  if (!value || typeof value !== 'object') return [];
  return Object.values(value).flatMap(numericLeaves);
}

describe('QuotationCalculatorService', () => {
  const calculator = new QuotationCalculatorService();

  describe('base cost and loading calculations', () => {
    it('calculates quantities, packaging, origin costs, and utilization from independent units', () => {
      const result = calculator.calculate(input(), lookups());

      expect(result.quotationFxRate).toBe(285);
      expect(result.loading.totalNetMt).toBe(20);
      expect(result.loading.totalNetKg).toBe(20_000);
      expect(result.loading.totalBags).toBe(2_000);
      expect(result.loading.totalCartons).toBe(1_000);
      expect(result.loading.totalPackagingTareKg).toBe(1_200);
      expect(result.loading.grossCargoPerContainerKg).toBe(10_600);
      expect(result.loading.cargoVolumePerContainerCbm).toBe(20);
      expect(result.loading.weightUtilizationPercent).toBeCloseTo(37.857_142_857, 8);
      expect(result.loading.volumeUtilizationPercent).toBeCloseTo(67.340_067_34, 8);
      expect(result.loading.withinLimits).toBe(true);

      expect(result.costs.productAndProcessingPkr).toBe(2_300_000);
      expect(result.costs.packagingPkr).toBe(120_000);
      expect(result.costs.originChargesPkr).toBe(310_000);
      expect(result.costs.directFobUsd).toBeCloseTo(9_578.947_368, 6);
      expect(result.costs.contingencyUsd).toBeCloseTo(191.578_947, 6);
      expect(result.costs.bankCostUsd).toBeCloseTo(95.789_474, 6);
    });

    it('uses the lower 40-foot payload and higher volume planning limits', () => {
      const result = calculator.calculate(
        input({ containerType: "40' Dry FCL" }),
        { ...lookups(), logistics: { ...lookups().logistics, containerType: "40' Dry FCL" } },
      );

      expect(result.loading.payloadLimitKg).toBe(26_500);
      expect(result.loading.usableVolumeCbm).toBe(60.3);
      expect(result.loading.recommendedMaxCartons).toBeGreaterThan(0);
    });
  });

  describe('trade terms', () => {
    it.each([
      ['EXW', 8_745.964_912],
      ['FCA', 9_649.473_684],
      ['FOB', 9_866.315_789],
      ['CFR', 12_066.315_789],
      ['CIF', 12_286.978_947],
    ] satisfies Array<[TradeTerm, number]>)('selects the correct %s cost stack', (tradeTerm, expectedCost) => {
      const result = calculator.calculate(input({ tradeTerm }), lookups());
      expect(result.costs.selectedTermCostUsd).toBeCloseTo(expectedCost, 6);
    });

    it('calculates LOCAL pricing without freight or export-origin charges on a local lane', () => {
      const data = lookups();
      zeroOriginCharges(data);
      data.logistics.oceanFreightUsd = 0;
      data.logistics.freightSurchargeUsd = 0;
      data.logistics.fixedInsuranceUsd = 0;
      data.logistics.insurancePercentOfCfr = 0;

      const result = calculator.calculate(input({ tradeTerm: 'LOCAL', quoteCurrency: 'PKR' }), data);

      expect(result.costs.selectedTermCostUsd).toBeCloseTo(result.costs.exwCostUsd, 10);
      expect(result.costs.freightUsd).toBe(0);
      expect(result.costs.fixedInsuranceUsd).toBe(0);
      expect(result.warnings).not.toContain('Ocean freight is zero for a CFR/CIF quotation.');
    });
  });

  describe('profit scenarios, methods, and rounding', () => {
    it('applies markup to cost and margin to sales as different formulas', () => {
      const markup = calculator.calculate(input({ profitMethod: 'markup' }), lookups());
      const margin = calculator.calculate(input({ profitMethod: 'margin' }), lookups());

      expect(markup.quotedPriceUsdPerMt).toBeCloseTo(542.65, 8);
      expect(margin.quotedPriceUsdPerMt).toBeCloseTo(548.13, 8);
      expect(margin.quotedPriceUsdPerMt).toBeGreaterThan(markup.quotedPriceUsdPerMt);
      expect(markup.actualGrossMarginPercent).toBeCloseTo(9.091_346, 5);
      expect(margin.actualGrossMarginPercent).toBeCloseTo(10, 3);
    });

    it.each([
      ['Minimum', 5],
      ['Target', 10],
      ['Premium', 20],
    ] as const)('uses the %s scenario percentage', (scenario, expectedPercent) => {
      const result = calculator.calculate(input({ scenario }), lookups());
      expect(result.selectedProfitPercent).toBe(expectedPercent);
    });

    it('rounds the per-MT selling price to the configured increment', () => {
      const result = calculator.calculate(input({ priceRoundingUsdPerMt: 25 }), lookups());
      expect(result.quotedPriceUsdPerMt % 25).toBe(0);
      expect(result.invoiceTotalUsd).toBe(result.quotedPriceUsdPerMt * result.loading.totalNetMt);
    });

    it('falls back to a one-dollar increment when rounding is zero', () => {
      const result = calculator.calculate(input({ priceRoundingUsdPerMt: 0 }), lookups());
      expect(Number.isInteger(result.quotedPriceUsdPerMt)).toBe(true);
    });
  });

  describe('commission and break-even calculations', () => {
    it('supports no commission', () => {
      const result = calculator.calculate(input({ profitMethod: 'margin' }), lookups());
      expect(result.commissionUsd).toBe(0);
      expect(result.breakEvenUsdPerMt).toBeCloseTo(493.315_789, 6);
    });

    it('supports commission as a percentage of the final invoice', () => {
      const data = lookups();
      data.agent.method = 'invoice-percent';
      data.agent.rate = 5;
      const result = calculator.calculate(input({ profitMethod: 'margin' }), data);

      expect(result.commissionUsd).toBeCloseTo(result.invoiceTotalUsd * 0.05, 10);
      expect(result.breakEvenUsdPerMt).toBeCloseTo(519.279_778, 6);
      expect(result.actualGrossMarginPercent).toBeCloseTo(10, 2);
    });

    it('supports commission in USD per metric ton', () => {
      const data = lookups();
      data.agent.method = 'usd-per-mt';
      data.agent.rate = 5;
      const result = calculator.calculate(input({ profitMethod: 'margin' }), data);

      expect(result.commissionUsd).toBe(100);
      expect(result.breakEvenUsdPerMt).toBeCloseTo(498.315_789, 6);
    });

    it('supports fixed commission per container', () => {
      const data = lookups();
      data.agent.method = 'fixed-per-container';
      data.agent.rate = 75;
      const result = calculator.calculate(input({ profitMethod: 'markup' }), data);

      expect(result.commissionUsd).toBe(150);
      expect(result.breakEvenUsdPerMt).toBeCloseTo(500.815_789, 6);
    });

    it('warns and remains finite when margin plus invoice commission is extreme', () => {
      const data = lookups();
      data.agent.method = 'invoice-percent';
      data.agent.rate = 5;
      const result = calculator.calculate(input({ profitMethod: 'margin', targetProfitPercent: 94 }), data);

      expect(result.warnings).toContain('Profit margin plus commission is too high to calculate safely.');
      expect(numericLeaves(result).every(Number.isFinite)).toBe(true);
    });
  });

  describe('FX, freight, and insurance', () => {
    it('reduces the spot FX rate by the safety buffer and raises the USD cost', () => {
      const buffered = calculator.calculate(input({ fxBufferPercent: 5 }), lookups());
      const unbuffered = calculator.calculate(input({ fxBufferPercent: 0 }), lookups());

      expect(buffered.quotationFxRate).toBe(285);
      expect(unbuffered.quotationFxRate).toBe(300);
      expect(buffered.costs.fobCostUsd).toBeGreaterThan(unbuffered.costs.fobCostUsd);
    });

    it('adds ocean freight and surcharge once per container for CFR', () => {
      const result = calculator.calculate(input({ tradeTerm: 'CFR' }), lookups());
      expect(result.costs.freightUsd).toBe(2_200);
      expect(result.costs.cfrCostUsd - result.costs.fobCostUsd).toBeCloseTo(2_200, 10);
    });

    it('adds fixed and CFR-percentage insurance for CIF', () => {
      const result = calculator.calculate(input({ tradeTerm: 'CIF' }), lookups());
      expect(result.costs.fixedInsuranceUsd).toBe(100);
      expect(result.costs.variableInsuranceUsd).toBeCloseTo(result.costs.cfrCostUsd * 0.01, 10);
      expect(result.costs.cifCostUsd).toBeCloseTo(
        result.costs.cfrCostUsd + result.costs.fixedInsuranceUsd + result.costs.variableInsuranceUsd,
        10,
      );
    });

    it('warns when required freight and insurance are zero', () => {
      const data = lookups();
      data.logistics.oceanFreightUsd = 0;
      data.logistics.freightSurchargeUsd = 0;
      data.logistics.fixedInsuranceUsd = 0;
      data.logistics.insurancePercentOfCfr = 0;
      const result = calculator.calculate(input({ tradeTerm: 'CIF' }), data);

      expect(result.warnings).toContain('Ocean freight is zero for a CFR/CIF quotation.');
      expect(result.warnings).toContain('Insurance is zero for a CIF quotation.');
    });
  });

  describe('container limits', () => {
    it('detects a payload breach independently of volume', () => {
      const data = lookups();
      data.packaging.lengthCm = 1;
      data.packaging.widthCm = 1;
      data.packaging.heightCm = 1;
      const result = calculator.calculate(input({ netMtPerContainer: 28 }), data);

      expect(result.loading.weightUtilizationPercent).toBeGreaterThan(100);
      expect(result.loading.volumeUtilizationPercent).toBeLessThan(100);
      expect(result.loading.withinLimits).toBe(false);
      expect(result.warnings).toContain('Gross cargo exceeds the planning payload.');
    });

    it('detects a volume breach independently of payload', () => {
      const data = lookups();
      data.packaging.lengthCm = 100;
      data.packaging.widthCm = 100;
      data.packaging.heightCm = 100;
      const result = calculator.calculate(input(), data);

      expect(result.loading.weightUtilizationPercent).toBeLessThan(100);
      expect(result.loading.volumeUtilizationPercent).toBeGreaterThan(100);
      expect(result.loading.withinLimits).toBe(false);
      expect(result.warnings).toContain('Carton volume exceeds the usable container volume.');
    });
  });

  describe('break-even and warnings', () => {
    it('reports the buyer-target difference and warns below break-even', () => {
      const result = calculator.calculate(input({ buyerTargetUsdPerMt: 450 }), lookups());
      expect(result.buyerTargetDifferenceUsdPerMt).toBeCloseTo(450 - result.quotedPriceUsdPerMt, 10);
      expect(result.warnings).toContain('Buyer target price is below break-even.');
    });

    it('warns about expired rates, placeholder ports, FCA review, and container mismatches', () => {
      const data = lookups();
      data.supplier.validTo = '2026-01-14';
      data.packaging.validTo = '2026-01-14';
      data.logistics.validTo = '2026-01-14';
      data.logistics.portOfDischarge = '[Confirm exact port]';
      data.logistics.containerType = "40' Dry FCL";

      const cfr = calculator.calculate(input({ tradeTerm: 'CFR' }), data);
      const fca = calculator.calculate(input({ tradeTerm: 'FCA' }), data);

      expect(cfr.warnings).toEqual(expect.arrayContaining([
        'Confirm the exact destination port before issuing the quotation.',
        'Selected logistics rate is for a different container type.',
        'Supplier price validity has expired.',
        'Packaging price validity has expired.',
        'Logistics rate validity has expired.',
      ]));
      expect(fca.warnings).toContain('For FCA, confirm the exact named place and review which origin charges are included.');
    });
  });

  describe('defensive numeric inputs', () => {
    it('returns a zero, finite calculation for zero quantity', () => {
      const result = calculator.calculate(input({ containers: 0, netMtPerContainer: 0 }), lookups());

      expect(result.loading.totalNetMt).toBe(0);
      expect(result.invoiceTotalUsd).toBe(0);
      expect(result.quotedPriceUsdPerMt).toBe(0);
      expect(result.breakEvenUsdPerMt).toBe(0);
      expect(numericLeaves(result).every(Number.isFinite)).toBe(true);
    });

    it('normalizes negative quantities and costs instead of producing negative financial costs', () => {
      const data = lookups();
      data.supplier.ricePricePkrPerMt = -100_000;
      data.packaging.bagRatePkr = -10;
      data.logistics.oceanFreightUsd = -1_000;
      data.agent.rate = -5;
      const result = calculator.calculate(
        input({ containers: -2, netMtPerContainer: -10, contingencyPercent: -2 }),
        data,
      );

      expect(result.loading.totalNetMt).toBe(0);
      expect(result.invoiceTotalUsd).toBe(0);
      expect(numericLeaves(result.costs).every(value => value >= 0 && Number.isFinite(value))).toBe(true);
      expect(result.warnings.some(warning => warning.includes('cannot be negative'))).toBe(true);
    });

    it('normalizes missing and non-finite numbers and records warnings', () => {
      const malformedInput = input();
      malformedInput.spotExchangeRate = undefined as unknown as number;
      malformedInput.fxBufferPercent = Number.NaN;
      const data = lookups();
      data.packaging.retailBagKg = undefined as unknown as number;
      data.logistics.originCharges.vgmPkr = Number.POSITIVE_INFINITY;

      const result = calculator.calculate(malformedInput, data);

      expect(numericLeaves(result).every(Number.isFinite)).toBe(true);
      expect(result.quotationFxRate).toBe(0);
      expect(result.warnings.some(warning => warning.includes('missing or invalid'))).toBe(true);
    });

    it('handles very large but finite commercial quantities without overflow', () => {
      const data = lookups();
      data.supplier.ricePricePkrPerMt = 1_000_000_000_000;
      data.packaging.retailBagKg = 50;
      data.packaging.bagsPerCarton = 1;
      data.packaging.cartonNetKg = 50;
      const result = calculator.calculate(
        input({ containers: 1_000_000, netMtPerContainer: 1_000, priceRoundingUsdPerMt: 1_000 }),
        data,
      );

      expect(result.loading.totalNetMt).toBe(1_000_000_000);
      expect(result.loading.withinLimits).toBe(false);
      expect(numericLeaves(result).every(Number.isFinite)).toBe(true);
    });

    it('uses safe zero-dollar results and a warning when the FX buffer removes the whole rate', () => {
      const result = calculator.calculate(input({ fxBufferPercent: 100 }), lookups());
      expect(result.quotationFxRate).toBe(0);
      expect(result.quotedPriceUsdPerMt).toBe(0);
      expect(result.warnings).toContain('Enter a valid PKR/USD exchange rate and FX safety buffer.');
    });
  });
});
