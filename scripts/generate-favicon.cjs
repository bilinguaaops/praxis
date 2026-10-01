const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

// High resolution master SVG corresponding to Praxis logo icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="praxisGrad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#581C87" />
      <stop offset="20%" stop-color="#4F46E5" />
      <stop offset="55%" stop-color="#2563EB" />
      <stop offset="85%" stop-color="#0284C7" />
      <stop offset="100%" stop-color="#06B6D4" />
    </linearGradient>
    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feColorMatrix type="matrix" values="1 1 1 0 0   1 1 1 0 0   1 1 1 0 0  0 0 0 0.55 0" />
      <feMerge>
        <feMergeNode />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
  <!-- Rounded squircle container with sleek border highlight -->
  <rect width="512" height="512" rx="118" ry="118" fill="url(#praxisGrad)" />
  
  <!-- Subtle inner radial glow in center for lighting -->
  <circle cx="256" cy="245" r="160" fill="#3B82F6" opacity="0.35" filter="blur(28px)" />

  <!-- Graduation Cap Praxis Symbol (Crisp white stroke with subtle bloom) -->
  <g transform="translate(98, 102) scale(13.16)" fill="none" stroke="#FFFFFF" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" filter="url(#softGlow)">
    <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
    <path d="M22 10v6" />
    <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
  </g>
</svg>`;

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Save vector SVG for modern browsers
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent, 'utf8');
console.log('Saved public/favicon.svg');

// 2. Render PNG at various sizes
function renderPng(size, filename) {
  const resvg = new Resvg(svgContent, {
    fitTo: { mode: 'width', value: size },
    shapeRendering: 2, // geometricPrecision
    textRendering: 1,
    imageRendering: 0,
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  fs.writeFileSync(path.join(publicDir, filename), pngBuffer);
  console.log(`Rendered ${filename} (${size}x${size}, ${pngBuffer.length} bytes)`);
}

// Render sizes
renderPng(48, 'favicon.png');
renderPng(32, 'favicon-32x32.png');
renderPng(16, 'favicon-16x16.png');
renderPng(180, 'apple-touch-icon.png');
renderPng(180, 'apple-touch-icon-precomposed.png');
renderPng(192, 'icon-192.png');
renderPng(512, 'icon-512.png');

console.log('Favicon generation completed successfully!');
