/**
 * Simple icon generator using canvas (node-canvas).
 * Creates PNG icons for the PWA in various sizes.
 * 
 * If node-canvas is not available, this script creates SVG placeholder icons instead.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(__dirname, "..", "public", "icons");

// Ensure icons directory exists
fs.mkdirSync(iconsDir, { recursive: true });

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Create a simple SVG icon for each size
for (const size of sizes) {
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#f97316" rx="${size * 0.15}"/>
  <text x="50%" y="55%" font-family="Arial,sans-serif" font-size="${size * 0.45}" fill="white" text-anchor="middle" dominant-baseline="middle">🍱</text>
</svg>`;
  
  const svgPath = path.join(iconsDir, `icon-${size}x${size}.svg`);
  fs.writeFileSync(svgPath, svgContent);
  console.log(`Created ${svgPath}`);
}

console.log("SVG icons generated. For production, convert these to PNG.");
