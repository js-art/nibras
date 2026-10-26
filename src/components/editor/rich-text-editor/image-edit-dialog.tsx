'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/custom/inputs';
import { Label } from '@/components/ui/label';
import { useTranslations, useLocale } from 'next-intl';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { CircleHelp, Crop } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ImageCropEditor } from './image-crop-editor';
import { resolveMediaDisplayUrl } from '@/lib/uploads/upload-url';
import {
  imageAlignMargins,
  readImageFrameFit,
  readImageFrameFocus,
  readImageAlign,
  type ImageFrameFit,
  type ImageFrameFocus,
  type ImageAlign,
} from './image-with-caption';

interface ImageEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string;
  alt: string;
  caption?: string | null;
  width?: number | null;
  height?: number | null;
  sizes?: string | null;
  objectFit?: string | null;
  objectPosition?: string | null;
  align?: string | null;
  initialFocus?: 'alt' | 'caption';
  /** Editor or page fullscreen is z-100; the sheet portals to body at z-50 and would sit underneath. */
  aboveFullscreen?: boolean;
  onPreview?: (data: {
    alt: string;
    caption?: string;
    width?: number;
    height?: number;
    sizes?: string;
    objectFit: ImageFrameFit;
    objectPosition: ImageFrameFocus;
    align: ImageAlign;
  }) => void;
  onImageEdited?: (url: string) => void;
  onSave: (data: {
    alt: string;
    caption?: string;
    width?: number;
    height?: number;
    sizes?: string;
    objectFit: ImageFrameFit;
    objectPosition: ImageFrameFocus;
    align: ImageAlign;
  }) => void;
}

const WIDTH_MIN = 40;
const WIDTH_MAX = 1200;
const HEIGHT_MIN = 40;
const HEIGHT_MAX = 1200;

type MobileFit = 'full' | 'half' | 'fixed';

function readPixels(value: number | null | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return fallback;
  return Math.min(WIDTH_MAX, Math.max(WIDTH_MIN, Math.round(value)));
}

function readHeight(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return Math.min(HEIGHT_MAX, Math.max(HEIGHT_MIN, Math.round(value)));
}

function detectMobileFit(sizes: string | null | undefined): MobileFit {
  const value = (sizes || '').replace(/\s+/g, '');
  if (!value) return 'full';
  if (value.includes('50vw')) return 'half';
  if (/\d+px/.test(value) && !value.includes('100vw') && !value.includes('60vw')) return 'fixed';
  return 'full';
}

function sizesForMobileFit(fit: MobileFit, width: number): string {
  if (fit === 'half') return '(max-width: 768px) 50vw, 40vw';
  if (fit === 'fixed') return `(max-width: 768px) ${width}px, ${width}px`;
  return '(max-width: 768px) 100vw, 60vw';
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function ImageSettingsOutput({
  src,
  alt,
  caption,
  width,
  height,
  objectFit,
  objectPosition,
  align,
}: {
  src: string;
  alt: string;
  caption: string;
  width: number;
  height: number | null;
  objectFit: ImageFrameFit;
  objectPosition: ImageFrameFocus;
  align: ImageAlign;
}) {
  const t = useTranslations('common');
  const imageSrc = resolveMediaDisplayUrl(src);
  if (!imageSrc) return null;

  const maxWidth = 280;
  const maxHeight = 160;
  let shownWidth = Math.min(width, maxWidth);
  let shownHeight = height != null ? (height * shownWidth) / width : undefined;
  if (shownHeight != null && shownHeight > maxHeight) {
    shownWidth = Math.max(48, Math.round((shownWidth * maxHeight) / shownHeight));
    shownHeight = maxHeight;
  } else if (shownHeight != null) {
    shownHeight = Math.round(shownHeight);
  }

  return (
    <div className="space-y-2 rounded-lg bg-slate-50 p-3">
      <div className="flex min-h-14 w-full">
        <figure
          className="max-w-full"
          style={{ width: shownWidth, transition: 'width 120ms linear', ...imageAlignMargins(align) }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt={alt}
            className={cn(
              'block w-full rounded-md border border-slate-200/80 bg-white',
              height != null ? '' : 'h-auto max-h-40 object-contain',
            )}
            style={
              shownHeight != null
                ? {
                    height: shownHeight,
                    objectFit,
                    objectPosition,
                    transition: 'height 120ms linear',
                  }
                : { transition: 'height 120ms linear' }
            }
          />
          {caption ? (
            <figcaption className="mt-1 truncate text-center text-[11px] text-slate-500">{caption}</figcaption>
          ) : null}
        </figure>
      </div>
      <p className="text-center text-[11px] tabular-nums text-slate-400">
        {width}px × {height != null ? `${height}px` : t('imageHeightAuto')}
      </p>
    </div>
  );
}

function FieldLabel({
  htmlFor,
  label,
  hint,
}: {
  htmlFor?: string;
  label: string;
  hint: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <Label htmlFor={htmlFor} className="text-xs font-semibold text-slate-600">
        {label}
      </Label>
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
        <TooltipContent className="max-w-[220px] text-start font-normal leading-relaxed">
          {hint}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function PixelField({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  return (
    <div className="flex items-center gap-1">
      <Input
        dir="ltr"
        inputMode="numeric"
        value={draft}
        onChange={(event) => {
          const raw = event.target.value.replace(/[^\d]/g, '');
          setDraft(raw);
          const next = Number(raw);
          if (Number.isFinite(next) && next >= min && next <= max) onChange(next);
        }}
        onBlur={() => {
          const next = Number(draft);
          if (!Number.isFinite(next)) {
            setDraft(String(value));
            return;
          }
          const clamped = clamp(next, min, max);
          onChange(clamped);
          setDraft(String(clamped));
        }}
        className="h-8 w-16 px-2 text-center text-xs"
      />
      <span className="text-[11px] text-slate-400">px</span>
    </div>
  );
}

export function ImageEditDialog({
  open,
  onOpenChange,
  src,
  alt: initialAlt,
  caption: initialCaption,
  width: initialWidth,
  height: initialHeight,
  sizes: initialSizes,
  objectFit: initialObjectFit,
  objectPosition: initialObjectPosition,
  align: initialAlign,
  initialFocus = 'alt',
  aboveFullscreen = false,
  onPreview,
  onImageEdited,
  onSave,
}: ImageEditDialogProps) {
  const t = useTranslations('common');
  const locale = useLocale();
  const isRTL = locale === 'fa' || locale === 'ar';
  const [alt, setAlt] = useState(initialAlt);
  const [caption, setCaption] = useState(initialCaption || '');
  const [width, setWidth] = useState(() => readPixels(initialWidth, 300));
  const [height, setHeight] = useState<number | null>(() => readHeight(initialHeight));
  const [mobileFit, setMobileFit] = useState<MobileFit>(() => detectMobileFit(initialSizes));
  const [frameFit, setFrameFit] = useState<ImageFrameFit>(() => readImageFrameFit(initialObjectFit));
  const [frameFocus, setFrameFocus] = useState<ImageFrameFocus>(() => readImageFrameFocus(initialObjectPosition));
  const [align, setAlign] = useState<ImageAlign>(() => readImageAlign(initialAlign));
  const [cropOpen, setCropOpen] = useState(false);
  const altInputRef = useRef<HTMLInputElement>(null);
  const captionInputRef = useRef<HTMLInputElement>(null);
  const onPreviewRef = useRef(onPreview);
  onPreviewRef.current = onPreview;

  useEffect(() => {
    if (!open) return;
    setAlt(initialAlt);
    setCaption(initialCaption || '');
    setWidth(readPixels(initialWidth, 300));
    setHeight(readHeight(initialHeight));
    setMobileFit(detectMobileFit(initialSizes));
    setFrameFit(readImageFrameFit(initialObjectFit));
    setFrameFocus(readImageFrameFocus(initialObjectPosition));
    setAlign(readImageAlign(initialAlign));

    const focusTimeout = window.setTimeout(() => {
      if (initialFocus === 'caption') captionInputRef.current?.focus();
      else altInputRef.current?.focus();
    }, 100);

    return () => window.clearTimeout(focusTimeout);
  }, [open, initialAlt, initialCaption, initialWidth, initialHeight, initialSizes, initialObjectFit, initialObjectPosition, initialAlign, initialFocus]);

  useEffect(() => {
    if (!open) return;
    onPreviewRef.current?.({
      alt,
      caption: caption || undefined,
      width,
      height: height ?? undefined,
      sizes: sizesForMobileFit(mobileFit, width),
      objectFit: frameFit,
      objectPosition: frameFocus,
      align,
    });
  }, [open, alt, caption, width, height, mobileFit, frameFit, frameFocus, align]);

  useEffect(() => {
    const onResize = (event: Event) => {
      const detail = (event as CustomEvent<{ width?: number; height?: number; objectFit?: string }>).detail;
      if (!detail || typeof detail.width !== 'number' || typeof detail.height !== 'number') return;
      setWidth(clamp(detail.width, WIDTH_MIN, WIDTH_MAX));
      setHeight(clamp(detail.height, HEIGHT_MIN, HEIGHT_MAX));
      if (detail.objectFit === 'fill' || detail.objectFit === 'cover') setFrameFit(detail.objectFit);
    };
    window.addEventListener('image-frame-resized', onResize);
    return () => window.removeEventListener('image-frame-resized', onResize);
  }, []);

  useEffect(() => {
    const onAlign = (event: Event) => {
      const align = (event as CustomEvent<{ align?: string }>).detail?.align;
      if (align === 'left' || align === 'center' || align === 'right') setAlign(align);
    };
    window.addEventListener('image-align-changed', onAlign);
    return () => window.removeEventListener('image-align-changed', onAlign);
  }, []);

  const enableManualHeight = () => {
    if (height == null) setFrameFit('fill');
    setHeight((current) => current ?? clamp(Math.round(width * 0.66), HEIGHT_MIN, HEIGHT_MAX));
  };

  const showPhotoPart = (focus: ImageFrameFocus) => {
    setFrameFit('cover');
    setFrameFocus(focus);
    setHeight((current) => {
      if (current != null && current < width * 0.92) return current;
      return clamp(Math.round(width * 0.62), HEIGHT_MIN, HEIGHT_MAX);
    });
  };

  const handleSave = () => {
    onSave({
      alt,
      caption: caption || undefined,
      width,
      height: height ?? undefined,
      sizes: sizesForMobileFit(mobileFit, width),
      objectFit: frameFit,
      objectPosition: frameFocus,
      align,
    });
    onOpenChange(false);
  };

  const choiceClass = (active: boolean) =>
    cn(
      'h-8 rounded-md px-2 text-xs transition-colors',
      active ? 'bg-white font-medium text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800',
    );

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent
        side={isRTL ? 'left' : 'right'}
        className={cn(
          'w-full overflow-hidden p-0 sm:max-w-sm',
          aboveFullscreen && 'z-[130]',
        )}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        onFocusOutside={(event) => event.preventDefault()}
        showOverlay={false}
      >
        <TooltipProvider delayDuration={200}>
          <SheetHeader className="h-12 shrink-0 flex-row items-center gap-0 border-b border-slate-200/60 px-4 py-0">
            <SheetTitle className="text-base font-semibold leading-none">{t('editImage') || 'Edit Image'}</SheetTitle>
          </SheetHeader>

          <div className="shrink-0 border-b border-slate-200/60 px-4 py-3">
            <ImageSettingsOutput
              src={src}
              alt={alt}
              caption={caption}
              width={width}
              height={height}
              objectFit={frameFit}
              objectPosition={frameFocus}
              align={align}
            />
          </div>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
            <button
              type="button"
              onClick={() => setCropOpen(true)}
              className="flex w-full items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-3 text-start transition-colors hover:border-sky-300 hover:bg-sky-100"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white shadow-sm">
                <Crop className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900">{t('imageCropTitle')}</span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">{t('imageCropOpenHint')}</span>
              </span>
            </button>
            <div className="space-y-2">
              <FieldLabel htmlFor="alt-text" label={t('altText')} hint={t('imageAltHint')} />
              <Input
                ref={altInputRef}
                id="alt-text"
                type="text"
                placeholder={t('altText')}
                value={alt}
                onChange={(event) => setAlt(event.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-2">
              <FieldLabel htmlFor="caption" label={t('caption')} hint={t('imageCaptionHint')} />
              <Input
                ref={captionInputRef}
                id="caption"
                type="text"
                placeholder={t('clickToAddCaption')}
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <FieldLabel label={t('imageWidth') || 'Width'} hint={t('imageWidthHint')} />
                <PixelField value={width} min={WIDTH_MIN} max={WIDTH_MAX} onChange={setWidth} />
              </div>
              <Slider
                value={[width]}
                onValueChange={(value) => setWidth(value[0] ?? width)}
                min={WIDTH_MIN}
                max={WIDTH_MAX}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <FieldLabel label={t('imageAlign')} hint={t('imageAlignHint')} />
              <div dir="ltr" className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
                <button type="button" className={choiceClass(align === 'left')} onClick={() => setAlign('left')}>
                  {t('imageAlignLeft')}
                </button>
                <button type="button" className={choiceClass(align === 'center')} onClick={() => setAlign('center')}>
                  {t('imageAlignCenter')}
                </button>
                <button type="button" className={choiceClass(align === 'right')} onClick={() => setAlign('right')}>
                  {t('imageAlignRight')}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <FieldLabel label={t('imageHeight') || 'Height'} hint={t('imageHeightHint')} />
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
                <button type="button" className={choiceClass(height == null)} onClick={() => setHeight(null)}>
                  {t('imageHeightAuto')}
                </button>
                <button type="button" className={choiceClass(height != null)} onClick={enableManualHeight}>
                  {t('imageHeightManual')}
                </button>
              </div>
              {height != null ? (
                <div className="space-y-2 pt-1">
                  <div className="flex justify-end">
                    <PixelField
                      value={height}
                      min={HEIGHT_MIN}
                      max={HEIGHT_MAX}
                      onChange={setHeight}
                    />
                  </div>
                  <Slider
                    value={[height]}
                    onValueChange={(value) => setHeight(value[0] ?? height)}
                    min={HEIGHT_MIN}
                    max={HEIGHT_MAX}
                    step={1}
                    className="w-full"
                  />
                </div>
              ) : null}
              {height != null ? (
                <div className="space-y-2 border-t border-slate-200/70 pt-3">
                  <FieldLabel label={t('imageFrameFit')} hint={t('imageFrameFitHint')} />
                  <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className={choiceClass(frameFit === 'fill')} onClick={() => setFrameFit('fill')}>
                          {t('imageFrameFill')}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[240px] text-start font-normal leading-relaxed">
                        {t('imageFrameFillHint')}
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className={choiceClass(frameFit === 'cover')} onClick={() => setFrameFit('cover')}>
                          {t('imageFrameCover')}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[240px] text-start font-normal leading-relaxed">
                        {t('imageFrameCoverHint')}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-500">
                    {frameFit === 'fill' ? t('imageFrameFillHint') : t('imageFrameCoverHint')}
                  </p>
                  {frameFit === 'cover' ? (
                    <div className="space-y-1.5">
                      <FieldLabel label={t('imageFrameFocus')} hint={t('imageFrameFocusHint')} />
                      <div dir="ltr" className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
                        {(
                          [
                            ['top', 'imageFrameTop', 'imageFrameTopHint'],
                            ['center', 'imageFrameCenter', 'imageFrameCenterHint'],
                            ['bottom', 'imageFrameBottom', 'imageFrameBottomHint'],
                          ] as const
                        ).map(([value, label, hint]) => (
                          <Tooltip key={value}>
                            <TooltipTrigger asChild>
                              <button type="button" className={choiceClass(frameFocus === value)} onClick={() => showPhotoPart(value)}>
                                {t(label)}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[220px] text-start font-normal leading-relaxed">
                              {t(hint)}
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <div>
                <p className="text-xs font-semibold text-slate-700">{t('imageMobileSize')}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{t('imageMobileHint')}</p>
              </div>
              <div className="space-y-1.5">
                {(
                  [
                    ['full', 'imageMobileFull', 'imageMobileFullHint'],
                    ['half', 'imageMobileHalf', 'imageMobileHalfHint'],
                    ['fixed', 'imageMobileFixed', 'imageMobileFixedHint'],
                  ] as const
                ).map(([value, labelKey, hintKey]) => {
                  const active = mobileFit === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setMobileFit(value)}
                      className={cn(
                        'flex w-full flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-start transition-colors',
                        active
                          ? 'border-slate-900 bg-white shadow-sm'
                          : 'border-slate-200 bg-slate-50 hover:bg-white',
                      )}
                    >
                      <span className={cn('text-xs font-semibold', active ? 'text-slate-900' : 'text-slate-700')}>
                        {t(labelKey)}
                      </span>
                      <span className="text-[11px] leading-relaxed text-slate-500">{t(hintKey)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <SheetFooter className="shrink-0 border-t border-slate-200/60 px-4 pb-4 pt-4">
            <div className={cn('flex w-full gap-2', isRTL && 'flex-row-reverse')}>
              <Button variant="secondary" onClick={() => onOpenChange(false)} className="h-9 flex-1 text-xs">
                {t('actions.cancel')}
              </Button>
              <Button onClick={handleSave} className="h-9 flex-1 text-xs">
                {t('actions.save')}
              </Button>
            </div>
          </SheetFooter>
        </TooltipProvider>
        <ImageCropEditor
          open={cropOpen}
          src={src}
          onOpenChange={setCropOpen}
          onApply={(url) => onImageEdited?.(url)}
        />
      </SheetContent>
    </Sheet>
  );
}
