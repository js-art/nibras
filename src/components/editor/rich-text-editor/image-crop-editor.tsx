'use client';

import { useEffect, useRef, useState } from 'react';
import { CircleHelp, FlipHorizontal, FlipVertical, Maximize2, Minimize2, RotateCcw, RotateCw, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { uploadEditorImageFile } from '@/lib/editor/editor-image-upload';
import {
  editedImageMime,
  imageFilterCss,
  imageToObjectUrl,
  loadEditableImage,
  renderCroppedImage,
  type ImageFilterId,
} from './render-edited-image';

type AspectMode = 'free' | 'original' | 'square' | 'wide' | 'tall';
export type NormRect = { x: number; y: number; w: number; h: number };
type DragKind = 'move' | 'draw' | 'n' | 'e' | 's' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

const FULL: NormRect = { x: 0, y: 0, w: 1, h: 1 };
const ASPECT: Record<Exclude<AspectMode, 'free' | 'original'>, number> = {
  square: 1,
  wide: 16 / 9,
  tall: 3 / 4,
};
const FILTERS: Array<{ id: ImageFilterId; label: string }> = [
  { id: 'none', label: 'imageFilterNone' },
  { id: 'grayscale', label: 'imageFilterGrayscale' },
  { id: 'sepia', label: 'imageFilterSepia' },
  { id: 'warm', label: 'imageFilterWarm' },
  { id: 'cool', label: 'imageFilterCool' },
  { id: 'vivid', label: 'imageFilterVivid' },
  { id: 'fade', label: 'imageFilterFade' },
  { id: 'dramatic', label: 'imageFilterDramatic' },
  { id: 'noir', label: 'imageFilterNoir' },
];

function CropHelp({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="flex items-center gap-1">
      <p className="text-xs font-semibold text-slate-700">{label}</p>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:text-slate-700"
            aria-label={hint}
          >
            <CircleHelp className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-[240px] text-start font-normal leading-relaxed">{hint}</TooltipContent>
      </Tooltip>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function placeRect(rect: NormRect, min = 0.04): NormRect {
  const w = clamp(rect.w, min, 1);
  const h = clamp(rect.h, min, 1);
  return {
    x: clamp(rect.x, 0, 1 - w),
    y: clamp(rect.y, 0, 1 - h),
    w,
    h,
  };
}

function coversImage(rect: NormRect) {
  return rect.x <= 0.01 && rect.y <= 0.01 && rect.w >= 0.98 && rect.h >= 0.98;
}

function normRatio(aspect: number, imageAspect: number) {
  return aspect / Math.max(imageAspect, 0.01);
}

export function largestAspectRect(aspect: number, imageAspect: number): NormRect {
  const ratio = normRatio(aspect, imageAspect);
  let w = 1;
  let h = w / ratio;
  if (h > 1) {
    h = 1;
    w = Math.min(1, h * ratio);
  }
  return placeRect({
    x: (1 - w) / 2,
    y: (1 - h) / 2,
    w,
    h,
  });
}

function drawRect(
  start: { x: number; y: number },
  pointer: { x: number; y: number },
  aspect: number | null,
  imageAspect: number,
): NormRect {
  const rawW = pointer.x - start.x;
  const rawH = pointer.y - start.y;
  if (!aspect) {
    return placeRect({
      x: Math.min(start.x, start.x + rawW),
      y: Math.min(start.y, start.y + rawH),
      w: Math.abs(rawW),
      h: Math.abs(rawH),
    });
  }
  const ratio = normRatio(aspect, imageAspect);
  const signW = Math.sign(rawW) || 1;
  const signH = Math.sign(rawH) || 1;
  let width = Math.abs(rawW);
  let height = Math.abs(rawH);
  if (width / Math.max(height, 0.0001) > ratio) height = width / ratio;
  else width = height * ratio;
  const roomX = signW > 0 ? 1 - start.x : start.x;
  const roomY = signH > 0 ? 1 - start.y : start.y;
  const fitted = fitInside(signW > 0 ? start.x : start.x - width, signH > 0 ? start.y : start.y - height, width, height, roomX, roomY);
  return {
    x: signW > 0 ? start.x : start.x - fitted.w,
    y: signH > 0 ? start.y : start.y - fitted.h,
    w: fitted.w,
    h: fitted.h,
  };
}

function fitInside(x: number, y: number, w: number, h: number, roomX: number, roomY: number): NormRect {
  const scale = Math.min(1, roomX / Math.max(w, 0.0001), roomY / Math.max(h, 0.0001));
  const width = Math.max(0, w * scale);
  const height = Math.max(0, h * scale);
  return {
    x: clamp(x, 0, 1 - width),
    y: clamp(y, 0, 1 - height),
    w: width,
    h: height,
  };
}

function resizeRect(
  kind: Exclude<DragKind, 'move' | 'draw'>,
  origin: NormRect,
  pointer: { x: number; y: number },
  aspect: number | null,
  imageAspect: number,
): NormRect {
  const left = origin.x;
  const top = origin.y;
  const right = origin.x + origin.w;
  const bottom = origin.y + origin.h;
  const midX = left + origin.w / 2;
  const midY = top + origin.h / 2;

  if (!aspect) {
    const nextLeft = kind === 'w' || kind === 'nw' || kind === 'sw' ? pointer.x : left;
    const nextRight = kind === 'e' || kind === 'ne' || kind === 'se' ? pointer.x : right;
    const nextTop = kind === 'n' || kind === 'nw' || kind === 'ne' ? pointer.y : top;
    const nextBottom = kind === 's' || kind === 'sw' || kind === 'se' ? pointer.y : bottom;
    return placeRect({
      x: Math.min(nextLeft, nextRight),
      y: Math.min(nextTop, nextBottom),
      w: Math.abs(nextRight - nextLeft),
      h: Math.abs(nextBottom - nextTop),
    });
  }

  const ratio = normRatio(aspect, imageAspect);
  const minW = 0.08;
  const east = kind === 'e' || kind === 'ne' || kind === 'se';
  const west = kind === 'w' || kind === 'nw' || kind === 'sw';
  const north = kind === 'n' || kind === 'nw' || kind === 'ne';
  const south = kind === 's' || kind === 'sw' || kind === 'se';

  if ((kind === 'e' || kind === 'w') && !north && !south) {
    const fixedX = kind === 'e' ? left : right;
    const width = Math.max(minW, kind === 'e' ? pointer.x - fixedX : fixedX - pointer.x);
    const height = width / ratio;
    const roomX = kind === 'e' ? 1 - fixedX : fixedX;
    const roomY = 2 * Math.min(midY, 1 - midY);
    const fitted = fitInside(kind === 'e' ? fixedX : fixedX - width, midY - height / 2, width, height, roomX, roomY);
    return { ...fitted, x: kind === 'e' ? fixedX : fixedX - fitted.w, y: midY - fitted.h / 2 };
  }

  if ((kind === 'n' || kind === 's') && !east && !west) {
    const fixedY = kind === 's' ? top : bottom;
    const height = Math.max(minW / ratio, kind === 's' ? pointer.y - fixedY : fixedY - pointer.y);
    const width = height * ratio;
    const roomY = kind === 's' ? 1 - fixedY : fixedY;
    const roomX = 2 * Math.min(midX, 1 - midX);
    const fitted = fitInside(midX - width / 2, kind === 's' ? fixedY : fixedY - height, width, height, roomX, roomY);
    return { ...fitted, x: midX - fitted.w / 2, y: kind === 's' ? fixedY : fixedY - fitted.h };
  }

  const fixedX = east ? left : right;
  const fixedY = south ? top : bottom;
  let width = Math.max(minW, Math.abs((east ? pointer.x : pointer.x) - fixedX));
  let height = width / ratio;
  const pointerH = Math.abs(pointer.y - fixedY);
  if (pointerH > height) {
    height = Math.max(minW / ratio, pointerH);
    width = height * ratio;
  }
  const roomX = east ? 1 - fixedX : fixedX;
  const roomY = south ? 1 - fixedY : fixedY;
  const fitted = fitInside(east ? fixedX : fixedX - width, south ? fixedY : fixedY - height, width, height, roomX, roomY);
  return {
    x: east ? fixedX : fixedX - fitted.w,
    y: south ? fixedY : fixedY - fitted.h,
    w: fitted.w,
    h: fitted.h,
  };
}

function CropSlider({
  label,
  valueLabel,
  ...props
}: {
  label: string;
  valueLabel: string;
  value: number[];
  min: number;
  max: number;
  step: number;
  onValueChange: (value: number[]) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-slate-700">{label}</span>
        <span className="text-xs tabular-nums text-slate-500">{valueLabel}</span>
      </div>
      <Slider dir="ltr" {...props} />
    </div>
  );
}

export function RegionCrop({
  src,
  filter,
  rect,
  aspect,
  imageAspect,
  onChange,
  onReady,
  stageClassName,
}: {
  src: string;
  filter: string;
  rect: NormRect;
  aspect: number | null;
  imageAspect: number;
  onChange: (rect: NormRect) => void;
  onReady: (size: { w: number; h: number }) => void;
  stageClassName?: string;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [fitted, setFitted] = useState({ w: 0, h: 0 });
  const rectRef = useRef(rect);
  rectRef.current = rect;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      const box = stage.getBoundingClientRect();
      const maxW = Math.max(1, box.width - 32);
      const maxH = Math.max(1, box.height - 32);
      let w = maxW;
      let h = w / Math.max(imageAspect, 0.01);
      if (h > maxH) {
        h = maxH;
        w = h * imageAspect;
      }
      setFitted({ w, h });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [imageAspect, src]);

  const pointFromEvent = (event: { clientX: number; clientY: number }) => {
    const image = imageRef.current;
    if (!image) return { x: 0, y: 0 };
    const box = image.getBoundingClientRect();
    return {
      x: clamp((event.clientX - box.left) / box.width, 0, 1),
      y: clamp((event.clientY - box.top) / box.height, 0, 1),
    };
  };

  const begin = (kind: DragKind, event: React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const start = pointFromEvent(event);
    const origin = rectRef.current;
    const mode: DragKind = kind === 'move' && coversImage(origin) ? 'draw' : kind;
    const pointerId = event.pointerId;
    event.currentTarget.setPointerCapture(pointerId);

    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      const pointer = pointFromEvent(ev);
      if (mode === 'draw') onChange(drawRect(start, pointer, aspect, imageAspect));
      else if (mode === 'move') {
        const dx = pointer.x - start.x;
        const dy = pointer.y - start.y;
        onChange(placeRect({ ...origin, x: origin.x + dx, y: origin.y + dy }));
      } else onChange(resizeRect(mode, origin, pointer, aspect, imageAspect));
    };
    const end = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  };

  const handles: Array<{ id: Exclude<DragKind, 'move' | 'draw'>; className: string; cursor: string }> = [
    { id: 'nw', className: 'left-0 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2', cursor: 'nwse-resize' },
    { id: 'ne', className: 'right-0 top-0 h-3 w-3 translate-x-1/2 -translate-y-1/2', cursor: 'nesw-resize' },
    { id: 'sw', className: 'bottom-0 left-0 h-3 w-3 -translate-x-1/2 translate-y-1/2', cursor: 'nesw-resize' },
    { id: 'se', className: 'bottom-0 right-0 h-3 w-3 translate-x-1/2 translate-y-1/2', cursor: 'nwse-resize' },
    { id: 'n', className: 'left-1/2 top-0 h-2 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full', cursor: 'ns-resize' },
    { id: 's', className: 'bottom-0 left-1/2 h-2 w-8 -translate-x-1/2 translate-y-1/2 rounded-full', cursor: 'ns-resize' },
    { id: 'e', className: 'right-0 top-1/2 h-8 w-2 translate-x-1/2 -translate-y-1/2 rounded-full', cursor: 'ew-resize' },
    { id: 'w', className: 'left-0 top-1/2 h-8 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full', cursor: 'ew-resize' },
  ];

  return (
    <div
      ref={stageRef}
      dir="ltr"
      className={cn(
        'relative flex h-[min(52vh,420px)] items-center justify-center overflow-hidden bg-slate-950',
        stageClassName,
      )}
    >
      {fitted.w > 0 ? (
        <div className="relative" style={{ width: fitted.w, height: fitted.h }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imageRef}
            src={src}
            alt=""
            draggable={false}
            className="h-full w-full cursor-crosshair select-none"
            style={{ filter }}
            onLoad={(event) => {
              onReady({
                w: event.currentTarget.naturalWidth || 1,
                h: event.currentTarget.naturalHeight || 1,
              });
            }}
            onPointerDown={(event) => begin('draw', event)}
          />
          <div
            className="absolute cursor-move border border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.58)]"
            style={{
              left: `${rect.x * 100}%`,
              top: `${rect.y * 100}%`,
              width: `${rect.w * 100}%`,
              height: `${rect.h * 100}%`,
            }}
            onPointerDown={(event) => begin('move', event)}
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-y-0 left-1/3 w-px bg-white/65" />
              <div className="absolute inset-y-0 left-2/3 w-px bg-white/65" />
              <div className="absolute inset-x-0 top-1/3 h-px bg-white/65" />
              <div className="absolute inset-x-0 top-2/3 h-px bg-white/65" />
            </div>
            {handles.map((handle) => (
              <button
                key={handle.id}
                type="button"
                aria-label={handle.id}
                className={cn('absolute z-10 border border-slate-900/30 bg-white shadow-sm', handle.className)}
                style={{ cursor: handle.cursor, touchAction: 'none' }}
                onPointerDown={(event) => begin(handle.id, event)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ImageCropEditor({
  open,
  src,
  onOpenChange,
  onApply,
}: {
  open: boolean;
  src: string;
  onOpenChange: (open: boolean) => void;
  onApply: (url: string) => void;
}) {
  const t = useTranslations('common');
  const locale = useLocale();
  const isRtl = locale === 'fa' || locale === 'ar';
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [flipX, setFlipX] = useState(false);
  const [flipY, setFlipY] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [filterId, setFilterId] = useState<ImageFilterId>('none');
  const [aspectMode, setAspectMode] = useState<AspectMode>('free');
  const [aspectPick, setAspectPick] = useState(0);
  const [imageAspect, setImageAspect] = useState(1);
  const [rect, setRect] = useState<NormRect>(FULL);
  const [natural, setNatural] = useState({ w: 1, h: 1 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canApply, setCanApply] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRotation(0);
    setFlipX(false);
    setFlipY(false);
    setBrightness(100);
    setContrast(100);
    setFilterId('none');
    setAspectMode('free');
    setRect(FULL);
    setError(null);
    setCanApply(false);
    setFullscreen(false);
  }, [open, src]);

  useEffect(() => {
    if (!open || !src) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    setLoading(true);
    setError(null);
    setDisplaySrc(null);
    setCanApply(false);

    loadEditableImage(src)
      .then((image) => {
        const width = image.naturalWidth || image.width;
        const height = image.naturalHeight || image.height;
        const quarter = Math.abs(((rotation % 360) + 360) % 180) === 90;
        if (!cancelled) setImageAspect(quarter ? height / Math.max(width, 1) : width / Math.max(height, 1));
        return imageToObjectUrl(image, flipX, flipY, rotation);
      })
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setRect(FULL);
        setDisplaySrc(url);
      })
      .catch(() => {
        if (!cancelled) setError('failed');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, src, flipX, flipY, rotation]);

  const lockedAspect = aspectMode === 'free' ? null : aspectMode === 'original' ? imageAspect : ASPECT[aspectMode];

  useEffect(() => {
    if (!displaySrc || aspectMode === 'free') return;
    if (aspectMode === 'original') {
      setRect(FULL);
      return;
    }
    setRect(largestAspectRect(ASPECT[aspectMode], imageAspect));
  }, [displaySrc, imageAspect, aspectMode, aspectPick]);

  const chooseAspect = (mode: AspectMode) => {
    setAspectMode(mode);
    setAspectPick((value) => value + 1);
  };

  const apply = async () => {
    if (!displaySrc || saving || !canApply) return;
    setSaving(true);
    setError(null);
    try {
      const { mime, extension } = editedImageMime(src);
      const blob = await renderCroppedImage({
        src: displaySrc,
        pixelCrop: {
          x: rect.x * natural.w,
          y: rect.y * natural.h,
          width: rect.w * natural.w,
          height: rect.h * natural.h,
        },
        rotation: 0,
        filter: imageFilterCss(filterId, brightness, contrast),
        mime,
      });
      const file = new File([blob], `edited-image.${extension}`, { type: mime });
      const uploaded = await uploadEditorImageFile(file);
      onApply(uploaded.url);
      onOpenChange(false);
    } catch {
      setError('failed');
    } finally {
      setSaving(false);
    }
  };

  const choiceClass = (active: boolean) =>
    cn(
      'h-8 rounded-md px-2 text-xs transition-colors',
      active ? 'bg-white font-medium text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800',
    );

  const filter = imageFilterCss(filterId, brightness, contrast);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir={isRtl ? 'rtl' : 'ltr'}
        hideClose
        className={cn(
          'z-[220] flex flex-col gap-0 overflow-hidden p-0',
          fullscreen
            ? 'inset-0 left-0 top-0 h-[100dvh] max-h-none w-screen max-w-none translate-x-0 translate-y-0 rounded-none md:w-screen'
            : 'max-h-[92vh] max-w-3xl',
        )}
        overlayClassName="z-[220]"
      >
        <TooltipProvider delayDuration={200}>
        <DialogHeader className="h-12 shrink-0 flex-row items-center justify-between gap-3 space-y-0 border-b border-slate-200/70 px-3 py-0 rtl:mt-0">
          <DialogTitle className="text-base leading-none">{t('imageCropTitle')}</DialogTitle>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label={fullscreen ? t('imageExitFullscreen') : t('imageFullscreen')}
              onClick={() => setFullscreen((value) => !value)}
            >
              {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </Button>
            <DialogClose className="inline-flex size-8 items-center justify-center rounded-md opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              <X className="size-4" />
              <span className="sr-only">{t('actions.cancel')}</span>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className={cn('relative bg-slate-950', fullscreen ? 'flex min-h-0 flex-1 flex-col' : 'shrink-0')}>
          {displaySrc ? (
            <RegionCrop
              src={displaySrc}
              filter={filter}
              rect={rect}
              aspect={lockedAspect}
              imageAspect={imageAspect}
              stageClassName={fullscreen ? 'h-auto min-h-[42vh] flex-1' : undefined}
              onChange={setRect}
              onReady={(size) => {
                setNatural(size);
                setCanApply(true);
              }}
            />
          ) : (
            <div className={fullscreen ? 'min-h-[42vh] flex-1' : 'h-[min(52vh,420px)]'} />
          )}
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-white">{t('loading')}</div>
          ) : null}
        </div>

        <div className="max-h-[40vh] space-y-4 overflow-y-auto px-4 py-4">
          <div className="space-y-2">
            <CropHelp label={t('imageCropShape')} hint={t('imageCropShapeHint')} />
            <p className="text-[11px] leading-relaxed text-slate-500">{t('imageCropDragHint')}</p>
            <div className="grid grid-cols-5 gap-1 rounded-lg bg-slate-100 p-1">
              {(
                [
                  ['free', 'imageCropFree', 'imageCropFreeHint'],
                  ['original', 'imageCropOriginal', 'imageCropOriginalHint'],
                  ['square', 'imageCropSquare', 'imageCropSquareHint'],
                  ['wide', 'imageCropWide', 'imageCropWideHint'],
                  ['tall', 'imageCropTall', 'imageCropTallHint'],
                ] as const
              ).map(([value, label, hint]) => (
                <Tooltip key={value}>
                  <TooltipTrigger asChild>
                    <button type="button" className={choiceClass(aspectMode === value)} onClick={() => chooseAspect(value)}>
                      {t(label)}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[220px] text-start font-normal leading-relaxed">
                    {t(hint)}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              {t(
                aspectMode === 'free'
                  ? 'imageCropFreeHint'
                  : aspectMode === 'original'
                    ? 'imageCropOriginalHint'
                    : aspectMode === 'square'
                      ? 'imageCropSquareHint'
                      : aspectMode === 'wide'
                        ? 'imageCropWideHint'
                        : 'imageCropTallHint',
              )}
            </p>
          </div>

          <div className="space-y-2">
            <CropHelp label={t('imageFilter')} hint={t('imageFilterHint')} />
            <div className="grid grid-cols-3 gap-1.5">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    'h-8 rounded-md border px-2 text-xs transition-colors',
                    filterId === item.id
                      ? 'border-sky-600 bg-sky-50 font-medium text-sky-800'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                  )}
                  onClick={() => setFilterId(item.id)}
                >
                  {t(item.label)}
                </button>
              ))}
            </div>
          </div>

          <CropHelp label={t('imageAdjust')} hint={t('imageAdjustHint')} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setRotation((value) => value - 90)}>
              <RotateCcw className="size-4" />
              {t('imageRotateLeft')}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setRotation((value) => value + 90)}>
              <RotateCw className="size-4" />
              {t('imageRotateRight')}
            </Button>
            <Button type="button" variant={flipX ? 'secondary' : 'outline'} size="sm" onClick={() => setFlipX((value) => !value)}>
              <FlipHorizontal className="size-4" />
              {t('imageFlipHorizontal')}
            </Button>
            <Button type="button" variant={flipY ? 'secondary' : 'outline'} size="sm" onClick={() => setFlipY((value) => !value)}>
              <FlipVertical className="size-4" />
              {t('imageFlipVertical')}
            </Button>
          </div>

          <CropSlider
            label={t('imageBrightness')}
            valueLabel={String(brightness)}
            value={[brightness]}
            min={50}
            max={150}
            step={1}
            onValueChange={(value) => setBrightness(value[0] ?? brightness)}
          />
          <CropSlider
            label={t('imageContrast')}
            valueLabel={String(contrast)}
            value={[contrast]}
            min={50}
            max={150}
            step={1}
            onValueChange={(value) => setContrast(value[0] ?? contrast)}
          />
          {error ? <p className="text-xs text-red-600">{t('imageEditFailed')}</p> : null}
        </div>

        <DialogFooter className="shrink-0 border-t border-slate-200/70 px-4 py-3">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
            {t('actions.cancel')}
          </Button>
          <Button type="button" onClick={() => void apply()} disabled={!canApply || saving || loading || !displaySrc}>
            {saving ? t('processingUpload') : t('imageCropApply')}
          </Button>
        </DialogFooter>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}
