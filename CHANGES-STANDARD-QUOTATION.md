# Standard Export Quotation Upgrade — v2.1.0

This release keeps the existing local JSON-file storage workflow and upgrades the client-facing export quotation to the supplied four-page AVENA standard.

## What changed

- Uses the supplied AVENA logo in the quotation and proforma preview.
- Export quotation numbering now uses `AAF-EQ-####` (default first number `1010`).
- Adds quotation revision number, Buyer RFQ reference, Prepared By, currency and document status.
- Expands Company Profile with tagline, processing facility, STRN and authorized designation.
- Authorized person defaults to **Muhammad Usaid Sharif — CEO**.
- Registered office and processing facility default to **Al-Saeed Rice Industries, By Pass, Lodhran, Punjab, Pakistan**.
- Adds detailed Annex A product specification fields and packaging/marking fields.
- Adds editable shipment, documentary-credit, freight, insurance and document controls.
- Adds editable per-quotation Standard Terms & Conditions. Each line entered in a terms field prints as one bullet.
- Adds EXW and FCA alongside LOCAL, FOB, CFR and CIF.
- Payment terms can be selected from common presets or typed as custom wording.
- Adds a four-page A4 Standard Quotation print layout:
  1. Export Quotation / Seller & Buyer / Commercial Offer Summary
  2. Annex A — Product Specification & Packaging
  3. Annex A — Shipment, LC & Documents
  4. Standard Terms & Conditions / Seller Authorization
- Existing version-1 `avena-data.json` files are normalized in memory with defaults for the new fields, so a new database file is not required.

## Important

- The signature/seal area is intentionally left as a signature line. Only the logo was supplied; no signature or stamp image has been embedded.
- EXW/FCA cost allocation is derived from the existing cost buckets. Review the named place and included origin charges for each actual offer.
- The quotation output is browser print HTML. Use **Print / Save PDF** in Chrome or Edge and print at 100%/Actual Size for the intended A4 layout.
