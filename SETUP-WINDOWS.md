# Windows Setup — Local File Edition

## 1. Node.js

Angular 22 requires one of these Node.js ranges:

- 22.22.3+
- 24.15.0+
- 26.x

Verify:

```powershell
node --version
npm --version
```

## 2. Install and run

Open PowerShell in the project folder:

```powershell
npm install
npm start
```

Open `http://localhost:4200` in Chrome or Edge.

## 3. Create the computer data file

On the first screen click **Create new data file**.

Recommended location:

```text
Documents\Avena Quotation System\avena-data.json
```

The app writes all business records directly to this file. It does not use IndexedDB/localStorage for quotations or master data.

Whenever you restart or refresh the app, click **Open existing data file** and select the same JSON file.

## 4. Production PWA

```powershell
npm run build:pwa
npm run serve:pwa
```

Open `http://localhost:8080` in Chrome or Edge.

## 5. Netlify

The project includes `netlify.toml`.

Build command:

```text
npm run build:pwa
```

Publish directory:

```text
dist/avena-quotation-pwa/browser
```

Use the HTTPS Netlify address for reliable direct local-file access.
