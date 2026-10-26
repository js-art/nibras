'use client';

import { ImageIcon, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { EditorImageUploadSnapshot } from '@/lib/editor/editor-image-upload-state';

type EditorImageUploadBannerProps = {
  snapshot: EditorImageUploadSnapshot;
  className?: string;
};

/** Compact strip shown above editor content while pasted images are re-hosted. */
export function EditorImageUploadBanner({ snapshot, className }: EditorImageUploadBannerProps) {
  const t = useTranslations('common');

  if (snapshot.pendingCount === 0) {
    return null;
  }

  const safeProgress = Math.max(0, Math.min(100, snapshot.progress));

  return (
    <div
      className={cn(
        'border-b border-primary/15 bg-gradient-to-r from-primary/[0.07] via-primary/[0.03] to-transparent',
        'px-4 py-2.5 animate-in fade-in slide-in-from-top-1 duration-300',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary shadow-sm"
          aria-hidden
        >
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <ImageIcon className="h-3.5 w-3.5 shrink-0 text-primary/75" aria-hidden />
            <span className="truncate">
              {t('editor.uploadingImages', { count: snapshot.pendingCount })}
            </span>
            <span className="ms-auto shrink-0 tabular-nums text-xs font-semibold text-primary">
              {safeProgress}%
            </span>
          </div>
          <Progress value={safeProgress} className="mt-1.5 h-1 bg-primary/10" />
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            {t('editor.uploadingImagesHint')}
          </p>
        </div>
      </div>
    </div>
  );
}
