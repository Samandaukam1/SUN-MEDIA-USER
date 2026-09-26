import { logoSvg } from '@/components/brand/logoSvg';
import type { Report, ReportMetric } from './api';
import { deltaPercent, deltaPoints, formatNumber } from './api';

const SECTION_TITLE: Record<ReportMetric['section'], string> = {
  delivery: 'Reja bajarilishi',
  social: 'Ijtimoiy tarmoqlar',
  production: 'Ishlab chiqarish',
  approvals: 'Tasdiqlash',
  calendar: 'Kontent reja',
  internal: 'Ichki ko‘rsatkichlar',
};

const esc = (s: string | null | undefined) =>
  (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function value(m: ReportMetric): string {
  if (m.value == null) return '—';
  if (m.unit === 'daqiqa') {
    const h = Math.floor(m.value / 60);
    const min = Math.round(m.value % 60);
    return h ? `${h} soat${min ? ` ${min} daq` : ''}` : `${min} daq`;
  }
  if (m.unit === '%') return `${formatNumber(m.value)}%`;
  return m.unit && !['ta', 'dona'].includes(m.unit) ? `${formatNumber(m.value)} ${esc(m.unit)}` : formatNumber(m.value);
}

/**
 * Client-facing A4 report. Internal metrics are never printed: the PDF is what the client keeps.
 */
export function buildReportHtml(report: Report): string {
  const metrics = report.metrics.filter((m) => !m.internal && (m.value != null || m.target != null));
  const completion = metrics.find((m) => m.key === 'calendar.completion_rate');
  const delivery = metrics.filter((m) => m.section === 'delivery');
  const quota = delivery.filter((m) => m.target != null);
  const delivered = quota.reduce((s, m) => s + (m.value ?? 0), 0);
  const planned = quota.reduce((s, m) => s + (m.target ?? 0), 0);

  const deliveryRows = delivery
    .map((m) => {
      const pct = m.target ? Math.min(100, Math.round(((m.value ?? 0) / m.target) * 100)) : null;
      return `<tr><td>${esc(m.label)}</td><td class="num">${formatNumber(m.value)}${m.target != null ? ` <span class="muted">/ ${formatNumber(m.target)}</span>` : ''}</td>
        <td class="bar">${pct != null ? `<div class="track"><div class="fill${(m.value ?? 0) > (m.target ?? 0) ? ' over' : ''}" style="width:${pct}%"></div></div>` : ''}</td></tr>`;
    })
    .join('');

  const tiles = (section: ReportMetric['section']) =>
    metrics
      .filter((m) => m.section === section)
      .map((m) => {
        const points = m.unit === '%';
        const d = points ? deltaPoints(m.value, m.previous) : deltaPercent(m.value, m.previous);
        return `<div class="tile"><div class="label">${esc(m.label)}</div><div class="value">${value(m)}</div>${
          d != null ? `<div class="delta ${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '▲' : '▼'} ${points ? `${formatNumber(Math.abs(d))} p.p.` : `${Math.abs(d)}%`} o‘tgan oyga</div>` : ''
        }</div>`;
      })
      .join('');

  const section = (key: ReportMetric['section']) => {
    const html = tiles(key);
    return html ? `<section><h2>${SECTION_TITLE[key]}</h2><div class="grid">${html}</div></section>` : '';
  };

  const top = report.top_contents
    .map(
      (t) =>
        `<tr><td class="rank">${t.rank}</td><td>${esc(t.title)}${t.platform ? ` <span class="muted">· ${esc(t.platform)}</span>` : ''}</td><td class="num">${formatNumber(t.views)}</td><td class="num">${formatNumber(t.likes)}</td><td class="num">${formatNumber(t.comments)}</td></tr>`,
    )
    .join('');

  return `<!doctype html><html lang="uz"><head><meta charset="utf-8"><title>${esc(report.title)}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: -apple-system, 'Inter', Helvetica, Arial, sans-serif; color: #0B0B0C; font-size: 11pt; margin: 0; }
  header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0B0B0C; padding-bottom: 14px; }
  .client { text-align: right; }
  .client .name { font-size: 16pt; font-weight: 700; }
  .muted { color: #71717A; }
  h1 { font-size: 24pt; letter-spacing: -0.5px; margin: 18px 0 4px; }
  h2 { font-size: 12pt; text-transform: uppercase; letter-spacing: 1px; color: #52525B; margin: 22px 0 10px; }
  .hero { background: #0B0B0C; color: #FAFAFA; border-radius: 14px; padding: 18px 20px; display: flex; gap: 28px; margin-top: 16px; }
  .hero .big { font-size: 26pt; font-weight: 700; }
  .hero .cap { color: #A1A1AA; font-size: 9.5pt; }
  .hero .accent { color: #D4FC18; }
  .highlights { background: #F4F4F5; border-left: 4px solid #D4FC18; border-radius: 8px; padding: 12px 14px; white-space: pre-wrap; line-height: 1.5; }
  table { width: 100%; border-collapse: collapse; }
  td, th { padding: 7px 6px; border-bottom: 1px solid #E4E4E7; vertical-align: middle; }
  th { text-align: left; font-size: 9pt; color: #71717A; text-transform: uppercase; letter-spacing: .6px; }
  .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .bar { width: 34%; }
  .track { height: 6px; background: #E4E4E7; border-radius: 3px; overflow: hidden; }
  .fill { height: 6px; background: #0B0B0C; }
  .fill.over { background: #15803D; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .tile { border: 1px solid #E4E4E7; border-radius: 10px; padding: 10px 12px; page-break-inside: avoid; }
  .tile .label { font-size: 9pt; color: #52525B; }
  .tile .value { font-size: 15pt; font-weight: 700; margin-top: 2px; }
  .delta { font-size: 8.5pt; margin-top: 2px; }
  .delta.up { color: #15803D; } .delta.down { color: #DC2626; }
  .rank { width: 24px; font-weight: 700; }
  section { page-break-inside: avoid; }
  footer { margin-top: 28px; padding-top: 10px; border-top: 1px solid #E4E4E7; font-size: 8.5pt; color: #71717A; display: flex; justify-content: space-between; }
</style></head><body>
<header><div>${logoSvg({ width: 150 })}</div><div class="client"><div class="name">${esc(report.client.name)}</div><div class="muted">${esc(report.month_label)}${report.plan_name ? ` · ${esc(report.plan_name)} tarifi` : ''}</div></div></header>
<h1>${esc(report.month_label)} hisoboti</h1>
<div class="hero">
  <div><div class="big accent">${completion?.value != null ? `${formatNumber(completion.value)}%` : '—'}</div><div class="cap">Kontent reja bajarilishi</div></div>
  <div><div class="big">${planned ? `${formatNumber(delivered)} / ${formatNumber(planned)}` : formatNumber(delivered)}</div><div class="cap">Tarif bo‘yicha yetkazildi</div></div>
  <div><div class="big">${report.top_contents.length ? formatNumber(report.top_contents[0].views) : '—'}</div><div class="cap">Eng yaxshi kontent ko‘rishlari</div></div>
</div>
${report.highlights ? `<h2>Oy yutuqlari</h2><div class="highlights">${esc(report.highlights)}</div>` : ''}
${deliveryRows ? `<section><h2>${SECTION_TITLE.delivery}</h2><table>${deliveryRows}</table></section>` : ''}
${section('social')}
${top ? `<section><h2>Eng yaxshi kontentlar</h2><table><tr><th>#</th><th>Kontent</th><th class="num">Ko‘rish</th><th class="num">Layk</th><th class="num">Izoh</th></tr>${top}</table></section>` : ''}
${section('production')}
${section('approvals')}
${section('calendar')}
<footer><span>${esc(report.title)}</span><span>Ma’lumotlar SUN MEDIA tizimidan olingan</span></footer>
</body></html>`;
}
