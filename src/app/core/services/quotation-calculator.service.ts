import { Injectable } from '@angular/core';
import {
  AppSettings,
  CommissionAgent,
  LogisticsRate,
  PackagingOption,
  Product,
  QuoteCalculation,
  QuotationInput,
  SupplierPrice,
} from '../models/domain.models';

interface CalculationLookups {
  product: Product;
  supplier: SupplierPrice;
  packaging: PackagingOption;
  logistics: LogisticsRate;
  agent: CommissionAgent;
  settings: AppSettings;
}

@Injectable({ providedIn: 'root' })
export class QuotationCalculatorService {
  calculate(rawInput: QuotationInput, data: CalculationLookups): QuoteCalculation {
    const warnings: string[] = [];
    const nonNegative = (value: unknown, label: string): number => {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        warnings.push(`${label} is missing or invalid; using 0.`);
        return 0;
      }
      if (value < 0) {
        warnings.push(`${label} cannot be negative; using 0.`);
        return 0;
      }
      return value;
    };

    const input: QuotationInput = {
      ...rawInput,
      containers: nonNegative(rawInput.containers, 'Containers'),
      netMtPerContainer: nonNegative(rawInput.netMtPerContainer, 'Net MT per container'),
      spotExchangeRate: nonNegative(rawInput.spotExchangeRate, 'Spot exchange rate'),
      fxBufferPercent: nonNegative(rawInput.fxBufferPercent, 'FX buffer percent'),
      minimumProfitPercent: nonNegative(rawInput.minimumProfitPercent, 'Minimum profit percent'),
      targetProfitPercent: nonNegative(rawInput.targetProfitPercent, 'Target profit percent'),
      premiumProfitPercent: nonNegative(rawInput.premiumProfitPercent, 'Premium profit percent'),
      contingencyPercent: nonNegative(rawInput.contingencyPercent, 'Contingency percent'),
      bankCostPercent: nonNegative(rawInput.bankCostPercent, 'Bank cost percent'),
      priceRoundingUsdPerMt: nonNegative(rawInput.priceRoundingUsdPerMt, 'Price rounding increment'),
      buyerTargetUsdPerMt: nonNegative(rawInput.buyerTargetUsdPerMt, 'Buyer target price'),
    };

    const supplier: SupplierPrice = {
      ...data.supplier,
      ricePricePkrPerMt: nonNegative(data.supplier.ricePricePkrPerMt, 'Rice purchase price'),
      processingPkrPerMt: nonNegative(data.supplier.processingPkrPerMt, 'Processing cost'),
      otherPkrPerMt: nonNegative(data.supplier.otherPkrPerMt, 'Other product cost'),
    };
    const packaging: PackagingOption = {
      ...data.packaging,
      retailBagKg: nonNegative(data.packaging.retailBagKg, 'Retail bag weight'),
      bagsPerCarton: nonNegative(data.packaging.bagsPerCarton, 'Bags per carton'),
      cartonNetKg: nonNegative(data.packaging.cartonNetKg, 'Carton net weight'),
      bagRatePkr: nonNegative(data.packaging.bagRatePkr, 'Bag rate'),
      cartonRatePkr: nonNegative(data.packaging.cartonRatePkr, 'Carton rate'),
      bagTareGrams: nonNegative(data.packaging.bagTareGrams, 'Bag tare'),
      cartonTareKg: nonNegative(data.packaging.cartonTareKg, 'Carton tare'),
      lengthCm: nonNegative(data.packaging.lengthCm, 'Carton length'),
      widthCm: nonNegative(data.packaging.widthCm, 'Carton width'),
      heightCm: nonNegative(data.packaging.heightCm, 'Carton height'),
    };
    const rawOrigin = data.logistics.originCharges;
    const logistics: LogisticsRate = {
      ...data.logistics,
      originCharges: {
        inlandTransportPkr: nonNegative(rawOrigin?.inlandTransportPkr, 'Inland transport charge'),
        containerPositioningPkr: nonNegative(rawOrigin?.containerPositioningPkr, 'Container positioning charge'),
        stuffingPkr: nonNegative(rawOrigin?.stuffingPkr, 'Stuffing charge'),
        customsDocsPkr: nonNegative(rawOrigin?.customsDocsPkr, 'Customs and documents charge'),
        portTerminalPkr: nonNegative(rawOrigin?.portTerminalPkr, 'Port terminal charge'),
        vgmPkr: nonNegative(rawOrigin?.vgmPkr, 'VGM charge'),
        sealPkr: nonNegative(rawOrigin?.sealPkr, 'Seal charge'),
        certificatesPkr: nonNegative(rawOrigin?.certificatesPkr, 'Certificates charge'),
        inspectionPkr: nonNegative(rawOrigin?.inspectionPkr, 'Inspection charge'),
        additionalPkr: nonNegative(rawOrigin?.additionalPkr, 'Additional origin charge'),
      },
      oceanFreightUsd: nonNegative(data.logistics.oceanFreightUsd, 'Ocean freight'),
      freightSurchargeUsd: nonNegative(data.logistics.freightSurchargeUsd, 'Freight surcharge'),
      fixedInsuranceUsd: nonNegative(data.logistics.fixedInsuranceUsd, 'Fixed insurance'),
      insurancePercentOfCfr: nonNegative(data.logistics.insurancePercentOfCfr, 'Insurance percent'),
    };
    const agent: CommissionAgent = {
      ...data.agent,
      rate: nonNegative(data.agent.rate, 'Commission rate'),
    };

    const quoteDate = new Date(`${input.quoteDate}T00:00:00`);
    const totalNetMt = Math.max(0, input.containers) * Math.max(0, input.netMtPerContainer);
    const totalNetKg = totalNetMt * 1000;
    const totalBags = packaging.retailBagKg > 0 ? Math.ceil(totalNetKg / packaging.retailBagKg) : 0;
    const totalCartons = packaging.bagsPerCarton > 0 ? Math.ceil(totalBags / packaging.bagsPerCarton) : 0;
    const totalPackagingTareKg = (totalBags * packaging.bagTareGrams / 1000) + (totalCartons * packaging.cartonTareKg);
    const grossCargoPerContainerKg = input.containers > 0
      ? (totalNetKg + totalPackagingTareKg) / input.containers : 0;
    const cartonVolumeCbm = packaging.lengthCm * packaging.widthCm * packaging.heightCm / 1_000_000;
    const cargoVolumePerContainerCbm = input.containers > 0
      ? totalCartons * cartonVolumeCbm / input.containers : 0;

    const container = input.containerType === "40' Dry FCL"
      ? { payloadKg: 26_500, usableVolumeCbm: 60.3 }
      : { payloadKg: 28_000, usableVolumeCbm: 29.7 };
    const grossCartonWeightKg = packaging.cartonNetKg
      + (packaging.bagsPerCarton * packaging.bagTareGrams / 1000)
      + packaging.cartonTareKg;
    const maxByWeight = grossCartonWeightKg > 0 ? Math.floor(container.payloadKg / grossCartonWeightKg) : 0;
    const maxByVolume = cartonVolumeCbm > 0 ? Math.floor(container.usableVolumeCbm / cartonVolumeCbm) : 0;
    const recommendedMaxCartons = Math.min(maxByWeight || 0, maxByVolume || 0);
    const recommendedMaxNetMt = recommendedMaxCartons * packaging.cartonNetKg / 1000;
    const weightUtilizationPercent = container.payloadKg > 0 ? grossCargoPerContainerKg / container.payloadKg * 100 : 0;
    const volumeUtilizationPercent = container.usableVolumeCbm > 0 ? cargoVolumePerContainerCbm / container.usableVolumeCbm * 100 : 0;
    const withinLimits = weightUtilizationPercent <= 100 && volumeUtilizationPercent <= 100;

    const calculatedFxRate = input.spotExchangeRate * (1 - input.fxBufferPercent / 100);
    const quotationFxRate = Number.isFinite(calculatedFxRate) && calculatedFxRate > 0 ? calculatedFxRate : 0;
    if (quotationFxRate <= 0) warnings.push('Enter a valid PKR/USD exchange rate and FX safety buffer.');

    const productAndProcessingPkr = (
      supplier.ricePricePkrPerMt + supplier.processingPkrPerMt + supplier.otherPkrPerMt
    ) * totalNetMt;
    const packagingPkr = packaging.bagRatePkr * totalBags + packaging.cartonRatePkr * totalCartons;
    const originPerContainerPkr = Object.values(logistics.originCharges).reduce((sum, value) => sum + Number(value || 0), 0);
    const fcaOriginPerContainerPkr = logistics.originCharges.inlandTransportPkr
      + logistics.originCharges.containerPositioningPkr
      + logistics.originCharges.stuffingPkr
      + logistics.originCharges.customsDocsPkr
      + logistics.originCharges.vgmPkr
      + logistics.originCharges.sealPkr
      + logistics.originCharges.certificatesPkr
      + logistics.originCharges.inspectionPkr
      + logistics.originCharges.additionalPkr;
    const originChargesPkr = originPerContainerPkr * input.containers;
    const baseGoodsPkr = productAndProcessingPkr + packagingPkr;
    const directExwPkr = baseGoodsPkr;
    const directFcaPkr = baseGoodsPkr + fcaOriginPerContainerPkr * input.containers;
    const directFobPkr = baseGoodsPkr + originChargesPkr;
    const directExwUsd = quotationFxRate > 0 ? directExwPkr / quotationFxRate : 0;
    const directFcaUsd = quotationFxRate > 0 ? directFcaPkr / quotationFxRate : 0;
    const directFobUsd = quotationFxRate > 0 ? directFobPkr / quotationFxRate : 0;
    const addCommercialFactors = (directUsd: number) => directUsd * (1 + input.contingencyPercent / 100 + input.bankCostPercent / 100);
    const exwCostUsd = addCommercialFactors(directExwUsd);
    const fcaCostUsd = addCommercialFactors(directFcaUsd);
    const contingencyUsd = directFobUsd * input.contingencyPercent / 100;
    const bankCostUsd = directFobUsd * input.bankCostPercent / 100;
    const fobCostUsd = directFobUsd + contingencyUsd + bankCostUsd;
    const freightUsd = (logistics.oceanFreightUsd + logistics.freightSurchargeUsd) * input.containers;
    const cfrCostUsd = fobCostUsd + freightUsd;
    const fixedInsuranceUsd = logistics.fixedInsuranceUsd * input.containers;
    const variableInsuranceUsd = cfrCostUsd * logistics.insurancePercentOfCfr / 100;
    const cifCostUsd = cfrCostUsd + fixedInsuranceUsd + variableInsuranceUsd;
    const selectedTermCostUsd = input.tradeTerm === 'CIF'
      ? cifCostUsd
      : input.tradeTerm === 'CFR'
        ? cfrCostUsd
        : input.tradeTerm === 'EXW'
          ? exwCostUsd
          : input.tradeTerm === 'FCA'
            ? fcaCostUsd
            : fobCostUsd;

    const selectedProfitPercent = input.scenario === 'Minimum'
      ? input.minimumProfitPercent
      : input.scenario === 'Premium'
        ? input.premiumProfitPercent
        : input.targetProfitPercent;
    const profitRate = selectedProfitPercent / 100;
    const commissionRate = agent.method === 'invoice-percent' ? agent.rate / 100 : 0;
    const fixedCommissionUsd = agent.method === 'usd-per-mt'
      ? agent.rate * totalNetMt
      : agent.method === 'fixed-per-container'
        ? agent.rate * input.containers
        : 0;

    let rawInvoiceUsd = 0;
    if (input.profitMethod === 'markup') {
      rawInvoiceUsd = agent.method === 'invoice-percent'
        ? selectedTermCostUsd * (1 + profitRate) / Math.max(0.0001, 1 - commissionRate)
        : (selectedTermCostUsd + fixedCommissionUsd) * (1 + profitRate);
    } else {
      rawInvoiceUsd = agent.method === 'invoice-percent'
        ? selectedTermCostUsd / Math.max(0.0001, 1 - profitRate - commissionRate)
        : (selectedTermCostUsd + fixedCommissionUsd) / Math.max(0.0001, 1 - profitRate);
    }

    const rounding = Math.max(0.01, input.priceRoundingUsdPerMt || 1);
    const rawPriceUsdPerMt = totalNetMt > 0 ? rawInvoiceUsd / totalNetMt : 0;
    const quotedPriceUsdPerMt = Math.round(rawPriceUsdPerMt / rounding) * rounding;
    const invoiceTotalUsd = quotedPriceUsdPerMt * totalNetMt;
    const commissionUsd = agent.method === 'invoice-percent' ? invoiceTotalUsd * commissionRate : fixedCommissionUsd;
    const netProfitUsd = invoiceTotalUsd - selectedTermCostUsd - commissionUsd;
    const actualGrossMarginPercent = invoiceTotalUsd > 0 ? netProfitUsd / invoiceTotalUsd * 100 : 0;
    const breakEvenInvoiceUsd = agent.method === 'invoice-percent'
      ? selectedTermCostUsd / Math.max(0.0001, 1 - commissionRate)
      : selectedTermCostUsd + fixedCommissionUsd;
    const breakEvenUsdPerMt = totalNetMt > 0 ? breakEvenInvoiceUsd / totalNetMt : 0;
    const buyerTargetDifferenceUsdPerMt = input.buyerTargetUsdPerMt > 0
      ? input.buyerTargetUsdPerMt - quotedPriceUsdPerMt : 0;

    if ((input.tradeTerm === 'CFR' || input.tradeTerm === 'CIF') && (!logistics.portOfDischarge || /confirm|exact port|\[/.test(logistics.portOfDischarge.toLowerCase()))) {
      warnings.push('Confirm the exact destination port before issuing the quotation.');
    }
    if (input.tradeTerm === 'FCA') warnings.push('For FCA, confirm the exact named place and review which origin charges are included.');
    if (logistics.containerType !== input.containerType) warnings.push('Selected logistics rate is for a different container type.');
    if (supplier.ricePricePkrPerMt <= 0) warnings.push('Rice purchase price is zero. Update the supplier price.');
    if ((input.tradeTerm === 'CFR' || input.tradeTerm === 'CIF') && freightUsd <= 0) {
      warnings.push('Ocean freight is zero for a CFR/CIF quotation.');
    }
    if (input.tradeTerm === 'CIF' && fixedInsuranceUsd + variableInsuranceUsd <= 0) {
      warnings.push('Insurance is zero for a CIF quotation.');
    }
    if (grossCargoPerContainerKg > container.payloadKg) warnings.push('Gross cargo exceeds the planning payload.');
    if (cargoVolumePerContainerCbm > container.usableVolumeCbm) warnings.push('Carton volume exceeds the usable container volume.');
    if (this.isExpired(supplier.validTo, quoteDate)) warnings.push('Supplier price validity has expired.');
    if (this.isExpired(packaging.validTo, quoteDate)) warnings.push('Packaging price validity has expired.');
    if (this.isExpired(logistics.validTo, quoteDate)) warnings.push('Logistics rate validity has expired.');
    if (input.profitMethod === 'margin' && profitRate + commissionRate >= 0.95) {
      warnings.push('Profit margin plus commission is too high to calculate safely.');
    }
    if (input.buyerTargetUsdPerMt > 0 && input.buyerTargetUsdPerMt < breakEvenUsdPerMt) {
      warnings.push('Buyer target price is below break-even.');
    }

    return {
      quotationFxRate,
      selectedProfitPercent,
      loading: {
        totalNetMt, totalNetKg, totalBags, totalCartons, totalPackagingTareKg,
        grossCargoPerContainerKg, cargoVolumePerContainerCbm,
        payloadLimitKg: container.payloadKg, usableVolumeCbm: container.usableVolumeCbm,
        recommendedMaxCartons, recommendedMaxNetMt,
        weightUtilizationPercent, volumeUtilizationPercent, withinLimits,
      },
      costs: {
        productAndProcessingPkr, packagingPkr, originChargesPkr, directFobUsd,
        contingencyUsd, bankCostUsd, exwCostUsd, fcaCostUsd, fobCostUsd, freightUsd, cfrCostUsd,
        fixedInsuranceUsd, variableInsuranceUsd, cifCostUsd, selectedTermCostUsd,
      },
      quotedPriceUsdPerMt, invoiceTotalUsd, commissionUsd, netProfitUsd,
      actualGrossMarginPercent, breakEvenUsdPerMt, buyerTargetDifferenceUsdPerMt,
      warnings,
    };
  }

  private isExpired(value: string, quoteDate: Date): boolean {
    if (!value) return false;
    const expiry = new Date(`${value}T23:59:59`);
    return Number.isFinite(expiry.getTime()) && expiry < quoteDate;
  }
}
