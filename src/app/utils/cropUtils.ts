// Utility to load an image from a URL
export function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); // needed for cross-origin images
    image.src = url;
  });
}

// Crop the image to the given area and aspect ratio, return as data URL
export async function getCroppedImg(
  imageSrc: string,
  cropPixels: { x: number; y: number; width: number; height: number } | null,
  aspect: number
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  let crop;
  if (cropPixels) {
    crop = cropPixels;
  } else {
    // Center crop for given aspect ratio
    const inputAspect = image.width / image.height;
    let width = image.width;
    let height = image.height;
    if (inputAspect > aspect) {
      // Image is wider than target aspect
      width = image.height * aspect;
    } else {
      // Image is taller than target aspect
      height = image.width / aspect;
    }
    crop = {
      x: (image.width - width) / 2,
      y: (image.height - height) / 2,
      width,
      height,
    };
  }
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2d context');
  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  );
  return canvas.toDataURL('image/jpeg');
} 