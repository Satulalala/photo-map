const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const source = path.join(__dirname, '..', 'public', 'photomap-icon-512.png');
const output = path.join(__dirname, '..', 'build-resources');
const iconSizes = [16, 32, 48, 64, 128, 256, 512];

async function renderPng(size) {
  return sharp(source).resize(size, size, { fit: 'contain' }).png().toBuffer();
}

function createIco(images) {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  let offset = header.length;
  images.forEach(({ size, png }, index) => {
    const entryOffset = 6 + index * 16;
    header.writeUInt8(size === 256 ? 0 : size, entryOffset);
    header.writeUInt8(size === 256 ? 0 : size, entryOffset + 1);
    header.writeUInt8(0, entryOffset + 2);
    header.writeUInt8(0, entryOffset + 3);
    header.writeUInt16LE(1, entryOffset + 4);
    header.writeUInt16LE(32, entryOffset + 6);
    header.writeUInt32LE(png.length, entryOffset + 8);
    header.writeUInt32LE(offset, entryOffset + 12);
    offset += png.length;
  });

  return Buffer.concat([header, ...images.map(({ png }) => png)]);
}

function createIcns(images) {
  const chunkTypes = new Map([[16, 'icp4'], [32, 'icp5'], [64, 'icp6'], [128, 'ic07'], [256, 'ic08'], [512, 'ic09']]);
  const chunks = images
    .filter(({ size }) => chunkTypes.has(size))
    .map(({ size, png }) => {
      const chunk = Buffer.alloc(8);
      chunk.write(chunkTypes.get(size), 0, 4, 'ascii');
      chunk.writeUInt32BE(png.length + 8, 4);
      return Buffer.concat([chunk, png]);
    });
  const header = Buffer.alloc(8);
  header.write('icns', 0, 4, 'ascii');
  header.writeUInt32BE(chunks.reduce((total, chunk) => total + chunk.length, 8), 4);
  return Buffer.concat([header, ...chunks]);
}

async function main() {
  fs.mkdirSync(path.join(output, 'icons'), { recursive: true });
  const images = await Promise.all(iconSizes.map(async size => ({ size, png: await renderPng(size) })));

  for (const { size, png } of images) {
    fs.writeFileSync(path.join(output, 'icons', `${size}x${size}.png`), png);
  }
  fs.writeFileSync(path.join(output, 'photomap.ico'), createIco(images.filter(({ size }) => size <= 256)));
  fs.writeFileSync(path.join(output, 'photomap.icns'), createIcns(images));
}

main().catch(error => {
  console.error('桌面图标生成失败:', error.message);
  process.exitCode = 1;
});
