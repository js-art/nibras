'use client';

import { useEffect, useRef } from 'react';
import { Editor } from '@tiptap/react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Columns, Rows, Trash2 } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import { readTableHeaderSnapshot, toggleLastHeaderColumn } from './table-header-state';
import {
  TABLE_BORDER_DEFAULT,
  resolveTableStripeRows,
  sanitizeTableBorderColor,
  type TableStripeRows,
} from './editor-table';
import { useEditorSelection } from './use-editor-selection';

interface TableEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editor: Editor;
  /** Editor or page fullscreen is z-100; the sheet portals to body at z-50 and would sit underneath. */
  aboveFullscreen?: boolean;
}

export function TableEditDialog({ open, onOpenChange, editor, aboveFullscreen = false }: TableEditDialogProps) {
  const t = useTranslations('common.editor');
  const locale = useLocale();
  const isRTL = locale === 'fa' || locale === 'ar';
  useEditorSelection(editor);

  const handleAddColumnBefore = () => {
    editor.chain().focus().addColumnBefore().run();
  };

  const handleAddColumnAfter = () => {
    editor.chain().focus().addColumnAfter().run();
  };

  const handleDeleteColumn = () => {
    editor.chain().focus().deleteColumn().run();
  };

  const handleAddRowBefore = () => {
    editor.chain().focus().addRowBefore().run();
  };

  const handleAddRowAfter = () => {
    editor.chain().focus().addRowAfter().run();
  };

  const handleDeleteRow = () => {
    editor.chain().focus().deleteRow().run();
  };

  const handleDeleteTable = () => {
    editor.chain().focus().deleteTable().run();
    onOpenChange(false);
  };

  const headers = readTableHeaderSnapshot(editor);
  const tableAttrs = editor.isActive('table') ? editor.getAttributes('table') : {};
  const borderColor = sanitizeTableBorderColor(tableAttrs.borderColor) ?? TABLE_BORDER_DEFAULT;
  const stripeRows = resolveTableStripeRows(tableAttrs);
  const borderInputRef = useRef<HTMLInputElement>(null);
  const borderTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const input = borderInputRef.current;
    if (!input || document.activeElement === input || borderTimerRef.current != null) return;
    input.value = borderColor;
  }, [borderColor]);

  useEffect(() => {
    return () => {
      if (borderTimerRef.current != null) window.clearTimeout(borderTimerRef.current);
    };
  }, []);

  const setBorderColor = (value: string | null) => {
    if (borderTimerRef.current != null) {
      window.clearTimeout(borderTimerRef.current);
      borderTimerRef.current = null;
    }
    const next = sanitizeTableBorderColor(value);
    if (next === sanitizeTableBorderColor(tableAttrs.borderColor)) return;
    editor
      .chain()
      .focus()
      .updateAttributes('table', { borderColor: next })
      .run();
  };

  const scheduleBorderColor = (value: string) => {
    if (borderTimerRef.current != null) window.clearTimeout(borderTimerRef.current);
    borderTimerRef.current = window.setTimeout(() => {
      borderTimerRef.current = null;
      setBorderColor(value);
    }, 1500);
  };

  const setStripeRows = (value: TableStripeRows) => {
    if (value === stripeRows) return;
    editor
      .chain()
      .focus()
      .updateAttributes('table', { stripeRows: value, striped: value !== 'off' })
      .run();
  };

  const handleToggleHeaderColumn = () => {
    editor.chain().focus().toggleHeaderColumn().run();
  };

  const handleToggleHeaderLastColumn = () => {
    toggleLastHeaderColumn(editor);
  };

  const handleToggleHeaderRow = () => {
    editor.chain().focus().toggleHeaderRow().run();
  };

  const handleToggleHeaderCell = () => {
    editor.chain().focus().toggleHeaderCell().run();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent 
        side={isRTL ? 'left' : 'right'} 
        className={cn(
          'w-full overflow-y-auto p-0 sm:max-w-sm',
          aboveFullscreen && 'z-[130]',
        )}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        onFocusOutside={(event) => event.preventDefault()}
        showOverlay={false}
      >
        <SheetHeader className="px-4 pt-12 pb-4 border-b border-slate-200/60">
          <SheetTitle className="text-base font-semibold">{t('editTable')}</SheetTitle>
        </SheetHeader>

        <div className="space-y-3 p-4">
          {/* Columns Section */}
          <div>
            <Label className={`text-xs font-semibold text-slate-600 mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('columns')}
            </Label>
            <div className="space-y-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddColumnBefore}
                disabled={!editor.can().addColumnBefore()}
                className={`w-full h-9 text-xs ${isRTL ? 'flex-row-reverse' : 'justify-start'} bg-white/80 hover:bg-white border-slate-200/80`}
              >
                <Columns size={13} className={isRTL ? 'ml-2' : 'mr-2'} />
                {t('addColumnBefore')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddColumnAfter}
                disabled={!editor.can().addColumnAfter()}
                className={`w-full h-9 text-xs ${isRTL ? 'flex-row-reverse' : 'justify-start'} bg-white/80 hover:bg-white border-slate-200/80`}
              >
                <Columns size={13} className={isRTL ? 'ml-2' : 'mr-2'} />
                {t('addColumnAfter')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDeleteColumn}
                disabled={!editor.can().deleteColumn()}
                className={`w-full h-9 text-xs text-red-600 hover:text-red-600 hover:bg-red-50 border-red-200/60 ${isRTL ? 'flex-row-reverse' : 'justify-start'}`}
              >
                <Trash2 size={13} className={isRTL ? 'ml-2' : 'mr-2'} />
                {t('deleteColumn')}
              </Button>
            </div>
          </div>

          <Separator className="my-3" />

          {/* Rows Section */}
          <div>
            <Label className={`text-xs font-semibold text-slate-600 mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('rows')}
            </Label>
            <div className="space-y-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddRowBefore}
                disabled={!editor.can().addRowBefore()}
                className={`w-full h-9 text-xs ${isRTL ? 'flex-row-reverse' : 'justify-start'} bg-white/80 hover:bg-white border-slate-200/80`}
              >
                <Rows size={13} className={isRTL ? 'ml-2' : 'mr-2'} />
                {t('addRowBefore')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddRowAfter}
                disabled={!editor.can().addRowAfter()}
                className={`w-full h-9 text-xs ${isRTL ? 'flex-row-reverse' : 'justify-start'} bg-white/80 hover:bg-white border-slate-200/80`}
              >
                <Rows size={13} className={isRTL ? 'ml-2' : 'mr-2'} />
                {t('addRowAfter')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDeleteRow}
                disabled={!editor.can().deleteRow()}
                className={`w-full h-9 text-xs text-red-600 hover:text-red-600 hover:bg-red-50 border-red-200/60 ${isRTL ? 'flex-row-reverse' : 'justify-start'}`}
              >
                <Trash2 size={13} className={isRTL ? 'ml-2' : 'mr-2'} />
                {t('deleteRow')}
              </Button>
            </div>
          </div>

          <Separator className="my-3" />

          <div>
            <Label className={`text-xs font-semibold text-slate-600 mb-1 block ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('headers')}
            </Label>
            <p className={`mb-3 text-[11px] leading-5 text-slate-600 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('headerSectionHint')}
            </p>
            <HeaderMap
              headerRow={headers.headerRow}
              headerColumn={headers.headerColumn}
              headerLastColumn={headers.headerLastColumn}
              isRTL={isRTL}
            />
            <div className="mt-3 space-y-1.5">
              <HeaderSwitch
                label={t('headerRowSwitch')}
                hint={t('headerRowHint')}
                checked={headers.headerRow}
                disabled={!editor.can().toggleHeaderRow()}
                onToggle={handleToggleHeaderRow}
              />
              <HeaderSwitch
                label={t('headerColumnSwitch')}
                hint={t('headerColumnHint')}
                checked={headers.headerColumn}
                disabled={!editor.can().toggleHeaderColumn()}
                onToggle={handleToggleHeaderColumn}
              />
              <HeaderSwitch
                label={t('headerLastColumnSwitch')}
                hint={t('headerLastColumnHint')}
                checked={headers.headerLastColumn}
                disabled={!headers.inTable}
                onToggle={handleToggleHeaderLastColumn}
              />
              <HeaderSwitch
                label={t('headerCellSwitch')}
                hint={t('headerCellHint')}
                checked={headers.headerCell}
                disabled={!editor.can().toggleHeaderCell()}
                onToggle={handleToggleHeaderCell}
              />
            </div>
          </div>

          <Separator className="my-3" />

          <div>
            <Label className={`mb-1 block text-xs font-semibold text-slate-600 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('tableBorderColor')}
            </Label>
            <p className={`mb-3 text-[11px] leading-5 text-slate-600 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('tableBorderColorHint')}
            </p>
            <div className="flex flex-wrap items-center gap-2" dir="ltr">
              <input
                ref={borderInputRef}
                type="color"
                aria-label={t('tableBorderColor')}
                defaultValue={borderColor}
                onInput={(event) => scheduleBorderColor(event.currentTarget.value)}
                className="h-8 w-12 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setBorderColor(null)}
              >
                {t('tableBorderReset')}
              </Button>
            </div>
            <div className="mt-3">
              <Label className={`mb-1 block text-xs font-semibold text-slate-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('tableStriped')}
              </Label>
              <p className={`mb-2 text-[11px] leading-5 text-slate-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('tableStripedHint')}
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    ['off', t('tableStripeOff')],
                    ['even', t('tableStripeEven')],
                    ['odd', t('tableStripeOdd')],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    disabled={!headers.inTable}
                    aria-pressed={stripeRows === value}
                    onClick={() => setStripeRows(value)}
                    className={cn(
                      'h-9 rounded-md border px-2 text-xs font-medium transition-colors disabled:opacity-40',
                      stripeRows === value
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Separator className="my-3" />

          {/* Delete Table */}
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDeleteTable}
            disabled={!editor.can().deleteTable()}
            className={`w-full h-9 text-xs ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Trash2 size={13} className={isRTL ? 'ml-2' : 'mr-2'} />
            {t('deleteTable')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function HeaderMap({
  headerRow,
  headerColumn,
  headerLastColumn,
  isRTL,
}: {
  headerRow: boolean;
  headerColumn: boolean;
  headerLastColumn: boolean;
  isRTL: boolean;
}) {
  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      aria-hidden
      className="grid w-29 grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1.5"
    >
      {Array.from({ length: 9 }, (_, index) => {
        const row = Math.floor(index / 3);
        const column = index % 3;
        const isTitle =
          (row === 0 && headerRow) ||
          (column === 0 && headerColumn) ||
          (column === 2 && headerLastColumn);
        return (
          <span
            key={index}
            className={cn('h-3.5 rounded-[3px]', isTitle ? 'bg-emerald-800' : 'bg-white')}
          />
        );
      })}
    </div>
  );
}

function HeaderSwitch({
  label,
  hint,
  checked,
  disabled,
  onToggle,
}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onToggle}
      className="flex min-h-11 w-full items-center gap-3 rounded-lg px-1 py-1.5 text-start transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium leading-5 text-slate-900">{label}</span>
        <span className="mt-0.5 block text-[11px] leading-4 text-slate-600">{hint}</span>
      </span>
      <span
        className={cn(
          'relative h-6 w-10 shrink-0 rounded-full transition-colors',
          checked ? 'bg-emerald-700' : 'bg-slate-300',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-5 rounded-full bg-white shadow-[0_1px_2px_rgba(15,23,42,0.28)] transition-transform duration-150',
            checked
              ? 'ltr:translate-x-4 rtl:-translate-x-4'
              : 'ltr:translate-x-0.5 rtl:-translate-x-0.5',
          )}
        />
      </span>
    </button>
  );
}

