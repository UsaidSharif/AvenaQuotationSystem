import { PaymentMethod } from '../../core/models/domain.models';

export const paymentMethodOptions: ReadonlyArray<{ value: PaymentMethod; label: string }> = [
  { value: 'advance-tt', label: '100% Advance TT' },
  { value: 'tt', label: 'TT (Telegraphic Transfer)' },
  { value: 'lc-at-sight', label: 'Irrevocable LC at Sight' },
  { value: 'usance-lc', label: 'Usance LC' },
  { value: 'cad', label: 'CAD (Cash Against Documents)' },
  { value: 'dp', label: 'D/P (Documents Against Payment)' },
  { value: 'da', label: 'D/A (Documents Against Acceptance)' },
  { value: 'open-account', label: 'Open Account' },
  { value: 'custom', label: 'Custom / Split Payment' },
];

export function paymentMethodLabel(value: PaymentMethod): string {
  return paymentMethodOptions.find(option => option.value === value)?.label ?? 'Custom / Split Payment';
}

export function inferPaymentMethod(value: string): PaymentMethod {
  const normalized = (value || '').trim().toLowerCase();
  if (/^100%\s+advance(?:\s+tt)?$/.test(normalized)) return 'advance-tt';
  if (/usance|deferred/.test(normalized) && /\blc\b|letter of credit/.test(normalized)) return 'usance-lc';
  if (/\blc\b|letter of credit/.test(normalized)) return 'lc-at-sight';
  if (/\bcad\b|cash against documents/.test(normalized)) return 'cad';
  if (/\bd\s*\/\s*p\b|documents against payment/.test(normalized)) return 'dp';
  if (/\bd\s*\/\s*a\b|documents against acceptance/.test(normalized)) return 'da';
  if (/open account/.test(normalized)) return 'open-account';
  if (/\btt\b|telegraphic transfer/.test(normalized)) return 'tt';
  return 'custom';
}

export function isLcPayment(value: PaymentMethod): boolean {
  return value === 'lc-at-sight' || value === 'usance-lc';
}
