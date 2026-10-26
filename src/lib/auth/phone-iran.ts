export function iranMobileDigitsOnly(input: string): string {
  return input.replace(/\D/g, '').slice(0, 11);
}

export function isCompleteIranMobileDigits(d: string): boolean {
  const x = iranMobileDigitsOnly(d);
  if (x.length === 10 && /^9\d{9}$/.test(x)) return true;
  if (x.length === 11 && /^09\d{9}$/.test(x)) return true;
  return false;
}

export function formatIranMobileGroupedEn(digits: string): string {
  let x = iranMobileDigitsOnly(digits);
  if (x.length === 10 && x.startsWith('9')) x = `0${x}`;
  const a = x.slice(0, 4);
  const b = x.slice(4, 7);
  const c = x.slice(7, 11);
  let out = a;
  if (x.length > 4 || b.length > 0) out += ` - ${b}`;
  if (x.length > 7 || c.length > 0) out += ` - ${c}`;
  return out;
}

export function formatIranMobileDomesticEnForPlus98(digits: string): string {
  let x = iranMobileDigitsOnly(digits);
  if (x.length === 11 && x.startsWith('0')) x = x.slice(1);
  if (x.length === 10 && x.startsWith('9')) {
    return `${x.slice(0, 3)} - ${x.slice(3, 6)} - ${x.slice(6, 10)}`;
  }
  return formatIranMobileGroupedEn(digits);
}

export type NormalizePhoneResult =
  | { ok: true; e164: string }
  | { ok: false; message: string };

export function normalizeIranPhone(input: string): NormalizePhoneResult {
  const trimmed = input.trim().replace(/^\+/, '');
  let digits = trimmed.replace(/\D/g, '');

  if (digits.startsWith('0098')) {
    digits = digits.slice(4);
  } else if (digits.startsWith('98') && digits.length > 10) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  if (digits.length === 12 && digits.startsWith('989')) {
    // already 989xxxxxxxxx
  } else if (digits.length === 10 && digits.startsWith('9')) {
    digits = `98${digits}`;
  } else {
    return { ok: false, message: 'invalid_phone' };
  }

  if (!/^989\d{9}$/.test(digits)) {
    return { ok: false, message: 'invalid_phone' };
  }

  return { ok: true, e164: digits };
}

/** sms.ir expects 10-digit mobile without 98 prefix */
export function toSmsIrMobile(e164: string): string {
  if (e164.startsWith('98') && e164.length === 12) {
    return e164.slice(2);
  }
  return e164;
}
