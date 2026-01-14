/**
 * Image cropping utility using HTML5 Canvas
 * Creates a cropped image from the specified area
 */

export interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Creates a cropped image from a source image using canvas
 * @param imageSrc - The source image URL or data URL
 * @param pixelCrop - The crop area in pixels
 * @param outputType - Output format (default: 'image/jpeg')
 * @param quality - Output quality 0-1 (default: 0.85)
 * @returns Promise<Blob> - The cropped image as a Blob
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  outputType: 'image/jpeg' | 'image/webp' = 'image/jpeg',
  quality: number = 0.85
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context available');
  }

  // Set canvas size to the desired crop size
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Draw the cropped image onto the canvas
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  // Convert canvas to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas is empty'));
        }
      },
      outputType,
      quality
    );
  });
}

/**
 * Creates an HTMLImageElement from a source URL
 */
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });
}

/**
 * Reads a file and returns it as a data URL
 */
export function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file'));
      }
    });
    reader.addEventListener('error', reject);
    reader.readAsDataURL(file);
  });
}
