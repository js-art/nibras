import type { Option } from '@/types';
import { CheckIcon, PlusCircledIcon } from '@radix-ui/react-icons';
import type { Column } from '@tanstack/react-table';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useLocale, useTranslations } from 'next-intl';

interface DataTableFacetedFilterProps<TData, TValue> {
  column?: Column<TData, TValue>;
  title?: string;
  options: Option[];
}

export function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
}: DataTableFacetedFilterProps<TData, TValue>) {
  const selectedValues = new Set(column?.getFilterValue() as string[]);
  const locale = useLocale();
  const isRtl = locale === 'ar' || locale === 'fa';
  const tCommon = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const commitFilter = (values: string[]) => {
    column?.setFilterValue(values.length ? values : undefined);
    if (!column?.id) return;
    const params = new URLSearchParams(searchParams.toString());
    if (values.length) params.set(column.id, values.join('.'));
    else params.delete(column.id);
    params.set('page', '1');
    const next = params.toString();
    if (next !== searchParams.toString()) {
      router.replace(`${pathname}?${next}`, { scroll: false });
    }
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'flex shrink-0 items-center gap-2 whitespace-nowrap border-dashed',
            isRtl && 'dir-rtl text-right',
          )}
        >
          <PlusCircledIcon className="size-4 shrink-0" />
          {title}
          {selectedValues?.size > 0 && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
                {selectedValues.size}
              </Badge>
              <div className="hidden space-x-1 lg:flex">
                {selectedValues.size > 2 ? (
                  <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                    {selectedValues.size} selected
                  </Badge>
                ) : (
                  options
                    .filter((option) => selectedValues.has(option.value))
                    .map((option) => (
                      <Badge
                        variant="secondary"
                        key={option.value}
                        className="rounded-sm px-1 font-normal"
                      >
                        {option.label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn('w-[12.5rem] p-0', isRtl && 'dir-rtl')}
        align={isRtl ? 'end' : 'start'}
        sideOffset={4}
      >
        <Command className={cn({ 'dir-rtl': isRtl })}>
          <CommandInput
            placeholder={title}
            className={cn(isRtl && 'text-right placeholder:text-right')}
          />
          <CommandList className={cn({ 'dir-rtl': isRtl })}>
            <CommandEmpty>{tCommon('table.noResults')}</CommandEmpty>
            <CommandGroup className={cn({ 'dir-rtl': isRtl })}>
              {options.map((option) => {
                const isSelected = selectedValues.has(option.value);

                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      if (isSelected) {
                        selectedValues.delete(option.value);
                      } else {
                        selectedValues.add(option.value);
                      }
                      commitFilter(Array.from(selectedValues));
                    }}
                    className={cn('items-center', {
                      'text-right': isRtl,
                    })}
                  >
                    <div
                      className={cn(
                        'flex size-4 items-center justify-center rounded-sm border border-primary ',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'opacity-50 [&_svg]:invisible',
                        {
                          'mr-2': !isRtl,
                          'ml-2': isRtl,
                        },
                      )}
                    >
                      <CheckIcon className="size-4" aria-hidden="true" />
                    </div>
                    {option.icon && (
                      <option.icon
                        className={cn(' size-4 text-muted-foreground', {
                          'mr-2': !isRtl,
                          'ml-2': isRtl,
                        })}
                        aria-hidden="true"
                      />
                    )}
                    <span className={cn({ 'text-right': isRtl })}>{option.label}</span>
                    {option.withCount && column?.getFacetedUniqueValues()?.get(option.value) && (
                      <span
                        className={cn('flex size-4 items-center justify-center font-mono text-xs', {
                          'ml-auto': !isRtl,
                          'mr-auto': isRtl,
                        })}
                      >
                        {column?.getFacetedUniqueValues().get(option.value)}
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => commitFilter([])}
                    className="justify-center text-center"
                  >
                    {tCommon('actions.removeFilters')}
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
