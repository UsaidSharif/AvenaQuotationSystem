import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-stat-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="stat-card">
      <div class="icon">{{ icon() }}</div>
      <div><div class="kpi-value">{{ value() }}</div><div class="kpi-label">{{ label() }}</div></div>
    </article>
  `,
  styles: [`
    .stat-card{background:#fff;border:1px solid #dce5e2;border-radius:14px;padding:18px;display:flex;gap:14px;align-items:center;box-shadow:0 7px 22px rgba(25,55,47,.05)}
    .icon{width:44px;height:44px;border-radius:12px;background:#e7f0ed;color:#123b35;display:grid;place-items:center;font-size:1.25rem;font-weight:850}
  `],
})
export class StatCard {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly icon = input('•');
}
