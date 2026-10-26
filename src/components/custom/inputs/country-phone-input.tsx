'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Input } from '@/components/custom/inputs';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toEnglishDigits } from '@/lib/digits';
import { cn } from '@/lib/utils';
import {
  COUNTRY_DIAL_OPTIONS,
  countryFlagEmoji,
  defaultCountryIso2ForLocale,
  findCountryByIso2,
  maxNationalDigitsForDial,
  type CountryDialOption,
} from '@/lib/phone/country-dial-codes';
import { classifyPhoneDestination } from '@/lib/phone/international-phone';
import {
  composeE164FromDial,
  formatNationalDisplayMask,
  nationalPlaceholderForDial,
  normalizeNationalForDial,
  parseStoredPhoneToParts,
} from '@/lib/phone/national-digits';

export type CountryPhoneInputProps = {
  value?: string;
  /** Always receives normalized `+E.164` (or empty). Never stores trunk-zero / free text. */
  onChange?: (value: string) => void;
  className?: string;
  inputClassName?: string;
  buttonClassName?: string;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  /** Explicit ISO2 override (skips locale default when set) */
  defaultCountryIso2?: string;
  /** @deprecated Use defaultCountryIso2 */
  defaultCountryCode?: string;
  /**
   * When true, only Iran (+98) is selectable.
   * Prefer leaving this false and validating international on submit instead.
   */
  iranOnly?: boolean;
};

function countrySearchValue(country: CountryDialOption, locale: string): string {
  const name = locale === 'fa' && country.nameFa ? country.nameFa : country.name;
  return `${name} ${country.name} ${country.dial} +${country.dial} ${country.iso2}`;
}

function displayCountryName(country: CountryDialOption, locale: string): string {
  if (locale === 'fa' && country.nameFa) return country.nameFa;
  return country.name;
}

/**
 * Country-code picker + masked national number.
 * Default dial: explicit prop → IP geo → UI locale. Always changeable unless iranOnly.
 * Storage: `onChange` → `+E.164` or `''` (mask spaces never stored).
 */
export function CountryPhoneInput({
  value: propValue,
  onChange,
  className,
  inputClassName,
  buttonClassName,
  placeholder,
  id,
  disabled = false,
  defaultCountryIso2,
  defaultCountryCode,
  iranOnly = false,
}: CountryPhoneInputProps) {
  const locale = useLocale();
  const t = useTranslations('common.contactForm');
  const explicitDefault =
    defaultCountryIso2 ||
    (defaultCountryCode
      ? COUNTRY_DIAL_OPTIONS.find((c) => c.dial === defaultCountryCode)?.iso2
      : undefined);
  const localeDefault = defaultCountryIso2ForLocale(locale);

  const preferredIso2 = iranOnly ? 'IR' : explicitDefault || localeDefault;

  const dialOptions = useMemo(
    () => (iranOnly ? COUNTRY_DIAL_OPTIONS.filter((c) => c.iso2 === 'IR') : COUNTRY_DIAL_OPTIONS),
    [iranOnly],
  );

  const initial = useMemo(
    () => parseStoredPhoneToParts(propValue, preferredIso2),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once from prop
    [],
  );

  const [iso2, setIso2] = useState(() =>
    iranOnly ? 'IR' : initial.iso2 || preferredIso2,
  );
  const [national, setNational] = useState(initial.national);
  const [open, setOpen] = useState(false);
  const userPickedCountry = useRef(Boolean(propValue?.trim()));
  const appliedIpDefault = useRef(false);
  /** Skip re-parse when propValue is the value we just emitted (avoids dial-digit echo). */
  const lastEmittedRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (iranOnly) {
      setIso2('IR');
      return;
    }
    if (userPickedCountry.current) return;
    if (propValue?.trim() || national.trim()) return;
    if (!preferredIso2) return;
    if (appliedIpDefault.current && iso2 === preferredIso2) return;
    setIso2(preferredIso2);
    appliedIpDefault.current = true;
  }, [preferredIso2, iranOnly, propValue, national, iso2]);

  useEffect(() => {
    if (propValue === undefined || propValue === '') {
      if (propValue === lastEmittedRef.current) return;
      lastEmittedRef.current = propValue ?? '';
      setNational('');
      if (iranOnly) setIso2('IR');
      return;
    }
    if (propValue === lastEmittedRef.current) {
      return;
    }
    lastEmittedRef.current = propValue;
    const next = parseStoredPhoneToParts(propValue, preferredIso2);
    const nextIso = iranOnly ? 'IR' : next.iso2 || preferredIso2;
    userPickedCountry.current = true;
    setIso2(nextIso);
    setNational(next.national);
  }, [propValue, preferredIso2, iranOnly]);

  const selected =
    findCountryByIso2(iranOnly ? 'IR' : iso2) ??
    findCountryByIso2(preferredIso2) ??
    findCountryByIso2('IR')!;
  const maxNational = maxNationalDigitsForDial(selected.dial);
  const displayValue = formatNationalDisplayMask(selected.dial, national);
  const resolvedPlaceholder =
    placeholder?.trim() || nationalPlaceholderForDial(selected.dial);

  const emitSafe = (nextIso2: string, nextNational: string) => {
    const country = findCountryByIso2(iranOnly ? 'IR' : nextIso2) ?? selected;
    const cleaned = normalizeNationalForDial(country.dial, nextNational);
    if (!cleaned) {
      lastEmittedRef.current = '';
      onChange?.('');
      return;
    }
    const composed = composeE164FromDial(country.dial, cleaned);
    const classified = classifyPhoneDestination(composed);
    const emitted = classified
      ? classified.region === 'IR'
        ? `+${classified.e164}`
        : classified.e164
      : composed;
    lastEmittedRef.current = emitted;
    onChange?.(emitted);
  };

  const applyParsedRaw = (raw: string) => {
    const english = toEnglishDigits(raw).trim();
    // Full international paste
    if (english.includes('+') || /^00\d{8,}/.test(english.replace(/\s/g, ''))) {
      const parts = parseStoredPhoneToParts(english, preferredIso2);
      const nextIso = iranOnly ? 'IR' : parts.iso2;
      if (iranOnly && parts.iso2 !== 'IR') {
        const asIran = parseStoredPhoneToParts(english, 'IR');
        setIso2('IR');
        setNational(asIran.national);
        emitSafe('IR', asIran.national);
        return;
      }
      userPickedCountry.current = true;
      setIso2(nextIso);
      setNational(parts.national);
      emitSafe(nextIso, parts.national);
      return;
    }

    // Domestic paste with trunk 0 (0912…) while +98 selected — strip via normalize
    const cleaned = normalizeNationalForDial(selected.dial, english).slice(0, maxNational);
    setNational(cleaned);
    emitSafe(iso2, cleaned);
  };

  const pickerEnabled = !disabled && !iranOnly;

  return (
    <div className={cn('flex w-full items-stretch gap-2', className)} dir="ltr">
      <Popover
        open={open && pickerEnabled}
        onOpenChange={(next) => {
          if (pickerEnabled) setOpen(next);
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-label={t('countryCode', { default: 'Country code' })}
            disabled={!pickerEnabled}
            className={cn(
              'h-14 min-w-24 shrink-0 justify-between gap-1.5 px-2.5 font-normal',
              'bg-background hover:bg-muted/40',
              pickerEnabled && 'cursor-pointer',
              buttonClassName,
            )}
          >
            <span className="flex min-w-0 items-center gap-1.5 text-sm">
              <span className="text-base leading-none" aria-hidden>
                {countryFlagEmoji(selected.iso2)}
              </span>
              <span className="truncate tabular-nums font-medium">+{selected.dial}</span>
            </span>
            {pickerEnabled ? (
              <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
            ) : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          // Keep default popover z-[220] (above Dialog z-[200]). Do not pass a
          // lower z-* — twMerge would bury the list under the modal.
          data-country-phone-picker=""
          className="w-[min(22rem,calc(100vw-2rem))] p-0"
          align="start"
          collisionPadding={12}
          onOpenAutoFocus={(event) => {
            // Let the search field take focus inside dialogs without the dialog stealing it back.
            event.preventDefault();
            const root = event.currentTarget;
            if (!(root instanceof HTMLElement)) return;
            root.querySelector<HTMLInputElement>('input')?.focus();
          }}
        >
          <Command shouldFilter>
            <CommandInput
              placeholder={t('searchCountry', { default: 'Search country or code…' })}
            />
            <CommandList>
              <CommandEmpty>{t('noCountryFound', { default: 'No country found.' })}</CommandEmpty>
              <CommandGroup>
                {dialOptions.map((country) => (
                  <CommandItem
                    key={country.iso2}
                    value={countrySearchValue(country, locale)}
                    onSelect={() => {
                      userPickedCountry.current = true;
                      setIso2(country.iso2);
                      const clipped = normalizeNationalForDial(country.dial, national);
                      setNational(clipped);
                      emitSafe(country.iso2, clipped);
                      setOpen(false);
                    }}
                    className="gap-2"
                  >
                    <span className="text-base leading-none" aria-hidden>
                      {countryFlagEmoji(country.iso2)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {displayCountryName(country, locale)}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      +{country.dial}
                    </span>
                    <Check
                      className={cn(
                        'h-4 w-4 shrink-0',
                        iso2 === country.iso2 ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <div className="min-w-0 flex-1">
        <Input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          disabled={disabled}
          value={displayValue}
          onChange={(event) => applyParsedRaw(event.target.value)}
          onPaste={(event) => {
            const pasted = event.clipboardData.getData('text');
            if (!pasted) return;
            event.preventDefault();
            applyParsedRaw(pasted);
          }}
          placeholder={resolvedPlaceholder}
          inputDir="ltr"
          className={cn('h-14 text-left tabular-nums tracking-wide', inputClassName)}
          style={{ textAlign: 'left' }}
        />
      </div>
    </div>
  );
}

/** @deprecated Prefer CountryPhoneInput — same component, clearer name. */
export const InternationalPhoneNumberInput = CountryPhoneInput;
