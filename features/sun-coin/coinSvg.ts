import geometry from '../../components/brand/logo-geometry.json';

const ringPath = (ring: number[][]) => `M${ring.map(([x, y]) => `${x} ${y}`).join('L')}Z`;

/** Transparent, resolution-independent SUN Coin (with its drop shadow). The centre is the official brand geometry. */
export function sunCoinSvg(id = 'sun-coin'): string {
  return coinSvg(id, '0 0 256 256', true);
}

/**
 * Just the coin disc, cropped to its circle (centre 128,126 · radius 121) and without the drop shadow, so it fills
 * a round mask exactly — for the animated coin and small icons.
 */
export function sunCoinFaceSvg(id = 'sun-coin-face'): string {
  return coinSvg(id, '7 5 242 242', false);
}

function coinSvg(id: string, viewBox: string, shadow: boolean): string {
  const sun = geometry.sun.map((line) => `<polyline points="${line.map(([x, y]) => `${x},${y}`).join(' ')}"/>`).join('');
  const media = geometry.media.map((rings) => `<path d="${rings.map(ringPath).join('')}"/>`).join('');
  const { accentBar: bar } = geometry;
  const [, , w, h] = viewBox.split(' ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${viewBox}" role="img" aria-label="SUN Coin">
<defs>
  <linearGradient id="${id}-rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.24" stop-color="#BEC0C7"/><stop offset="0.5" stop-color="#F6F8EF"/><stop offset="0.73" stop-color="#777B83"/><stop offset="1" stop-color="#D9DCCB"/></linearGradient>
  <linearGradient id="${id}-face" x1="0" y1="0" x2="0.8" y2="1"><stop offset="0" stop-color="#343637"/><stop offset="0.48" stop-color="#131515"/><stop offset="1" stop-color="#262B18"/></linearGradient>
  <linearGradient id="${id}-silver" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${geometry.colors.silverTop}"/><stop offset="1" stop-color="${geometry.colors.silverBottom}"/></linearGradient>
  <linearGradient id="${id}-edge" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#D4FC18"/><stop offset="0.48" stop-color="#F7FFE0"/><stop offset="1" stop-color="#8EAA15"/></linearGradient>
</defs>
${shadow ? '<circle cx="128" cy="130" r="121" fill="#090B0A"/>' : ''}
<circle cx="128" cy="126" r="121" fill="url(#${id}-rim)" stroke="#6D7275" stroke-width="1.5"/>
<circle cx="128" cy="126" r="114" fill="#343837" stroke="#FBFFF1" stroke-width="1.2"/>
<circle cx="128" cy="126" r="110" fill="url(#${id}-face)" stroke="url(#${id}-edge)" stroke-width="2.5"/>
<circle cx="128" cy="126" r="99" fill="none" stroke="#E8F2C4" stroke-opacity="0.17" stroke-width="1"/>
<path d="M46 66A102 102 0 0 1 201 56" fill="none" stroke="#FFFFFF" stroke-opacity="0.19" stroke-width="3" stroke-linecap="round"/>
<path d="M59 207A106 106 0 0 0 198 203" fill="none" stroke="#D4FC18" stroke-opacity="0.54" stroke-width="2" stroke-linecap="round"/>
<g transform="translate(38 76) scale(0.383)">
  <g fill="none" stroke="url(#${id}-silver)" stroke-width="${geometry.sunStroke}" stroke-linejoin="round" stroke-linecap="butt">${sun}</g>
  <g fill="#F4F4F5" fill-rule="evenodd">${media}</g>
  <rect x="${bar.x}" y="${bar.y}" width="${bar.w}" height="${bar.h}" fill="${geometry.colors.lime}"/>
</g>
<text x="129" y="188" fill="#E7F0CC" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="700" letter-spacing="3" text-anchor="middle">SUN COIN</text>
<path d="M119 50h18" stroke="#D4FC18" stroke-width="3" stroke-linecap="round"/>
<circle cx="48" cy="177" r="2" fill="#D4FC18"/><circle cx="208" cy="177" r="2" fill="#D4FC18"/>
</svg>`;
}
