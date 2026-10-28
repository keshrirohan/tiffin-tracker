/**
 * Generate PNG icons for the PWA using sharp.
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(__dirname, "..", "public", "icons");

fs.mkdirSync(iconsDir, { recursive: true });

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcon(size) {
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#f97316" rx="${Math.round(size * 0.15)}"/>
  <rect x="${size * 0.15}" y="${size * 0.35}" width="${size * 0.7}" height="${size * 0.12}" fill="white" rx="${size * 0.03}"/>
  <rect x="${size * 0.15}" y="${size * 0.53}" width="${size * 0.7}" height="${size * 0.12}" fill="white" rx="${size * 0.03}"/>
  <circle cx="${size * 0.5}" cy="${size * 0.25}" r="${size * 0.1}" fill="white"/>
  <text x="${size * 0.5}" y="${size * 0.82}" font-family="Arial,sans-serif" font-size="${size * 0.18}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">TIFFIN</text>
</svg>`;

  const pngPath = path.join(iconsDir, `icon-${size}x${size}.png`);
  await sharp(Buffer.from(svgContent))
    .png()
    .toFile(pngPath);
  console.log(`Created ${pngPath}`);
}

(async () => {
  for (const size of sizes) {
    await generateIcon(size);
  }
  console.log("All PNG icons generated!");
})();
