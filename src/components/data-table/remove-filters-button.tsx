import React from 'react';
import { Button } from '../ui/button';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

function RemoveFiltersButton() {
  const t = useTranslations('common.actions');

  const navigation = useRouter();
  const currentPath = usePathname();
  const removeFilters = () => {
    navigation.push(currentPath);
  };
  return (
    <>
      <Button onClick={() => removeFilters()}>{t('removeFilters')}</Button>
    </>
  );
}

export default RemoveFiltersButton;
