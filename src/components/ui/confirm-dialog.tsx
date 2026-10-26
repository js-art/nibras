"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive actions (delete) use a stronger confirm button. */
  tone?: "default" | "danger";
};

type Pending = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

export function useConfirmDialog() {
  const t = useTranslations("common.actions");
  const [pending, setPending] = useState<Pending | null>(null);
  const pendingRef = useRef<Pending | null>(null);

  const close = useCallback((value: boolean) => {
    const current = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    current?.resolve(value);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      const next = { ...options, resolve };
      pendingRef.current = next;
      setPending(next);
    });
  }, []);

  const dialog = (
    <Dialog
      open={Boolean(pending)}
      onOpenChange={(open) => {
        if (!open) close(false);
      }}
    >
      <DialogContent
        hideClose
        className="max-w-md gap-5 rounded-2xl border-[#d5dfd8] bg-paper p-6 shadow-[0_24px_60px_-28px_rgba(6,36,33,0.55)]"
        overlayClassName="bg-palm-deep/45 backdrop-blur-[2px]"
      >
        <DialogHeader className="gap-2 text-start sm:text-start">
          <DialogTitle className="font-display text-xl text-palm-deep">{pending?.title}</DialogTitle>
          <DialogDescription className="text-sm leading-7 text-mist">
            {pending?.description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-row gap-2 sm:justify-end sm:space-x-0">
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1 rounded-lg border-[#c5d0c9] bg-white sm:flex-none"
            onClick={() => close(false)}
          >
            {pending?.cancelLabel || t("cancel")}
          </Button>
          <Button
            type="button"
            className={cn(
              "h-11 flex-1 rounded-lg sm:flex-none",
              pending?.tone === "danger"
                ? "bg-red-700 text-white hover:bg-red-800"
                : "bg-palm-deep text-[#e7f2ec] hover:bg-palm-deep/90",
            )}
            onClick={() => close(true)}
          >
            {pending?.confirmLabel || t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { confirm, dialog };
}
