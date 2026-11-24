# AVENA Quotation Builder v2.2.0 — Safety & Audit Upgrades

## 1. Final quotation locking and revisions
- A quotation saved with **Document Status = Final** is automatically locked.
- Locked Final quotations cannot be overwritten or deleted.
- Opening a locked quotation for editing automatically starts a **new revision** using the same quotation number.
- Revision numbers are assigned sequentially (00, 01, 02...).
- Previous Final revisions remain available in Quotation History and continue to print from their saved snapshots.
- Workflow Status (Sent / Accepted / Rejected etc.) can still be updated on a locked quotation without changing its commercial content.
- CSV quotation history now includes Revision, Document Status and Locked state.

## 2. Local data-file behavior and backup limitation
- Business records are stored in the selected `avena-data.json` file. Save actions write the complete current dataset to that file.
- The selected file handle is stored in IndexedDB so the app can attempt to reconnect on a later visit. IndexedDB does not contain the business records.
- The current app does not provide automatic or manual JSON backup copies or an in-app restore function.
- Users should make copies of `avena-data.json` outside the app. The quotation CSV export contains the quotation register only and is not a full backup.

## 3. Pre-PDF validation
- The quotation preview now shows a validation panel before Print / Save PDF.
- Critical issues block PDF generation until corrected.
- Advisory items are shown but do not block printing.
- Checks include buyer/seller identity, quantity, selling price, Incoterm named place, ports, freight, CIF insurance, supplier/packaging/logistics validity, payment terms and required quotation wording. Container weight and volume estimates do not block or warn because entered packing dimensions may not reflect actual loading.
- Final quotations are also validated before they can be saved and locked.

## Compatibility
- Existing `avena-data.json` version 1 files remain compatible.
- Existing Final quotations are treated as locked when loaded.
- No change to the professional four-page quotation PDF design or calculation formulas.
