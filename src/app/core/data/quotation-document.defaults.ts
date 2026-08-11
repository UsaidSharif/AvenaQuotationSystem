import { QuotationDocumentDetails, TradeTerm } from '../models/domain.models';

export function createDefaultQuotationDocument(
  paymentTerms = '100% Advance',
  shipmentDays = 10,
  tradeTerm: TradeTerm = 'FOB',
): QuotationDocumentDetails {
  const paymentLower = paymentTerms.toLowerCase();
  const lcBased = paymentLower.includes('lc') || paymentLower.includes('letter of credit');
  const advanceBased = paymentLower.includes('advance');
  const isFullAdvance = /^100%\s+advance$/i.test(paymentTerms.trim());
  const commencement = isFullAdvance
    ? 'After receipt of 100% advance payment, artwork approval and final shipping instructions'
    : advanceBased
      ? `After receipt of agreed advance payment (${paymentTerms}), artwork approval and final shipping instructions`
      : `After fulfilment of agreed payment terms (${paymentTerms}), artwork approval and final shipping instructions`;
  const latest = isFullAdvance
    ? `Within ${shipmentDays} days after receiving advance payment`
    : `Within ${shipmentDays} days after all commencement conditions are met`;
  const taxes = tradeTerm === 'LOCAL'
    ? 'As mutually agreed for local sale'
    : `Buyer’s account as per ${tradeTerm} - Incoterms 2020`;

  return {
    revisionNo: '00',
    buyerRfqRef: 'N/A',
    documentStatus: 'Final',
    quantityTolerancePercent: 5,
    incotermNamedPlace: '',
    priceBasis: 'USD per MT based on stated quality, packing, quantity and shipment terms',
    finalInvoiceBasis: 'Based on actual shipped quantity within agreed tolerance',
    shipmentPlan: '',
    lcOpeningDeadline: lcBased ? 'As per agreed LC opening schedule' : 'N/A',
    partialShipment: 'Not Allowed',
    transshipment: 'Not Allowed',
    shipmentCommencement: commencement,
    latestShipmentDateText: latest,
    lcExpiryPlace: lcBased ? 'To be agreed' : 'N/A',
    presentationPeriod: lcBased ? 'To be agreed' : 'N/A',
    lcConfirmation: lcBased ? 'As agreed' : 'N/A',
    confirmationCharges: lcBased ? 'As agreed' : 'N/A',
    bankCharges: 'Inside Pakistan: seller; outside Pakistan: buyer, unless agreed otherwise',
    amendmentCharges: lcBased ? 'Buyer’s account unless caused by seller' : 'N/A',
    documentDiscrepancyCharges: lcBased ? 'For account of the party causing the discrepancy' : 'N/A',
    draftLcReview: lcBased ? 'Required before LC issuance' : 'N/A',
    lcGoverningRules: lcBased ? 'UCP 600 unless otherwise agreed' : 'N/A',
    freightValidity: tradeTerm === 'CFR' || tradeTerm === 'CIF' ? 'As per freight quotation validity' : 'N/A',
    insuranceForCif: tradeTerm === 'CIF' ? 'Included as stated in the quotation' : 'N/A',
    taxesDuties: taxes,
    specialLegalization: 'N/A',
    buyerDocumentaryWording: 'N/A',
    finalShipmentInstructions: 'Required before production and booking',
    standardDocumentsIncluded: 'Commercial Invoice | Packing List | Certificate of Origin | Phytosanitary Certificate | Fumigation Certificate | Full Set of Clean On-Board Bills of Lading',
    additionalDocuments: 'Insurance Certificate | Weight & Quality Certificate | Inspection Certificate | Health Certificate | Laboratory Analysis Report | Halal Certificate | Chamber-Attested or Legalized Documents',
    commercialConditions: [
      'Price basis: The quotation must state one selected Incoterm and one exact named port. Prices are in USD per metric ton unless stated otherwise.',
      'Offer scope: The unit price is based only on the quality, quantity, packing, marking, destination and shipment terms stated in the quotation and Annex A.',
      'Total value: The final invoice value will be based on actual shipped quantity within the agreed tolerance multiplied by the agreed unit price.',
      'Freight validity: N/A',
      'Excluded costs: Destination customs duties, taxes, import clearance, demurrage, detention and buyer-requested services are excluded unless expressly included.',
    ].join('\n'),
    qualityPackingInspectionTerms: [
      'Quality: Product will be supplied according to the specifications stated in the quotation, Annex A and the final Proforma Invoice or sales contract.',
      'Packaging: Bag material, size, printing, private-label artwork, marking and special packing requirements require written approval before production.',
      'Inspection: Third-party inspection, laboratory testing, special certification, legalization or destination-specific registration must be agreed before order confirmation, including related charges.',
      'Reference sample: N/A',
    ].join('\n'),
    shipmentDocumentationTerms: [
      `Shipment commencement: ${commencement}.`,
      'Schedule: Estimated shipment timing is subject to production, port operations, carrier schedules, vessel space and events beyond the seller’s reasonable control.',
      'Document wording: Buyer-required wording and legalization instructions must be provided before finalization of order to reduce discrepancies and delays.',
      'Document originals: N/A',
    ].join('\n'),
    paymentSecurityTerms: [
      `LC review: ${lcBased ? 'Required before LC issuance' : 'N/A'}`,
      'Bank charges: Charges inside Pakistan are for the seller and charges outside Pakistan are for the buyer unless agreed otherwise. Confirmation charges are allocated as written in Annex A.',
      'Beneficiary details: Bank and beneficiary details are intentionally excluded from the quotation and will be issued only on the final Proforma Invoice after commercial acceptance.',
      'No payment substitution: Any change in beneficiary or bank details is valid only when confirmed through an official @avenaagrofoods.com email and independently verified by the buyer.',
    ].join('\n'),
    authenticityAcceptanceTerms: [
      'Authenticity: The quotation is valid only when issued from an official @avenaagrofoods.com email address and signed by an authorized representative of AVENA AGRO FOODS (PRIVATE) LIMITED.',
      'Quotation status: This document is an offer and does not by itself constitute a final sales contract.',
      'Final acceptance: Supply remains subject to written order confirmation, acceptance of the final Proforma Invoice or sales contract, workable payment terms, and availability of product, packaging and shipment space.',
      'Revision control: Only the latest quotation revision issued by the seller is valid; earlier revisions are superseded unless expressly reinstated in writing.',
    ].join('\n'),
    securityNotice: 'SECURITY NOTICE: Verify any change to beneficiary, banking or payment instructions by calling the official Avena contact number shown in this document before remitting funds.',
    buyerAcknowledgement: 'Receipt may be acknowledged separately; commercial acceptance is confirmed only by the final Proforma Invoice or sales contract.',
  };
}
