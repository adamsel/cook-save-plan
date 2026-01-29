// Generate PWA icons from the favicon SVG
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

// SVG content for the app icon (green background with utensils)
const svgIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#10b981"/>
  <g transform="translate(96, 96) scale(16)" stroke="#fff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <!-- Fork going diagonal (top-left to bottom-right) -->
    <path d="M2 2l16 16"/>
    <path d="M2 2v4l2 2"/>
    <path d="M4 2v2"/>
    <path d="M6 2v4l-2 2"/>
    <!-- Knife going diagonal (top-right to bottom-left) -->
    <path d="M18 2L2 18"/>
    <path d="M18 2c0 0 0 4-2 6l-4 4"/>
  </g>
</svg>
`;

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
];

async function generateIcons() {
  console.log('Generating PWA icons...');

  for (const { name, size } of sizes) {
    const outputPath = path.join(publicDir, name);

    await sharp(Buffer.from(svgIcon))
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`  Created ${name} (${size}x${size})`);
  }

  console.log('Done!');
}

generateIcons().catch(console.error);
