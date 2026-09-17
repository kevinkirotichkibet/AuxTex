// Materials store their photo as a data URL directly on the document
// (Material.images[0]) rather than in separate object storage — there's no
// S3/Cloudinary wired up yet, and this keeps things working with zero new
// infrastructure. The trade-off is document size, so every upload gets
// downscaled and re-encoded as JPEG first rather than storing the raw file.
export async function fileToCompressedDataUrl(
  file: File,
  maxDim = 500,
  quality = 0.82,
): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process that image in this browser.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', quality);
}
