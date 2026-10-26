import { toEnglishDigits } from '@/lib/digits';
import { isCompleteIranMobileDigits, normalizeIranPhone } from '@/lib/auth/phone-iran';
import {
  findCountryByIso2,
  formatInternationalPhoneDisplay,
  matchCountryFromDigits,
  maxNationalDigitsForDial,
} from '@/lib/phone/country-dial-codes';

/**
 * Strip a single trunk-prefix 0 from national digits when the country dial code
 * is already selected (e.g. user types 0912… while +98 is chosen → 912…).
 * Safe for stored values: calling twice is a no-op once the leading 0 is gone.
 */
export function stripTrunkPrefixZero(nationalDigits: string): string {
  const digits = toEnglishDigits(nationalDigits).replace(/\D/g, '');
  if (digits.length >= 2 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
}

/**
 * Normalize national digits for a given dial code before composing E.164.
 * Iran: accept 09… / 9… / 989… and always emit 9xxxxxxxxx (10 digits).
 * Strips a dial code the user typed/pasted into the national field (e.g. +98
 * already selected, then "98" or "98912…" typed again).
 */
export function normalizeNationalForDial(dial: string, nationalDigits: string): string {
  const dialDigits = dial.replace(/\D/g, '');
  let national = toEnglishDigits(nationalDigits).replace(/\D/g, '');
  const max = dialDigits === '98' ? 10 : maxNationalDigitsForDial(dialDigits);

  // Peel country dial out of the national field when the user re-typed it.
  // Bound the loop so pathological digit strings cannot hang.
  for (let i = 0; i < 5; i++) {
    if (!dialDigits || !national.startsWith(dialDigits)) break;
    if (national.length <= dialDigits.length) break;
    const rest = national.slice(dialDigits.length);
    const overlong = national.length > max;
    // Iran mobiles are 9… — "989…" means dial + mobile, not a 98… national.
    const iranDialThenMobile = dialDigits === '98' && rest.startsWith('9');
    if (!overlong && !iranDialThenMobile) break;
    national = rest;
  }

  national = stripTrunkPrefixZero(national);
  return national.slice(0, max);
}

export type ParsedPhoneParts = {
  iso2: string;
  national: string;
};

/**
 * Parse any historically stored phone into country + national parts.
 * Accepts: 09…, 9…, 989…, +989…, +1…, etc. — so old zero-prefixed rows keep working.
 */
export function parseStoredPhoneToParts(
  raw: string | null | undefined,
  preferredIso2: string,
): ParsedPhoneParts {
  const preferred = findCountryByIso2(preferredIso2)?.iso2 || preferredIso2 || 'IR';
  const trimmed = String(raw ?? '').trim();
  const digits = toEnglishDigits(trimmed).replace(/\D/g, '');
  if (!digits) {
    return { iso2: preferred, national: '' };
  }

  // Prefer Iran when the number is clearly an IR mobile (legacy 09 / 9 / 989 forms).
  const iran = normalizeIranPhone(trimmed);
  if (iran.ok) {
    // e164 is 989xxxxxxxxx
    return { iso2: 'IR', national: iran.e164.slice(2) };
  }
  if (isCompleteIranMobileDigits(digits)) {
    const national = digits.startsWith('0') ? digits.slice(1) : digits.slice(-10);
    return { iso2: 'IR', national: national.slice(0, 10) };
  }

  const matched = matchCountryFromDigits(digits, preferred);
  if (matched) {
    const max = maxNationalDigitsForDial(matched.country.dial);
    return {
      iso2: matched.country.iso2,
      national: matched.national.slice(0, max),
    };
  }

  const preferredCountry = findCountryByIso2(preferred);
  const max = maxNationalDigitsForDial(preferredCountry?.dial ?? '98');
  return {
    iso2: preferred,
    national: stripTrunkPrefixZero(digits).slice(0, max),
  };
}

/** Compose E.164 with leading + from dial + national (after trunk-zero strip). */
export function composeE164FromDial(dial: string, nationalDigits: string): string {
  const dialDigits = dial.replace(/\D/g, '');
  const national = normalizeNationalForDial(dialDigits, nationalDigits);
  if (!national) return '';
  return `+${dialDigits}${national}`;
}

/**
 * Display mask for national digits (spaces only — never stored).
 * Iran (+98): 9xx xxx xxxx. Others: groups of 3–4.
 */
export function formatNationalDisplayMask(dial: string, nationalDigits: string): string {
  const dialDigits = dial.replace(/\D/g, '');
  const digits = toEnglishDigits(nationalDigits).replace(/\D/g, '');
  if (!digits) return '';

  if (dialDigits === '98') {
    // National mobile without trunk 0: 9xxxxxxxxx → 912 345 6789
    const n =
      digits.startsWith('0') && digits.length === 11 ? digits.slice(1) : digits.slice(0, 10);
    const a = n.slice(0, 3);
    const b = n.slice(3, 6);
    const c = n.slice(6, 10);
    let out = a;
    if (b) out += ` ${b}`;
    if (c) out += ` ${c}`;
    return out;
  }

  if (dialDigits === '1') {
    // NANP: 555 123 4567
    const n = digits.slice(0, 10);
    const a = n.slice(0, 3);
    const b = n.slice(3, 6);
    const c = n.slice(6, 10);
    let out = a;
    if (b) out += ` ${b}`;
    if (c) out += ` ${c}`;
    return out;
  }

  // Generic: 3-3-rest
  const parts: string[] = [];
  let i = 0;
  while (i < digits.length) {
    const size = digits.length - i > 4 && i >= 6 ? digits.length - i : Math.min(3, digits.length - i);
    parts.push(digits.slice(i, i + size));
    i += size;
  }
  return parts.join(' ');
}

export function nationalPlaceholderForDial(dial: string): string {
  const dialDigits = dial.replace(/\D/g, '');
  if (dialDigits === '98') return '912 345 6789';
  if (dialDigits === '1') return '555 123 4567';
  return 'Phone number';
}

