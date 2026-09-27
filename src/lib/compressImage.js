/**
 * Compress an image File to JPEG via canvas before Firestore media upload.
 * Falls back to createImageBitmap / Image for HEIC and other formats browsers can decode.
 */

const DEFAULTS = {
  maxWidth: 720,
  maxHeight: 720,
  quality: 0.72,
  maxBytes: 650 * 1024,
  preferBytes: 300 * 1024,
};

async function loadBitmap(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // HEIC / exotic formats may fail — try HTMLImageElement fallback
    }
  }
  return loadViaImageElement(file);
}

function loadViaImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not decode this image. Try a JPEG or PNG.'));
    };
    img.src = url;
  });
}

function drawScaled(source, maxWidth, maxHeight) {
  const srcW = source.width || source.naturalWidth;
  const srcH = source.height || source.naturalHeight;
  if (!srcW || !srcH) throw new Error('Invalid image dimensions');

  let width = srcW;
  let height = srcH;
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(source, 0, 0, width, height);
  return { canvas, width, height };
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('Image compression failed'));
        else resolve(blob);
      },
      'image/jpeg',
      quality,
    );
  });
}

/**
 * @param {File|Blob} file
 * @param {{ maxWidth?: number, maxHeight?: number, quality?: number, maxBytes?: number, preferBytes?: number }} [opts]
 * @returns {Promise<{ blob: Blob, mimeType: string, width: number, height: number }>}
 */
export async function compressImageFile(file, opts = {}) {
  const maxWidth = opts.maxWidth ?? DEFAULTS.maxWidth;
  const maxHeight = opts.maxHeight ?? DEFAULTS.maxHeight;
  let quality = opts.quality ?? DEFAULTS.quality;
  const maxBytes = opts.maxBytes ?? DEFAULTS.maxBytes;
  const preferBytes = opts.preferBytes ?? DEFAULTS.preferBytes;

  if (!file) throw new Error('No image selected');

  const source = await loadBitmap(file);
  try {
    const { canvas, width, height } = drawScaled(source, maxWidth, maxHeight);
    let blob = await canvasToBlob(canvas, quality);

    // Iterate quality down until under maxBytes (prefer under preferBytes when possible)
    let attempts = 0;
    while (blob.size > preferBytes && quality > 0.4 && attempts < 6) {
      quality = Math.max(0.4, quality - 0.08);
      blob = await canvasToBlob(canvas, quality);
      attempts += 1;
    }
    while (blob.size > maxBytes && quality > 0.28 && attempts < 12) {
      quality = Math.max(0.28, quality - 0.06);
      blob = await canvasToBlob(canvas, quality);
      attempts += 1;
    }

    if (blob.size > maxBytes) {
      // Last resort: shrink dimensions further
      const shrink = drawScaled(source, Math.round(maxWidth * 0.7), Math.round(maxHeight * 0.7));
      blob = await canvasToBlob(shrink.canvas, 0.55);
      if (blob.size > maxBytes) {
        throw new Error('Photo is still too large after compression. Try a smaller picture.');
      }
      return {
        blob,
        mimeType: 'image/jpeg',
        width: shrink.width,
        height: shrink.height,
      };
    }

    return { blob, mimeType: 'image/jpeg', width, height };
  } finally {
    if (typeof source.close === 'function') source.close();
  }
}
