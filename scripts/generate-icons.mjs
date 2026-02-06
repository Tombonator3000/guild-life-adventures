import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const publicDir = join(rootDir, 'public');

const svgBuffer = readFileSync(join(publicDir, 'icon.svg'));

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  for (const size of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(join(publicDir, `pwa-${size}x${size}.png`));
    console.log(`Generated pwa-${size}x${size}.png`);
  }

  // Also generate apple-touch-icon (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(join(publicDir, 'apple-touch-icon.png'));
  console.log('Generated apple-touch-icon.png');

  // Generate maskable icon (with padding for safe zone)
  // Maskable icons need 10% padding on each side, so content area is 80%
  const maskableSize = 512;
  const padding = Math.round(maskableSize * 0.1);
  const contentSize = maskableSize - padding * 2;

  const resizedContent = await sharp(svgBuffer)
    .resize(contentSize, contentSize)
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: maskableSize,
      height: maskableSize,
      channels: 4,
      background: { r: 26, g: 26, b: 46, alpha: 1 } // #1a1a2e
    }
  })
    .composite([{
      input: resizedContent,
      top: padding,
      left: padding,
    }])
    .png()
    .toFile(join(publicDir, 'pwa-maskable-512x512.png'));
  console.log('Generated pwa-maskable-512x512.png');

  console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);
