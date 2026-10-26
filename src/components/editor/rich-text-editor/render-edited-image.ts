import { resolveMediaDisplayUrl } from '@/lib/uploads/upload-url';

export type PixelCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('image-load'));
    image.src = src;
  });
}

async function canvasToBlob(canvas: HTMLCanvasElement, mime: string): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((value) => resolve(value), mime, 0.92);
  });
  if (!blob) throw new Error('image-export');
  return blob;
}

/** Load pixels we can draw without tainting the canvas. */
export async function loadEditableImage(src: string): Promise<HTMLImageElement> {
  const display = resolveMediaDisplayUrl(src);
  try {
    const response = await fetch(display, { credentials: 'same-origin' });
    if (!response.ok) throw new Error('fetch');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    try {
      return await loadImage(url);
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('image-load'));
      image.src = display;
    });
    return image;
  }
}

export async function imageToObjectUrl(
  image: HTMLImageElement,
  flipX: boolean,
  flipY: boolean,
  rotation = 0,
): Promise<string> {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const rot = ((rotation % 360) + 360) % 360;
  const quarter = rot === 90 || rot === 270;
  const canvas = document.createElement('canvas');
  canvas.width = quarter ? height : width;
  canvas.height = quarter ? width : height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('canvas');
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((rot * Math.PI) / 180);
  context.scale(flipX ? -1 : 1, flipY ? -1 : 1);
  context.drawImage(image, -width / 2, -height / 2);
  const blob = await canvasToBlob(canvas, 'image/png');
  return URL.createObjectURL(blob);
}

export type ImageFilterId =
  | 'none'
  | 'grayscale'
  | 'sepia'
  | 'warm'
  | 'cool'
  | 'vivid'
  | 'fade'
  | 'dramatic'
  | 'noir';

export function imageFilterCss(id: ImageFilterId, brightness = 100, contrast = 100): string {
  const tone = `brightness(${brightness}%) contrast(${contrast}%)`;
  switch (id) {
    case 'grayscale':
      return `${tone} grayscale(1)`;
    case 'sepia':
      return `${tone} sepia(0.7)`;
    case 'warm':
      return `${tone} sepia(0.28) saturate(1.25)`;
    case 'cool':
      return `${tone} saturate(0.9) hue-rotate(18deg)`;
    case 'vivid':
      return `brightness(${brightness}%) contrast(${contrast}%) saturate(1.55)`;
    case 'fade':
      return `brightness(${brightness + 10}%) contrast(${Math.max(60, contrast - 20)}%) saturate(0.75)`;
    case 'dramatic':
      return `brightness(${Math.max(70, brightness - 8)}%) contrast(${contrast + 30}%) saturate(1.15)`;
    case 'noir':
      return `brightness(${brightness}%) contrast(${contrast + 20}%) grayscale(1)`;
    default:
      return tone;
  }
}

function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = (rotation * Math.PI) / 180;
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

export async function renderCroppedImage(options: {
  src: string;
  pixelCrop: PixelCrop;
  rotation: number;
  filter: string;
  mime: string;
}): Promise<Blob> {
  const image = await loadImage(options.src);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('canvas');

  const rotRad = (options.rotation * Math.PI) / 180;
  const bounds = rotateSize(image.width, image.height, options.rotation);
  canvas.width = Math.max(1, Math.round(bounds.width));
  canvas.height = Math.max(1, Math.round(bounds.height));

  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(rotRad);
  context.translate(-image.width / 2, -image.height / 2);
  context.drawImage(image, 0, 0);

  const output = document.createElement('canvas');
  const outputContext = output.getContext('2d');
  if (!outputContext) throw new Error('canvas');
  const width = Math.max(1, Math.round(options.pixelCrop.width));
  const height = Math.max(1, Math.round(options.pixelCrop.height));
  output.width = width;
  output.height = height;
  outputContext.filter = options.filter;
  outputContext.drawImage(
    canvas,
    options.pixelCrop.x,
    options.pixelCrop.y,
    options.pixelCrop.width,
    options.pixelCrop.height,
    0,
    0,
    width,
    height,
  );

  return canvasToBlob(output, options.mime);
}

/** Draw a photo into a fixed cover frame. Contain keeps every pixel. Fill stretches. Crop uses a region. */
export async function renderFramedImage(options: {
  src: string;
  aspect: number;
  outputWidth: number;
  fit: 'contain' | 'fill' | 'crop';
  focusX: number;
  focusY: number;
  /** 1 keeps the whole photo inside the frame. Higher values enlarge it and crop the overflow. */
  zoom?: number;
  /** Independent scales for contain. 1 matches the fitted photo. Omit to use zoom for both axes. */
  scaleX?: number;
  scaleY?: number;
  crop?: { x: number; y: number; w: number; h: number };
  filter: string;
  mime: string;
  background?: string;
}): Promise<Blob> {
  const image = await loadImage(options.src);
  const outW = Math.max(1, Math.round(options.outputWidth));
  const outH = Math.max(1, Math.round(outW / Math.max(options.aspect, 0.01)));
  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('canvas');

  const sourceW = image.naturalWidth || image.width;
  const sourceH = image.naturalHeight || image.height;
  context.fillStyle = options.background || '#f4f4f5';
  context.fillRect(0, 0, outW, outH);
  context.filter = options.filter;

  if (options.fit === 'crop' && options.crop) {
    const crop = options.crop;
    context.drawImage(
      image,
      crop.x * sourceW,
      crop.y * sourceH,
      Math.max(1, crop.w * sourceW),
      Math.max(1, crop.h * sourceH),
      0,
      0,
      outW,
      outH,
    );
    return canvasToBlob(canvas, options.mime);
  }

  if (options.fit === 'fill') {
    context.drawImage(image, 0, 0, outW, outH);
    return canvasToBlob(canvas, options.mime);
  }

  const zoom = Math.min(4, Math.max(1, options.zoom ?? 1));
  const scaleX = options.scaleX == null ? zoom : Math.min(4, Math.max(0.25, options.scaleX));
  const scaleY = options.scaleY == null ? zoom : Math.min(4, Math.max(0.25, options.scaleY));
  const base = Math.min(outW / sourceW, outH / sourceH);
  const drawnW = sourceW * base * scaleX;
  const drawnH = sourceH * base * scaleY;
  context.drawImage(
    image,
    (outW - drawnW) * options.focusX,
    (outH - drawnH) * options.focusY,
    drawnW,
    drawnH,
  );
  return canvasToBlob(canvas, options.mime);
}

export function editedImageMime(src: string): { mime: string; extension: string } {
  if (/\.png($|\?)/i.test(src)) return { mime: 'image/png', extension: 'png' };
  if (/\.webp($|\?)/i.test(src)) return { mime: 'image/webp', extension: 'webp' };
  return { mime: 'image/jpeg', extension: 'jpg' };
}
