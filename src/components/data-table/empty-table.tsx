'use client';

import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import RemoveFiltersButton from './remove-filters-button';
type props = {
  // children: (data: object) => React.ReactNode; // Children must be a function that takes a string and returns ReactNode
  children: React.ReactNode; // Children must be a function that takes a string and returns ReactNode
};
const TableEmpty: React.FC<props> = ({ children }) => {
  const params = useSearchParams();
  const t = useTranslations('common.table');

  return (
    <>
      <main className="grid min-h-full place-items-center rounded-lg border-2 border-dashed border-gray-300 bg-white px-6 py-24 sm:py-32 lg:px-8">
        <div className="text-center">
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            {t('empty')}
          </h1>
          <p className="mt-6 text-base leading-7 text-gray-600"> {t('noItems')}</p>
          <div className="mt-10 flex items-center justify-center gap-x-3">
            {/* {typeof children === 'function' && children(params)} */}
            {children}
            {params?.size > 0 && <RemoveFiltersButton />}
          </div>
        </div>
      </main>
    </>
  );
};

export default TableEmpty;
