'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { X, Upload, ImageIcon, CheckSquare, Search, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { resolveUploadDisplayUrl } from '@/lib/uploads/upload-url';
import { Input } from '@/components/custom/inputs';
import { useUploadFile, useUploads } from '@/lib/api/hooks/use-uploads';
import { useTranslations } from 'next-intl';
import { useDebounce } from '@/lib/hooks/useDebounce';

const IMAGE_ACCEPT = {
  'image/jpeg': ['.jpeg', '.jpg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
} as const;

interface ImageUploadModalProps {
  onSelect: (url: string, altText?: string) => void;
  onClose: () => void;
  enableLibrary?: boolean;
  enableUpload?: boolean;
  maxSize?: number;
}

export function ImageUploadModal({
  onSelect,
  onClose,
  enableLibrary = true,
  enableUpload = true,
  maxSize = 5 * 1024 * 1024,
}: ImageUploadModalProps) {
  const [mode, setMode] = useState<'select' | 'library' | 'upload'>('select');
  const [altText, setAltText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImages, setSelectedImages] = useState<number[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12 });
  const [isClient, setIsClient] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const t = useTranslations('common');

  const debouncedSearch = useDebounce(searchQuery, 500);
  const uploadFile = useUploadFile();
  const isUploading = uploadFile.isPending;

  const { data: uploadsData, isLoading } = useUploads(
    {
      page: pagination.page,
      limit: pagination.limit,
      search: debouncedSearch,
    },
    { enabled: mode === 'library', noCache: true },
  );

  const libraryImages = uploadsData?.data || [];

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
      setUploadError(
        t('fileTooLarge') || `File is larger than ${Math.round(maxSize / (1024 * 1024))}MB`,
      );
    } else if (code === 'file-invalid-type') {
      setUploadError(
        t('invalidImageType') || 'Only JPEG, PNG, WebP, and GIF images are allowed',
      );
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

  const toggleSelection = (index: number) => {
    setSelectedImages((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  };

  const handleLibraryConfirm = () => {
    if (selectedImages.length === 0) return;

    const img = libraryImages[selectedImages[0]];
    if (img) {
      onSelect(img.url, altText || img.altText || img.title || undefined);
    }
    onClose();
  };

  if (!isClient) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999]">
      <div className="bg-white p-6 rounded-lg max-w-4xl w-full max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">{t('imageLibrary')}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        {mode === 'select' && (
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
        )}

        {mode === 'library' && (
          <>
            <div className="mb-4">
              <Input
                type="text"
                placeholder={t('searchImages')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
              />
            </div>

            <div className="mb-4">
              <Input
                type="text"
                placeholder={t('altText')}
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
              />
            </div>

            {isLoading ? (
              <div className="grid grid-cols-4 gap-4 flex-1 overflow-y-auto">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="w-full h-24 bg-gray-200 animate-pulse rounded" />
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-4 overflow-y-auto flex-1 mb-4">
                  {libraryImages.map((image, index) => (
                    <div
                      key={image.id}
                      className={`relative cursor-pointer border-2 rounded transition-all ${
                        selectedImages.includes(index)
                          ? 'border-primary ring-2 ring-primary'
                          : 'border-transparent hover:border-gray-300'
                      }`}
                      onClick={() => toggleSelection(index)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resolveUploadDisplayUrl(image.url)}
                        alt={image.title || `Image ${index}`}
                        className="w-full h-24 object-cover rounded"
                        loading="lazy"
                        decoding="async"
                      />
                      {selectedImages.includes(index) && (
                        <div className="absolute top-1 right-1 bg-primary text-white rounded-full p-1">
                          <CheckSquare size={16} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={pagination.page === 1}
                      onClick={() =>
                        setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))
                      }
                    >
                      {t('actions.previous')}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                    >
                      {t('actions.next')}
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setMode('select')}>
                      {t('actions.back')}
                    </Button>
                    <Button variant="secondary" onClick={onClose}>
                      {t('actions.cancel')}
                    </Button>
                    <Button onClick={handleLibraryConfirm} disabled={selectedImages.length === 0}>
                      {t('actions.confirm') || 'Confirm'}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {mode === 'upload' && (
          <>
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
                  <p className="text-sm font-medium text-gray-700">
                    {uploadProgress >= 90
                      ? t('processingUpload') || 'Processing…'
                      : `${t('uploading') || 'Uploading'} ${uploadProgress}%`}
                  </p>
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
              <Button variant="secondary" onClick={() => setMode('select')} disabled={isUploading}>
                {t('actions.back')}
              </Button>
              <Button variant="secondary" onClick={onClose} disabled={isUploading}>
                {t('actions.cancel')}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
