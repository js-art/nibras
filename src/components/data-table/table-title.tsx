import { ReactNode } from 'react';

// Define the type for the t function
type TranslationFunction = (key: string, options?: { [key: string]: any }) => string;
type TableTitleProps = {
  children: ReactNode; // Children can be any valid React node
  t: TranslationFunction; // t is a function that takes a string and returns a string
};

const TableTitle = ({ children, t }: TableTitleProps) => {
  return (
    <>
      <div className="mb-5 flex flex-row border-b border-gray-200 pb-5">
        <div className="flex-none items-center justify-start">
          <h1 className="text-base font-semibold leading-6 text-gray-900">{t('pageTitle')}</h1>
          <p className="mt-2 text-sm text-gray-700">{t('pageDescription')}</p>
        </div>
        <div className="flex-grow"></div>
        <div className="flex-none items-center justify-end">{children}</div>
      </div>
    </>
  );
};

export default TableTitle;
