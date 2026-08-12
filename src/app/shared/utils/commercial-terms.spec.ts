import { describe, expect, it } from 'vitest';
import { inferPaymentMethod, isLcPayment, paymentMethodLabel, paymentMethodOptions } from './commercial-terms';

describe('commercial payment terms', () => {
  it('provides every supported structured payment method', () => {
    expect(paymentMethodOptions.map(option => option.value)).toEqual([
      'advance-tt', 'tt', 'lc-at-sight', 'usance-lc', 'cad', 'dp', 'da', 'open-account', 'custom',
    ]);
  });

  it.each([
    ['100% Advance TT', 'advance-tt'],
    ['TT', 'tt'],
    ['Irrevocable LC at Sight', 'lc-at-sight'],
    ['90-day Usance LC', 'usance-lc'],
    ['CAD', 'cad'],
    ['D/P', 'dp'],
    ['D/A', 'da'],
    ['Open Account', 'open-account'],
    ['30% advance and 70% against BL copy', 'custom'],
  ] as const)('maps "%s" to %s', (wording, expected) => {
    expect(inferPaymentMethod(wording)).toBe(expected);
  });

  it('identifies both LC methods and returns stable printed labels', () => {
    expect(isLcPayment('lc-at-sight')).toBe(true);
    expect(isLcPayment('usance-lc')).toBe(true);
    expect(isLcPayment('open-account')).toBe(false);
    expect(paymentMethodLabel('dp')).toBe('D/P (Documents Against Payment)');
  });
});
