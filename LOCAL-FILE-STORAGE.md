# Local File Storage

This build intentionally does not persist business records in IndexedDB or localStorage.

## Main data file

All application records are stored in one JSON document, normally:

```text
Documents\Avena Quotation System\avena-data.json
```

The JSON contains:

- company profile and bank details
- application defaults
- buyers
- products/specifications
- supplier/mill prices
- packaging records
- logistics/freight rates
- commission agents
- saved quotations and quotation statuses

## Save behavior

When you press a Save/Add/Delete/Status action, the in-memory data is updated and the full current data set is written back to the selected JSON file.

## Reopening

For security, browsers do not allow a web app to silently reopen a computer file after a restart without storing a handle in browser storage. This app does not store that handle, so simply choose the same data file again on startup.

## Backups

Use **Data File & Backups → Save backup copy** to create dated JSON copies. The backup is a complete database and can later be restored into the main data file.
