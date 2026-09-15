import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const sourcePath = new URL('../src/assets/game-board.jpeg', import.meta.url).pathname;
const outputDir = new URL('../public/board3d/backgrounds/', import.meta.url).pathname;

// Crops are deliberately explicit: this keeps the 2D reference board intact while
// producing one replaceable JPG plate for every canonical 3D landmark.
const crops = [
  { id: 'noble-heights', x: 0, y: 0, width: 900, height: 900 },
  { id: 'graveyard', x: 0, y: 650, width: 850, height: 700 },
  { id: 'general-store', x: 100, y: 1050, width: 950, height: 850 },
  { id: 'bank', x: 100, y: 1750, width: 900, height: 800 },
  { id: 'forge', x: 0, y: 2450, width: 1050, height: 942 },
  { id: 'guild-hall', x: 1350, y: 2450, width: 1150, height: 900 },
  { id: 'cave', x: 2300, y: 2500, width: 1150, height: 892 },
  { id: 'academy', x: 3100, y: 2450, width: 1350, height: 942 },
  { id: 'enchanter', x: 4160, y: 1850, width: 896, height: 1542 },
  { id: 'armory', x: 4050, y: 1050, width: 1006, height: 1150 },
  { id: 'rusty-tankard', x: 4300, y: 450, width: 756, height: 1050 },
  { id: 'shadow-market', x: 2050, y: 0, width: 1150, height: 800 },
  { id: 'fence', x: 3150, y: 0, width: 900, height: 850 },
  { id: 'slums', x: 4200, y: 0, width: 856, height: 850 },
  { id: 'landlord', x: 1300, y: 0, width: 850, height: 820 },
];

const metadata = await sharp(sourcePath).metadata();
if (metadata.width !== 5056 || metadata.height !== 3392) {
  throw new Error(`Unexpected board dimensions: ${metadata.width}x${metadata.height}`);
}

await mkdir(outputDir, { recursive: true });
await Promise.all(crops.map(async (crop) => {
  await sharp(sourcePath)
    .extract({ left: crop.x, top: crop.y, width: crop.width, height: crop.height })
    .resize({ width: 1280, withoutEnlargement: true })
    .jpeg({ quality: 90, mozjpeg: true })
    .toFile(`${outputDir}${crop.id}.jpg`);
}));

const manifest = {
  source: 'src/assets/game-board.jpeg',
  sourceSize: { width: metadata.width, height: metadata.height },
  output: 'public/board3d/backgrounds',
  format: 'JPEG',
  maxWidth: 1280,
  backgrounds: crops,
};
await writeFile(`${outputDir}manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Created ${crops.length} landmark JPG backgrounds in ${outputDir}`);
