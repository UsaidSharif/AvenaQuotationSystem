# TypeScript 6 build fix

The deprecated `downlevelIteration` compiler option was removed from `tsconfig.json`.
The project targets ES2022, so that legacy ES5 downleveling option is unnecessary.

Run:

```bash
npm install
npm start
```

For the production PWA build:

```bash
npm run build:pwa
npm run serve:pwa
```
