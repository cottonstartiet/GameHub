// Generates PWA icons + favicon from an inline SVG using sharp.
// Run with: npm run gen:icons
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '..', 'public');
const iconsDir = resolve(publicDir, 'icons');

// `pad` (0..1) reserves a safe zone for maskable icons.
function svg(pad = 0) {
  const inset = Math.round(512 * pad);
  const s = 512 - inset * 2;
  const x = inset;
  const y = inset;
  // Snake body: circles along an S curve, in grid units of the inner box.
  const u = s / 10;
  const cx = (gx) => x + gx * u;
  const cy = (gy) => y + gy * u;
  const body = [
    [2.2, 7.6],
    [3.4, 7.6],
    [4.6, 7.4],
    [5.4, 6.4],
    [5.4, 5.2],
    [4.6, 4.4],
    [3.6, 4.2],
    [3.0, 3.2],
    [3.4, 2.2],
    [4.6, 2.0],
  ];
  const segs = body
    .map(([gx, gy], i) => {
      const r = i === body.length - 1 ? u * 0.85 : u * 0.72;
      const fill = i === body.length - 1 ? '#5cf0c6' : '#46e0b8';
      return `<circle cx="${cx(gx).toFixed(1)}" cy="${cy(gy).toFixed(
        1
      )}" r="${r.toFixed(1)}" fill="${fill}" stroke="#0a3d30" stroke-width="${(
        u * 0.12
      ).toFixed(1)}"/>`;
    })
    .join('');
  const head = body[body.length - 1];
  const eye = `<circle cx="${(cx(head[0]) + u * 0.35).toFixed(1)}" cy="${(
    cy(head[1]) -
    u * 0.2
  ).toFixed(1)}" r="${(u * 0.18).toFixed(1)}" fill="#04122b"/>`;
  const food = `<circle cx="${cx(7.4).toFixed(1)}" cy="${cy(7.4).toFixed(
    1
  )}" r="${(u * 0.7).toFixed(1)}" fill="#ff5470" stroke="#fff" stroke-opacity="0.5" stroke-width="${(
    u * 0.1
  ).toFixed(1)}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#10173f"/>
      <stop offset="1" stop-color="#0a0f2c"/>
    </linearGradient>
    <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2f8fff"/>
      <stop offset="1" stop-color="#003791"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <rect x="${x + u * 0.4}" y="${y + u * 0.4}" width="${s - u * 0.8}" height="${
    s - u * 0.8
  }" rx="${u * 1.2}" fill="none" stroke="url(#ring)" stroke-width="${(
    u * 0.35
  ).toFixed(1)}" opacity="0.7"/>
  ${food}
  ${segs}
  ${eye}
</svg>`;
}

async function main() {
  await mkdir(iconsDir, { recursive: true });
  const normal = Buffer.from(svg(0));
  const maskable = Buffer.from(svg(0.12));

  await sharp(normal).resize(192, 192).png().toFile(resolve(iconsDir, 'pwa-192.png'));
  await sharp(normal).resize(512, 512).png().toFile(resolve(iconsDir, 'pwa-512.png'));
  await sharp(maskable)
    .resize(512, 512)
    .png()
    .toFile(resolve(iconsDir, 'maskable-512.png'));
  await sharp(normal).resize(180, 180).png().toFile(resolve(publicDir, 'apple-touch-icon.png'));
  await writeFile(resolve(publicDir, 'favicon.svg'), svg(0), 'utf8');

  console.log('Icons generated in public/ and public/icons/.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
