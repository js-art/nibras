'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckSquare, Square, Search, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { resolveUploadDisplayUrl } from '@/lib/uploads/upload-url';
import { Input } from '@/components/custom/inputs';
import { useUploads } from '@/lib/api/hooks/use-uploads';
import { useLocale, useTranslations } from 'next-intl';
import { useDebounce } from '@/lib/hooks/useDebounce';

interface ImageLibraryModalProps {
  onSelect: (url: string, altText?: string) => void;
  onClose: () => void;
}

export function ImageLibraryModal({ onSelect, onClose }: ImageLibraryModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLibraryImages, setSelectedLibraryImages] = useState<number[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12 });
  const [hoveredImageTitle, setHoveredImageTitle] = useState<string | null>(null);
  const [previewLibraryImage, setPreviewLibraryImage] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const [isClient, setIsClient] = useState(false);
  const t = useTranslations('common');
  const locale = useLocale();
  const isRtl = locale === 'fa' || locale === 'ar';

  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const uploadsQuery = useUploads(
    {
      page: pagination.page,
      limit: pagination.limit,
      search: debouncedSearchQuery,
    },
    { enabled: true, noCache: true },
  );

  const libraryImages = uploadsQuery.data?.data || [];

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!previewLibraryImage) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPreviewLibraryImage(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [previewLibraryImage]);

  const toggleLibraryImageSelection = (index: number) => {
    setSelectedLibraryImages((prev) => {
      if (prev.includes(index)) {
        return prev.filter((i) => i !== index);
      }
      return [index]; // Only allow single selection
    });
  };

  const confirmLibrarySelection = () => {
    if (selectedLibraryImages.length === 0) return;

    const selectedImage = libraryImages[selectedLibraryImages[0]];
    if (selectedImage) {
      onSelect(selectedImage.url, selectedImage.altText || selectedImage.title || undefined);
    }
    setSelectedLibraryImages([]);
    onClose();
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const SkeletonLoader = () => (
    <div className="grid grid-cols-4 gap-4">
      {Array.from({ length: 12 }).map((_, index) => (
        <div key={index} className="w-full h-16 bg-gray-200 animate-pulse rounded-md"></div>
      ))}
    </div>
  );

  if (!isClient) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999999999]">
      <div className="bg-white p-6 rounded-lg max-w-xl w-full relative shadow-lg h-full max-h-[540px] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">{t('imageLibrary')}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        {/* Search Field */}
        <div className="mb-1">
          <Input
            type="text"
            placeholder={t('searchImages')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search size={16} />}
          />
        </div>

        {/* Hovered Image Title Bar */}
        <div className="mb-4 text-center text-xs font-medium text-gray-700 bg-gray-100 p-2 rounded-md">
          {hoveredImageTitle || <span className="text-gray-400">{t('hoverTitle')}</span>}
        </div>

        {/* Loading State or Images */}
        {uploadsQuery.isLoading ? (
          <SkeletonLoader />
        ) : (
          <div className="flex flex-col justify-between h-full max-h-[340px] flex-1">
            {/* Image Grid */}
            <div
              className="grid grid-cols-4 gap-4 overflow-y-auto"
              onMouseLeave={() => setHoveredImageTitle(null)}
            >
              {libraryImages.map((image, index) => (
                <div
                  key={image.id || index}
                  className={`relative cursor-pointer group ${
                    selectedLibraryImages.includes(index)
                      ? 'ring-2 ring-primary rounded-md'
                      : ''
                  }`}
                  onMouseEnter={() => setHoveredImageTitle(image.title || 'Untitled')}
                  onMouseLeave={() => setHoveredImageTitle(null)}
                  onClick={() => toggleLibraryImageSelection(index)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveUploadDisplayUrl(image.url)}
                    alt={image.title || `Library Image ${index}`}
                    className="w-full h-16 border object-cover rounded-md transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                  />
                  {/* Overlay Effect */}
                  <div className="absolute inset-0 bg-black/30 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                  <button
                    type="button"
                    aria-label={t('enlargeImage')}
                    title={t('enlargeImage')}
                    className="absolute top-1 left-1 z-10 p-1 bg-white rounded-full shadow-md text-gray-700 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewLibraryImage({
                        url: image.url,
                        title: image.title || t('imagePreview', { index: index + 1 }),
                      });
                    }}
                  >
                    <ZoomIn size={14} />
                  </button>
                  {/* Selection Icon */}
                  <div
                    className={`absolute top-1 right-1 p-1 bg-white rounded-full shadow-md ${
                      selectedLibraryImages.includes(index) ? 'text-primary' : 'text-gray-500'
                    } transition-colors`}
                  >
                    {selectedLibraryImages.includes(index) ? (
                      <CheckSquare size={16} />
                    ) : (
                      <Square size={16} />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end flex-col mt-4">
              {/* Pagination Controls */}
              <div
                className="mb-4 flex items-center justify-between"
                dir={isRtl ? 'rtl' : 'ltr'}
              >
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
                >
                  {t('actions.previous')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                >
                  {t('actions.next')}
                </Button>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={onClose}>
                  {t('actions.cancel')}
                </Button>
                <Button
                  type="button"
                  onClick={confirmLibrarySelection}
                  disabled={selectedLibraryImages.length === 0}
                >
                  {t('actions.confirm')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {previewLibraryImage ? (
        <div
          className="fixed inset-0 z-[10000000000] flex items-center justify-center bg-black/85 p-4 pointer-events-auto"
          onClick={() => setPreviewLibraryImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label={t('enlargeImage')}
        >
          <button
            type="button"
            aria-label={t('actions.cancel')}
            onClick={(e) => {
              e.stopPropagation();
              setPreviewLibraryImage(null);
            }}
            className="absolute top-4 right-4 z-[10000000001] rounded-full bg-white p-2 text-gray-800 shadow-lg hover:bg-gray-100"
          >
            <X size={20} />
          </button>
          <div
            className="relative flex max-h-[90vh] max-w-[90vw] flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveUploadDisplayUrl(previewLibraryImage.url)}
              alt={previewLibraryImage.title}
              className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain shadow-2xl"
            />
            {previewLibraryImage.title ? (
              <p className="mt-3 text-center text-sm text-white/90">{previewLibraryImage.title}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
