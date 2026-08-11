# AVENA Quotation Builder v2.2.0 — Safety & Audit Upgrades

## 1. Final quotation locking and revisions
- A quotation saved with **Document Status = Final** is automatically locked.
- Locked Final quotations cannot be overwritten or deleted.
- Opening a locked quotation for editing automatically starts a **new revision** using the same quotation number.
- Revision numbers are assigned sequentially (00, 01, 02...).
- Previous Final revisions remain available in Quotation History and continue to print from their saved snapshots.
- Workflow Status (Sent / Accepted / Rejected etc.) can still be updated on a locked quotation without changing its commercial content.
- CSV quotation history now includes Revision, Document Status and Locked state.

## 2. Automatic local-file backups
- Data File & Backups now has **Enable automatic backups**.
- Choose a normal computer folder such as `Documents\\Avena Quotation System\\Backups`.
- Once enabled, the app saves a dated copy of the current JSON data file before overwriting it.
- Automatic backups cover quotation saves/deletes/status changes, master-data edits, settings edits, restore and reset actions.
- The backup-folder permission is kept in memory only for the current browser/app session. No directory handle is stored in IndexedDB or localStorage.
- Manual backup remains available.

## 3. Pre-PDF validation
- The quotation preview now shows a validation panel before Print / Save PDF.
- Critical issues block PDF generation until corrected.
- Advisory items are shown but do not block printing.
- Checks include buyer/seller identity, quantity, selling price, Incoterm named place, ports, freight, CIF insurance, container limits, supplier/packaging/logistics validity, payment terms and required quotation wording.
- Final quotations are also validated before they can be saved and locked.

## Compatibility
- Existing `avena-data.json` version 1 files remain compatible.
- Existing Final quotations are treated as locked when loaded.
- No change to the professional four-page quotation PDF design or calculation formulas.
