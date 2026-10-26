import { normalizeIranPhone } from '@/lib/auth/phone-iran';

export type NormalizeInternationalPhoneResult =
  | { ok: true; e164: string; digits: string }
  | { ok: false; message: 'invalid_phone' };

/**
 * Loose E.164 normalization for non-Iran destinations.
 * Returns `+` + digits for provider APIs; rejects numbers that normalize as Iran mobiles
 * when callers should use the Iran path instead (optional — use classifyPhoneDestination).
 */
export function normalizeInternationalPhone(input: string): NormalizeInternationalPhoneResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, message: 'invalid_phone' };
  }

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) {
    return { ok: false, message: 'invalid_phone' };
  }

  return { ok: true, e164: `+${digits}`, digits };
}

export function isValidInternationalPhoneInput(input: string): boolean {
  return normalizeInternationalPhone(input).ok;
}

export type PhoneDestination =
  | { region: 'IR'; e164: string }
  | { region: 'INTERNATIONAL'; e164: string };

/** Prefer Iran when the number is a valid IR mobile; otherwise international E.164. */
export function classifyPhoneDestination(input: string): PhoneDestination | null {
  const iran = normalizeIranPhone(input);
  if (iran.ok) {
    return { region: 'IR', e164: iran.e164 };
  }
  const intl = normalizeInternationalPhone(input);
  if (intl.ok) {
    return { region: 'INTERNATIONAL', e164: intl.e164 };
  }
  return null;
}

/** E.164 with leading + for Twilio / MessageBird. */
export function toProviderE164(storedPhone: string): string {
  const trimmed = storedPhone.trim();
  if (trimmed.startsWith('+')) return trimmed;
  const iran = normalizeIranPhone(trimmed);
  if (iran.ok) return `+${iran.e164}`;
  const digits = trimmed.replace(/\D/g, '');
  return digits ? `+${digits}` : trimmed;
}
