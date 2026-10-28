import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Orange rounded square with a tiffin box icon
const svgFavicon = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="8" fill="#f97316"/>
  <!-- tiffin lid -->
  <rect x="6" y="9" width="20" height="4" rx="2" fill="white"/>
  <!-- tiffin body top -->
  <rect x="7" y="14" width="18" height="2" rx="1" fill="white" opacity="0.8"/>
  <!-- tiffin body -->
  <rect x="7" y="17" width="18" height="7" rx="2" fill="white"/>
  <!-- handle -->
  <rect x="13" y="7" width="6" height="3" rx="1.5" fill="white" opacity="0.9"/>
</svg>`;

const svgFavicon16 = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
  <rect width="16" height="16" rx="4" fill="#f97316"/>
  <rect x="3" y="4" width="10" height="3" rx="1.5" fill="white"/>
  <rect x="3" y="8" width="10" height="4" rx="1" fill="white" opacity="0.9"/>
  <rect x="6" y="3" width="4" height="2" rx="1" fill="white" opacity="0.8"/>
</svg>`;

const publicDir = path.join(__dirname, "..", "public");
const appDir = path.join(__dirname, "..", "src", "app");

// favicon.png (32x32) for <link rel="icon">
await sharp(Buffer.from(svgFavicon)).png().toFile(path.join(publicDir, "favicon.png"));
console.log("✅ public/favicon.png (32x32)");

// favicon-16.png
await sharp(Buffer.from(svgFavicon16)).png().toFile(path.join(publicDir, "favicon-16.png"));
console.log("✅ public/favicon-16.png");

// favicon-32.png
await sharp(Buffer.from(svgFavicon)).png().toFile(path.join(publicDir, "favicon-32.png"));
console.log("✅ public/favicon-32.png");

// apple-touch-icon (180x180)
const svgApple = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
  <rect width="180" height="180" rx="40" fill="#f97316"/>
  <rect x="30" y="50" width="120" height="28" rx="10" fill="white"/>
  <rect x="34" y="82" width="112" height="14" rx="5" fill="white" opacity="0.8"/>
  <rect x="34" y="100" width="112" height="40" rx="10" fill="white"/>
  <rect x="72" y="34" width="36" height="20" rx="8" fill="white" opacity="0.9"/>
</svg>`;
await sharp(Buffer.from(svgApple)).png().toFile(path.join(publicDir, "apple-touch-icon.png"));
console.log("✅ public/apple-touch-icon.png (180x180)");

// Also regenerate all icon sizes with the clean design
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
for (const size of sizes) {
  const r = Math.round(size * 0.12);
  const lh = Math.round(size * 0.155);   // lid height
  const lx = Math.round(size * 0.17);    // lid x
  const lw = Math.round(size * 0.66);    // lid width
  const by = Math.round(size * 0.44);    // body y
  const bh = Math.round(size * 0.26);    // body height
  const hx = Math.round(size * 0.38);    // handle x
  const hw = Math.round(size * 0.24);    // handle width
  const hy = Math.round(size * 0.18);    // handle y
  const hh = Math.round(size * 0.1);     // handle height

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size*0.2)}" fill="#f97316"/>
  <rect x="${lx}" y="${Math.round(size*0.29)}" width="${lw}" height="${lh}" rx="${Math.round(lh/2)}" fill="white"/>
  <rect x="${lx}" y="${Math.round(size*0.46)}" width="${lw}" height="${Math.round(size*0.06)}" rx="${Math.round(size*0.03)}" fill="white" opacity="0.7"/>
  <rect x="${lx}" y="${by}" width="${lw}" height="${bh}" rx="${Math.round(size*0.06)}" fill="white"/>
  <rect x="${hx}" y="${hy}" width="${hw}" height="${hh}" rx="${Math.round(hh/2)}" fill="white" opacity="0.9"/>
</svg>`;

  const iconPath = path.join(publicDir, "icons", `icon-${size}x${size}.png`);
  await sharp(Buffer.from(svg)).png().toFile(iconPath);
  console.log(`✅ icon-${size}x${size}.png`);
}

console.log("\nAll favicons and icons generated!");
