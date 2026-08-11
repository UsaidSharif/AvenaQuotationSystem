# PDF Typography Update - v2.1.1

This update aligns the four-page Standard Quotation typography with the approved Abdali Traders quotation.

## Changes
- Uses Arial for quotation PDF pages, with Arial Bold and Arial Italic style weights matching the approved document.
- Removed print-time Arial Black caused by 800-level font weights.
- Prevented the mobile breakpoint from changing PDF typography during printing.
- Overrode global table heading uppercase/size rules inside the quotation document.
- Restored title-case table field labels (e.g. `Quotation No.`, `Prepared By`, `Company Name`).
- Main page title: approximately 17.05 pt Arial Bold.
- Section headings: approximately 9.95 pt Arial Bold.
- Table text: approximately 7.45 pt Arial Bold.
- Annex / terms subtitles: approximately 7.45 pt Arial Italic.
- Footer: approximately 6.5 pt Arial.
- Standard Terms & Conditions body: approximately 7.45 pt Arial Regular with the term prefix before the colon in Arial Bold, matching the approved quotation.
- Security notice and seller authorization typography adjusted to the approved PDF scale.

No quotation calculations, local-file storage logic, or business data model behavior were changed.
