import sharp from 'sharp';

const og = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="resplandor" cx="81%" cy="38%" r="65%">
      <stop offset="0" stop-color="#e89105" stop-opacity=".28"/>
      <stop offset=".38" stop-color="#4a2700" stop-opacity=".19"/>
      <stop offset="1" stop-color="#080000" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="bronce" x1="0" x2="1">
      <stop stop-color="#e89105"/><stop offset="1" stop-color="#f5a305"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="#080000"/>
  <rect width="1200" height="630" fill="url(#resplandor)"/>
  <g fill="#e89105" opacity=".16">
    <path d="m965 84 110 50-72 54z"/><path d="m1055 190 92 44-58 66z"/><path d="m859 171 91 63-98 29z"/>
    <path d="m991 315 142 77-95 83z"/><path d="m824 366 111 34-49 93z"/><path d="m1044 498 86 29-66 47z"/>
  </g>
  <g font-family="Arial, Helvetica, sans-serif" fill="#f2f3f5" font-weight="700" letter-spacing="-5">
    <text x="88" y="228" font-size="98">ALEJANDRO</text>
    <text x="88" y="322" font-size="98">COUSO</text>
  </g>
  <text x="92" y="395" font-family="Arial, Helvetica, sans-serif" font-size="27" fill="#b2aba1" letter-spacing="1.2">SISTEMAS DE IA APLICADA</text>
  <text x="92" y="432" font-family="Arial, Helvetica, sans-serif" font-size="27" fill="#e89105" letter-spacing="1.2">Y PRODUCTO PROPIO.</text>
  <g transform="translate(92 535)"><rect width="32" height="32" rx="7" fill="#b2aba1"/><path d="M16 6.5 26 24H6z" fill="#080000"/><text x="49" y="25" font-family="Arial, Helvetica, sans-serif" font-size="25" font-weight="700" fill="#b2aba1" letter-spacing="2">ACVX.ES</text></g>
</svg>`;

const icon = `
<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="#b2aba1"/>
  <path d="M16 6.5 26 24H6z" fill="#080000"/>
</svg>`;

await sharp(Buffer.from(og)).png({ compressionLevel: 9 }).toFile('public/og.png');
await sharp(Buffer.from(og)).png({ compressionLevel: 9 }).toFile('public/og-alejandro-couso.png');
await sharp(Buffer.from(icon)).png({ compressionLevel: 9 }).toFile('public/apple-touch-icon.png');
