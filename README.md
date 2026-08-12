# Avena Quotation System — Angular Offline PWA (Local File Edition)

A browser-based quotation, costing and proforma-invoice system for **AVENA AGRO FOODS PRIVATE LIMITED**.

This edition stores business data in a normal JSON file on the computer instead of IndexedDB or localStorage.

## Storage model

```text
Netlify / installed Angular PWA
        ↓
Open or create avena-data.json
        ↓
Read/write directly on the computer
        ↓
Buyers, products, supplier prices, packaging,
logistics, agents, company settings and quotations
```

Recommended location:

```text
Documents\Avena Quotation System\avena-data.json
```

The app does **not** remember the file handle in browser storage. After a browser refresh, app restart or PWA restart, select the same `avena-data.json` file again. This is intentional.

## Included

- Angular 22 standalone application
- Offline PWA service worker and installable manifest
- Direct local JSON-file storage through the File System Access API
- No IndexedDB or localStorage for business records
- Product, supplier/mill, packaging, logistics, commission-agent and buyer records
- PKR cost entry with automatic USD conversion and FX safety buffer
- LOCAL, EXW, FCA, FOB, CFR, CNF (CFR cost basis), CIF, DAP and DDP calculations
- DAP destination-delivery and DDP import-clearance, duty and tax costing
- 20-foot/40-foot FCL and CBM/MT/minimum-basis LCL freight calculations
- Product crop year and MOQ controls
- PP, BOPP, non-woven, jute and master-bag packaging with private-label/OEM controls
- Structured 100% Advance TT, TT, LC at Sight, Usance LC, CAD, D/P, D/A and Open Account terms
- Payment tenor, financing, bank-charge and risk-buffer costing
- Stuffing location/date, seal number, VGM, ETD/ETA, POL/POD, transshipment and direct-vessel controls
- Minimum, target and premium profit scenarios
- Commission as invoice percentage, USD/MT or fixed/container
- Container weight and volume planning checks
- Automatic warnings for missing/expired rates and below-break-even target prices
- Saved quotation history with edit, duplicate, status and delete actions
- Four-page Avena standard export quotation print/PDF view, matching the supplied company quotation format
- Dedicated Proforma Invoice, Sales Contract, Commercial Invoice and Packing List print/PDF modes
- Independent document numbers, dates, Draft/Final status, shipment references and mode-specific pre-PDF checks
- Editable per-quotation commercial controls, LC/shipment controls, documents and terms & conditions
- AAF-EQ-#### export quotation numbering with revision control
- Commercial quotation and proforma-invoice print/PDF view
- Save-as JSON backup copies and CSV quotation register
- Netlify SPA configuration

## Browser requirement

Use a current **Google Chrome** or **Microsoft Edge** browser. Direct local-file access requires a secure context:

- Netlify HTTPS address: supported
- `http://localhost`: supported for development
- ordinary LAN HTTP IP such as `http://192.168.x.x`: direct file access may not be available

## Required software

Angular 22 supports Node.js `^22.22.3`, `^24.15.0`, or `^26.0.0`.

Check:

```bash
node --version
npm --version
```

## Run on Windows

1. Extract the ZIP.
2. Open the extracted project folder.
3. Run:

```bash
npm install
npm start
```

The app opens at `http://localhost:4200`.

On the first screen choose either:

- **Open existing data file** — select your current `avena-data.json`
- **Create new data file** — choose a location and create a new starter database

Every explicit save writes the complete updated database back to the open JSON file.

## Test the production PWA

```bash
npm run build:pwa
npm run serve:pwa
```

Open `http://localhost:8080` in Chrome or Edge.

The Angular service worker caches application assets for offline use. It does not contain your quotation database; business data stays in the JSON file you select.

## Deploy to Netlify

A `netlify.toml` file is included.

Build command:

```text
npm run build:pwa
```

Publish directory:

```text
dist/avena-quotation-pwa/browser
```

After deployment, open the HTTPS Netlify URL in Chrome or Edge and select your local `avena-data.json` file.

## First-time business setup

1. Create a new `avena-data.json` in your Documents folder.
2. Open **Company & Defaults** and complete address, contact, export IDs and bank details.
3. Open **Master Data → Supplier Prices** and enter current AL-Saeed / other mill prices.
4. Open **Master Data → Packaging** and enter actual packaging rates and confirmed dimensions.
5. Open **Master Data → Logistics** and enter destination ports, charges, freight and validity.
6. Create quotations, review the editable document controls, and resolve warnings before printing.
7. Choose Quotation, Proforma Invoice, Sales Contract, Commercial Invoice or Packing List in the preview, then print/save the selected PDF.
8. Use **Data File & Backups → Save backup copy** regularly.

## Important limitations

- The browser cannot silently access arbitrary computer files. You must choose the data file when the app starts/reloads.
- Moving, renaming or deleting the open file can cause a save to fail until it is reopened.
- Different computers do not synchronize automatically.
- The PWA may cache application code/assets in browser Cache Storage; no business records are intentionally stored in IndexedDB/localStorage.
- Container payload and volume limits are planning values. Confirm carrier equipment, CSC plate and road limits.
- Demo specifications and dimensions must be replaced with actual agreed values.

## Folder map

```text
src/app/core/models/                   Business models
src/app/core/data/                     Starter/demo master data + standard quotation wording
src/app/core/services/local-file-data.service.ts  Direct file read/write
src/app/core/services/app-store.service.ts        In-memory state + file persistence
src/app/core/services/quotation-calculator.service.ts  Calculation engine
src/app/features/                      Dashboard, quote wizard, history, print, master data, settings, backups
public/                                PWA manifest and icons
ngsw-config.json                       Offline app-cache configuration
netlify.toml                           Netlify build + SPA redirect
```

## v2.2 safety workflow

- **Final = locked:** saving a quotation as Final freezes that revision. Use **Create Revision / New revision** for later changes.
- **Automatic backups:** open **Data File & Backups**, choose a backup folder once per app session, and the app will create dated JSON backups before overwriting the main data file.
- **Pre-PDF validation:** the quotation preview blocks Print / Save PDF when critical commercial/document checks fail.

See `CHANGES-SAFETY-UPGRADES-v2.2.md` for details.
