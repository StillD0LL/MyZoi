/**
 * Client-side image compression utility.
 * Downscales large uploaded images to web-friendly dimensions and encodes as JPEG
 * to prevent browser Storage QuotaExceededError and keep Google Drive sync fast.
 */

export async function compressImageFileToDataUrl(
  file: File,
  maxDimension: number = 1400,
  quality: number = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const rawResult = reader.result;
      if (typeof rawResult !== 'string') {
        reject(new Error('Invalid file data.'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          const srcW = Math.max(1, img.naturalWidth || img.width);
          const srcH = Math.max(1, img.naturalHeight || img.height);
          const scale = Math.min(1, maxDimension / Math.max(srcW, srcH));
          const targetW = Math.max(1, Math.round(srcW * scale));
          const targetH = Math.max(1, Math.round(srcH * scale));

          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(rawResult);
            return;
          }

          ctx.fillStyle = '#090D14';
          ctx.fillRect(0, 0, targetW, targetH);
          ctx.drawImage(img, 0, 0, targetW, targetH);

          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        } catch {
          resolve(rawResult);
        }
      };
      img.onerror = () => resolve(rawResult);
      img.src = rawResult;
    };
    reader.readAsDataURL(file);
  });
}
