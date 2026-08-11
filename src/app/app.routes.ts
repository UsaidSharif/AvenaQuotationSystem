import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', loadComponent: () => import('./features/dashboard/dashboard.page').then(m => m.DashboardPage) },
  { path: 'quotes', loadComponent: () => import('./features/quotation-list/quotation-list.page').then(m => m.QuotationListPage) },
  { path: 'quotes/new', loadComponent: () => import('./features/quote-wizard/quote-wizard.page').then(m => m.QuoteWizardPage) },
  { path: 'quotes/:id/edit', loadComponent: () => import('./features/quote-wizard/quote-wizard.page').then(m => m.QuoteWizardPage) },
  { path: 'quotes/:id/print', loadComponent: () => import('./features/quotation-print/quotation-print.page').then(m => m.QuotationPrintPage) },
  { path: 'master-data', loadComponent: () => import('./features/master-data/master-data.page').then(m => m.MasterDataPage) },
  { path: 'settings', loadComponent: () => import('./features/settings/settings.page').then(m => m.SettingsPage) },
  { path: 'backup', loadComponent: () => import('./features/backup/backup.page').then(m => m.BackupPage) },
  { path: '**', redirectTo: '' },
];
