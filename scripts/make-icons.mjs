/** Renders the flat Coolzy cup mark to PWA icons and the favicon. Run: node scripts/make-icons.mjs */
import sharp from "sharp";
import { writeFileSync, mkdirSync } from "node:fs";

const mark = (size, pad) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
  <rect width="512" height="512" rx="${pad ? 0 : 112}" fill="#0E0C0B"/>
  <g transform="translate(${pad ? 96 : 64} ${pad ? 96 : 64}) scale(${pad ? 0.625 : 0.75})">
    <path d="M64 128h256a24 24 0 0 1 24 24v120c0 88-64 152-152 152S40 360 40 272V152a24 24 0 0 1 24-24z" fill="#F2EBE1"/>
    <path d="M344 176h40a56 56 0 0 1 0 112h-40" fill="none" stroke="#F2EBE1" stroke-width="40" stroke-linecap="round"/>
    <rect x="64" y="128" width="256" height="40" fill="#E4457E"/>
    <path d="M120 40c0-24 24-24 24-48M200 40c0-24 24-24 24-48M280 40c0-24 24-24 24-48" fill="none" stroke="#F2EBE1" stroke-width="20" stroke-linecap="round"/>
  </g>
</svg>`;

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/favicon.svg", mark(64, false));
await sharp(Buffer.from(mark(512, false))).png().toFile("public/icons/icon-512.png");
await sharp(Buffer.from(mark(192, false))).png().toFile("public/icons/icon-192.png");
await sharp(Buffer.from(mark(512, true))).png().toFile("public/icons/maskable-512.png");
await sharp(Buffer.from(mark(180, false))).png().toFile("public/icons/apple-touch-icon.png");
console.log("icons written");
