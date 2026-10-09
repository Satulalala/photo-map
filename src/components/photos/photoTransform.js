export const normalizeRotation = rotation => ((rotation % 360) + 360) % 360;

export function fitPhoto(width, height, rotation, availableWidth, availableHeight) {
  const sideways = normalizeRotation(rotation) % 180 !== 0;
  const rotatedWidth = sideways ? height : width;
  const rotatedHeight = sideways ? width : height;
  const scale = Math.min(1, availableWidth / rotatedWidth, availableHeight / rotatedHeight);
  return {
    width: rotatedWidth * scale,
    height: rotatedHeight * scale,
    imageWidth: width * scale,
    imageHeight: height * scale,
  };
}

export function cropToPixels(crop, display, width, height) {
  const x = Math.max(0, Math.round((crop.x * width) / display.width));
  const y = Math.max(0, Math.round((crop.y * height) / display.height));
  return {
    x,
    y,
    width: Math.min(width - x, Math.max(1, Math.round((crop.width * width) / display.width))),
    height: Math.min(height - y, Math.max(1, Math.round((crop.height * height) / display.height))),
  };
}

export async function exportPhoto(url, rotation, crop, display) {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.src = url;
  await image.decode();
  const angle = normalizeRotation(rotation);
  const sideways = angle % 180 !== 0;
  const canvas = document.createElement('canvas');
  canvas.width = sideways ? image.naturalHeight : image.naturalWidth;
  canvas.height = sideways ? image.naturalWidth : image.naturalHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('无法创建图像画布');
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((angle * Math.PI) / 180);
  context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
  let output = canvas;
  if (crop) {
    const pixels = cropToPixels(crop, display, canvas.width, canvas.height);
    output = document.createElement('canvas');
    output.width = pixels.width;
    output.height = pixels.height;
    output
      .getContext('2d')
      .drawImage(
        canvas,
        pixels.x,
        pixels.y,
        pixels.width,
        pixels.height,
        0,
        0,
        pixels.width,
        pixels.height
      );
  }
  return new Promise((resolve, reject) =>
    output.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('照片导出失败'))),
      'image/jpeg',
      0.92
    )
  );
}
