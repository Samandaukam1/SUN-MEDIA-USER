import geometry from './logo-geometry.json';

type Point = number[];

const ringPath = (ring: Point[]) => `M${ring.map(([x, y]) => `${x} ${y}`).join('L')}Z`;

/** The official logo as standalone SVG markup (for HTML documents such as report PDFs). */
export function logoSvg({ width = 160, mediaColor = '#0B0B0C' }: { width?: number; mediaColor?: string } = {}): string {
  const [w, h] = geometry.viewBox;
  const { box, accentBar: bar, colors: c, tagline } = geometry;
  const sun = geometry.sun.map((line) => `<polyline points="${line.map(([x, y]) => `${x},${y}`).join(' ')}"/>`).join('');
  const media = geometry.media.map((rings) => `<path d="${rings.map(ringPath).join('')}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${(width * h) / w}" viewBox="0 0 ${w} ${h}" role="img" aria-label="SUN MEDIA">
<defs><linearGradient id="sm-silver" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.silverTop}"/><stop offset="1" stop-color="${c.silverBottom}"/></linearGradient></defs>
<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="${box.r}" fill="${c.ink}"/>
<g fill="none" stroke="url(#sm-silver)" stroke-width="${geometry.sunStroke}" stroke-linejoin="round">${sun}</g>
<text x="${tagline.x}" y="${tagline.y}" fill="#C8C8CC" font-size="${tagline.size}" font-family="-apple-system, Helvetica, Arial, sans-serif" font-weight="600" letter-spacing="${tagline.spacing}" text-anchor="middle">${tagline.text}</text>
<g fill="${mediaColor}" fill-rule="evenodd">${media}</g>
<rect x="${bar.x}" y="${bar.y}" width="${bar.w}" height="${bar.h}" fill="${c.lime}"/>
</svg>`;
}
