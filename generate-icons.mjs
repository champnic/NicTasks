import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svg = `<svg width="128" height="128" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="108" height="108" rx="24" fill="#ff984f" opacity="0.6"/>
  <rect x="24" y="28" width="80" height="16" rx="8" fill="#FF6B00" />
  <rect x="34" y="56" width="60" height="16" rx="8" fill="#FFFFFF" fill-opacity="0.8" />
  <rect x="34" y="84" width="60" height="16" rx="8" fill="#FFFFFF" fill-opacity="0.8" />
</svg>`;

const iconsDir = 'src-tauri/icons';
const svgBuf = Buffer.from(svg);

// Generate PNGs at various sizes
const pngSizes = [
  { name: '32x32.png', size: 32 },
  { name: '64x64.png', size: 64 },
  { name: '128x128.png', size: 128 },
  { name: '128x128@2x.png', size: 256 },
  { name: 'icon.png', size: 512 },
  // Windows Store logos
  { name: 'Square30x30Logo.png', size: 30 },
  { name: 'Square44x44Logo.png', size: 44 },
  { name: 'Square71x71Logo.png', size: 71 },
  { name: 'Square89x89Logo.png', size: 89 },
  { name: 'Square107x107Logo.png', size: 107 },
  { name: 'Square142x142Logo.png', size: 142 },
  { name: 'Square150x150Logo.png', size: 150 },
  { name: 'Square284x284Logo.png', size: 284 },
  { name: 'Square310x310Logo.png', size: 310 },
  { name: 'StoreLogo.png', size: 50 },
];

// Android icons
const androidSizes = [
  { folder: 'mipmap-hdpi', size: 72 },
  { folder: 'mipmap-mdpi', size: 48 },
  { folder: 'mipmap-xhdpi', size: 96 },
  { folder: 'mipmap-xxhdpi', size: 144 },
  { folder: 'mipmap-xxxhdpi', size: 192 },
];

async function generateIco(svgBuffer, outputPath) {
  // Generate multiple sizes for ICO
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngs = await Promise.all(
    sizes.map(s => sharp(svgBuffer).resize(s, s).png().toBuffer())
  );

  // Simple ICO file format
  const numImages = pngs.length;
  const headerSize = 6 + numImages * 16;
  let dataOffset = headerSize;
  const entries = [];

  for (let i = 0; i < pngs.length; i++) {
    const s = sizes[i];
    entries.push({
      width: s >= 256 ? 0 : s,
      height: s >= 256 ? 0 : s,
      dataSize: pngs[i].length,
      offset: dataOffset,
    });
    dataOffset += pngs[i].length;
  }

  const buf = Buffer.alloc(dataOffset);
  // ICO header
  buf.writeUInt16LE(0, 0); // reserved
  buf.writeUInt16LE(1, 2); // type: ICO
  buf.writeUInt16LE(numImages, 4);

  for (let i = 0; i < entries.length; i++) {
    const off = 6 + i * 16;
    buf.writeUInt8(entries[i].width, off);
    buf.writeUInt8(entries[i].height, off + 1);
    buf.writeUInt8(0, off + 2); // color palette
    buf.writeUInt8(0, off + 3); // reserved
    buf.writeUInt16LE(1, off + 4); // color planes
    buf.writeUInt16LE(32, off + 6); // bits per pixel
    buf.writeUInt32LE(entries[i].dataSize, off + 8);
    buf.writeUInt32LE(entries[i].offset, off + 12);
  }

  for (let i = 0; i < pngs.length; i++) {
    pngs[i].copy(buf, entries[i].offset);
  }

  fs.writeFileSync(outputPath, buf);
}

async function main() {
  console.log('Generating PNG icons...');
  for (const { name, size } of pngSizes) {
    await sharp(svgBuf).resize(size, size).png().toFile(path.join(iconsDir, name));
    console.log(`  ✓ ${name} (${size}x${size})`);
  }

  console.log('Generating Android icons...');
  for (const { folder, size } of androidSizes) {
    const dir = path.join(iconsDir, 'android', folder);
    fs.mkdirSync(dir, { recursive: true });
    await sharp(svgBuf).resize(size, size).png().toFile(path.join(dir, 'ic_launcher.png'));
    console.log(`  ✓ android/${folder}/ic_launcher.png (${size}x${size})`);
  }

  console.log('Generating ICO...');
  await generateIco(svgBuf, path.join(iconsDir, 'icon.ico'));
  console.log('  ✓ icon.ico');

  console.log('Generating ICNS (as 512px PNG fallback)...');
  // For a proper icns you'd need a tool; we'll generate the large PNG that Tauri uses
  await sharp(svgBuf).resize(512, 512).png().toFile(path.join(iconsDir, 'icon.icns'));
  console.log('  ✓ icon.icns');

  console.log('Done!');
}

main().catch(console.error);
