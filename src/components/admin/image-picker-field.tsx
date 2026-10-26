"use client";

import { useState } from "react";
import { ImageIcon, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { ImageUploadModal } from "@/components/editor/rich-text-editor/image-upload-modal";
import { controlClass } from "@/components/ui/controls";
import { resolveUploadDisplayUrl } from "@/lib/uploads/upload-url";

const fieldClass = controlClass;

type ImagePickerFieldProps = {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
};

export function ImagePickerField({ value, onChange, placeholder }: ImagePickerFieldProps) {
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  const preview = resolveUploadDisplayUrl(value);

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={`${fieldClass} min-w-0 flex-1`}
          value={value}
          placeholder={placeholder || t("imageUrlPlaceholder")}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg border border-[#c5d0c9] bg-white px-4 text-sm text-ink"
          onClick={() => setOpen(true)}
        >
          <ImageIcon className="size-4" />
          {value ? t("changeImage") : t("chooseImage")}
        </button>
        {value ? (
          <button
            type="button"
            className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg border border-[#c5d0c9] bg-white px-3 text-sm text-mist"
            onClick={() => onChange("")}
          >
            <X className="size-3.5" />
            {t("actions.remove")}
          </button>
        ) : null}
      </div>
      {preview ? (
        <div className="overflow-hidden rounded-xl border border-[#d5dfd8] bg-[#f4f7f5]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="h-36 w-full object-cover" />
        </div>
      ) : null}
      {open ? (
        <ImageUploadModal
          onSelect={(url) => {
            onChange(url);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
          enableLibrary
          enableUpload
          maxSize={5 * 1024 * 1024}
        />
      ) : null}
    </div>
  );
}
