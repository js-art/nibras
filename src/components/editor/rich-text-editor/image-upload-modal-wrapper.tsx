'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { X, Upload, ImageIcon, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/custom/inputs';
import { useUploadFile } from '@/lib/api/hooks/use-uploads';
import { useTranslations } from 'next-intl';
import { ImageLibraryModal } from './image-library-modal';

const IMAGE_ACCEPT = {
  'image/jpeg': ['.jpeg', '.jpg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
} as const;

interface ImageUploadModalWrapperProps {
  onSelect: (url: string, altText?: string) => void;
  onClose: () => void;
  enableLibrary?: boolean;
  enableUpload?: boolean;
  maxSize?: number;
}

export function ImageUploadModalWrapper({
  onSelect,
  onClose,
  enableLibrary = true,
  enableUpload = true,
  maxSize = 5 * 1024 * 1024,
}: ImageUploadModalWrapperProps) {
  const [mode, setMode] = useState<'select' | 'library' | 'upload'>('select');
  const [altText, setAltText] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const t = useTranslations('common');
  const uploadFile = useUploadFile();
  const isUploading = uploadFile.isPending;

  useEffect(() => {
    setIsClient(true);
  }, []);

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0 || isUploading) return;

    const file = acceptedFiles[0];
    setUploadError(null);
    setUploadProgress(0);

    try {
      const result = await uploadFile.mutateAsync({
        file,
        folder: 'images',
        onProgress: setUploadProgress,
      });

      onSelect(result.url, altText || result.title || result.altText || undefined);
      onClose();
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : t('uploadFailed') || 'Upload failed';
      setUploadError(message);
      setUploadProgress(0);
      console.error('Upload error:', error);
    }
  };

  const onDropRejected = (rejections: FileRejection[]) => {
    const rejection = rejections[0];
    if (!rejection) return;

    const code = rejection.errors[0]?.code;
    if (code === 'file-too-large') {
      setUploadError(t('fileTooLarge') || `File is larger than ${Math.round(maxSize / (1024 * 1024))}MB`);
    } else if (code === 'file-invalid-type') {
      setUploadError(t('invalidImageType') || 'Only JPEG, PNG, WebP, and GIF images are allowed');
    } else {
      setUploadError(rejection.errors[0]?.message || t('uploadFailed') || 'Upload failed');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: IMAGE_ACCEPT,
    maxSize,
    multiple: false,
    disabled: isUploading,
  });

  if (!isClient) return null;

  // If library mode is selected, show the library modal
  if (mode === 'library') {
    return (
      <ImageLibraryModal
        onSelect={(url, selectedAltText) => {
          onSelect(url, selectedAltText);
          onClose();
        }}
        onClose={() => setMode('select')}
      />
    );
  }

  // Upload mode
  if (mode === 'upload') {
    const progressLabel =
      uploadProgress >= 90
        ? t('processingUpload') || 'Processing…'
        : `${t('uploading') || 'Uploading'} ${uploadProgress}%`;

    return createPortal(
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999]">
        <div className="bg-white p-6 rounded-lg max-w-md w-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">{t('uploadImage') || 'Upload Image'}</h2>
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="text-gray-500 hover:text-gray-700 disabled:opacity-40"
            >
              <X size={24} />
            </button>
          </div>

          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-md p-8 text-center transition-colors mb-4 ${
              isUploading
                ? 'border-primary bg-primary/5 cursor-wait'
                : isDragActive
                  ? 'border-primary bg-primary/10 cursor-pointer'
                  : 'border-gray-300 cursor-pointer'
            }`}
          >
            <input {...getInputProps()} />
            {isUploading ? (
              <div className="space-y-3">
                <Loader2 size={40} className="mx-auto text-primary animate-spin" />
                <p className="text-sm font-medium text-gray-700">{progressLabel}</p>
                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-2.5 rounded-full bg-primary transition-[width] duration-150 ease-out"
                    style={{ width: `${Math.max(uploadProgress, 1)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  {t('uploadPleaseWait') || 'Please wait while the image uploads'}
                </p>
              </div>
            ) : (
              <>
                <Upload size={48} className="mx-auto mb-4 text-gray-400" />
                {isDragActive ? (
                  <p className="text-primary font-semibold">{t('dropImages')}</p>
                ) : (
                  <p className="text-gray-500">{t('dragDropImages')}</p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  {t('imageUploadHint') || 'JPEG, PNG, WebP, GIF — max 5MB'}
                </p>
              </>
            )}
          </div>

          <div className="mb-4">
            <Input
              type="text"
              placeholder={t('altText')}
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              disabled={isUploading}
            />
          </div>

          {uploadError && (
            <div className="mb-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setMode('select')}
              disabled={isUploading}
            >
              {t('actions.back') || 'Back'}
            </Button>
            <Button variant="secondary" onClick={onClose} disabled={isUploading}>
              {t('actions.cancel')}
            </Button>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  // Select mode - choose between library and upload
  return createPortal(
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999]">
      <div className="bg-white p-6 rounded-lg max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">{t('imageLibrary')}</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="flex gap-4 justify-center">
          {enableLibrary && (
            <Button onClick={() => setMode('library')} size="lg">
              <ImageIcon className="mr-2" size={20} />
              {t('selectFromLibrary')}
            </Button>
          )}
          {enableUpload && (
            <Button onClick={() => setMode('upload')} size="lg" variant="secondary">
              <Upload className="mr-2" size={20} />
              {t('uploadImage')}
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
