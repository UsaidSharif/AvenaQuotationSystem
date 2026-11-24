# Local File Storage

Business records are stored in the selected JSON file. IndexedDB is used only to remember the selected file handle so the app can try to reconnect on a later visit. Business records are not stored in IndexedDB or localStorage.

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

The app stores the selected file handle in IndexedDB and attempts to restore access when it starts. The browser may require the user to grant permission again. If automatic reconnection is unavailable, choose **Reconnect last file** or open the JSON file again. Clearing browser site data removes the remembered handle, not the JSON file itself.

## Backups

The current app does not create JSON backup copies and does not include an in-app restore function. To back up the database, close or save the file and copy `avena-data.json` using File Explorer or another file backup tool. The **Save quotation CSV** action exports the quotation register only; it is not a full database backup.
