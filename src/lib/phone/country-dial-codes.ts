export type CountryDialOption = {
  /** ISO 3166-1 alpha-2 */
  iso2: string;
  /** Dialing code digits only (no +) */
  dial: string;
  /** English name for search */
  name: string;
  /** Persian name (optional display for fa) */
  nameFa?: string;
};

/** Popular dial codes first; searchable country picker uses the full list. */
export const COUNTRY_DIAL_OPTIONS: CountryDialOption[] = [
  { iso2: 'IR', dial: '98', name: 'Iran', nameFa: 'ایران' },
  { iso2: 'US', dial: '1', name: 'United States', nameFa: 'ایالات متحده' },
  { iso2: 'CA', dial: '1', name: 'Canada', nameFa: 'کانادا' },
  { iso2: 'GB', dial: '44', name: 'United Kingdom', nameFa: 'بریتانیا' },
  { iso2: 'AE', dial: '971', name: 'United Arab Emirates', nameFa: 'امارات' },
  { iso2: 'SA', dial: '966', name: 'Saudi Arabia', nameFa: 'عربستان' },
  { iso2: 'TR', dial: '90', name: 'Turkey', nameFa: 'ترکیه' },
  { iso2: 'DE', dial: '49', name: 'Germany', nameFa: 'آلمان' },
  { iso2: 'FR', dial: '33', name: 'France', nameFa: 'فرانسه' },
  { iso2: 'IQ', dial: '964', name: 'Iraq', nameFa: 'عراق' },
  { iso2: 'AF', dial: '93', name: 'Afghanistan', nameFa: 'افغانستان' },
  { iso2: 'AU', dial: '61', name: 'Australia', nameFa: 'استرالیا' },
  { iso2: 'AT', dial: '43', name: 'Austria', nameFa: 'اتریش' },
  { iso2: 'AZ', dial: '994', name: 'Azerbaijan', nameFa: 'آذربایجان' },
  { iso2: 'BH', dial: '973', name: 'Bahrain', nameFa: 'بحرین' },
  { iso2: 'BD', dial: '880', name: 'Bangladesh', nameFa: 'بنگلادش' },
  { iso2: 'BE', dial: '32', name: 'Belgium', nameFa: 'بلژیک' },
  { iso2: 'BR', dial: '55', name: 'Brazil', nameFa: 'برزیل' },
  { iso2: 'CN', dial: '86', name: 'China', nameFa: 'چین' },
  { iso2: 'DK', dial: '45', name: 'Denmark', nameFa: 'دانمارک' },
  { iso2: 'EG', dial: '20', name: 'Egypt', nameFa: 'مصر' },
  { iso2: 'FI', dial: '358', name: 'Finland', nameFa: 'فنلاند' },
  { iso2: 'GE', dial: '995', name: 'Georgia', nameFa: 'گرجستان' },
  { iso2: 'GR', dial: '30', name: 'Greece', nameFa: 'یونان' },
  { iso2: 'HK', dial: '852', name: 'Hong Kong', nameFa: 'هنگ‌کنگ' },
  { iso2: 'IN', dial: '91', name: 'India', nameFa: 'هند' },
  { iso2: 'ID', dial: '62', name: 'Indonesia', nameFa: 'اندونزی' },
  { iso2: 'IE', dial: '353', name: 'Ireland', nameFa: 'ایرلند' },
  { iso2: 'IT', dial: '39', name: 'Italy', nameFa: 'ایتالیا' },
  { iso2: 'JP', dial: '81', name: 'Japan', nameFa: 'ژاپن' },
  { iso2: 'JO', dial: '962', name: 'Jordan', nameFa: 'اردن' },
  { iso2: 'KW', dial: '965', name: 'Kuwait', nameFa: 'کویت' },
  { iso2: 'LB', dial: '961', name: 'Lebanon', nameFa: 'لبنان' },
  { iso2: 'MY', dial: '60', name: 'Malaysia', nameFa: 'مالزی' },
  { iso2: 'MX', dial: '52', name: 'Mexico', nameFa: 'مکزیک' },
  { iso2: 'NL', dial: '31', name: 'Netherlands', nameFa: 'هلند' },
  { iso2: 'NZ', dial: '64', name: 'New Zealand', nameFa: 'نیوزیلند' },
  { iso2: 'NO', dial: '47', name: 'Norway', nameFa: 'نروژ' },
  { iso2: 'OM', dial: '968', name: 'Oman', nameFa: 'عمان' },
  { iso2: 'PK', dial: '92', name: 'Pakistan', nameFa: 'پاکستان' },
  { iso2: 'PS', dial: '970', name: 'Palestine', nameFa: 'فلسطین' },
  { iso2: 'PH', dial: '63', name: 'Philippines', nameFa: 'فیلیپین' },
  { iso2: 'PL', dial: '48', name: 'Poland', nameFa: 'لهستان' },
  { iso2: 'PT', dial: '351', name: 'Portugal', nameFa: 'پرتغال' },
  { iso2: 'QA', dial: '974', name: 'Qatar', nameFa: 'قطر' },
  { iso2: 'RU', dial: '7', name: 'Russia', nameFa: 'روسیه' },
  { iso2: 'SG', dial: '65', name: 'Singapore', nameFa: 'سنگاپور' },
  { iso2: 'ZA', dial: '27', name: 'South Africa', nameFa: 'آفریقای جنوبی' },
  { iso2: 'KR', dial: '82', name: 'South Korea', nameFa: 'کره جنوبی' },
  { iso2: 'ES', dial: '34', name: 'Spain', nameFa: 'اسپانیا' },
  { iso2: 'SE', dial: '46', name: 'Sweden', nameFa: 'سوئد' },
  { iso2: 'CH', dial: '41', name: 'Switzerland', nameFa: 'سوئیس' },
  { iso2: 'SY', dial: '963', name: 'Syria', nameFa: 'سوریه' },
  { iso2: 'TW', dial: '886', name: 'Taiwan', nameFa: 'تایوان' },
  { iso2: 'TH', dial: '66', name: 'Thailand', nameFa: 'تایلند' },
  { iso2: 'UA', dial: '380', name: 'Ukraine', nameFa: 'اوکراین' },
  { iso2: 'UZ', dial: '998', name: 'Uzbekistan', nameFa: 'ازبکستان' },
  { iso2: 'VN', dial: '84', name: 'Vietnam', nameFa: 'ویتنام' },
  { iso2: 'YE', dial: '967', name: 'Yemen', nameFa: 'یمن' },
];

/** E.164 max digits excluding leading +. */
export const E164_MAX_DIGITS = 15;

export function maxNationalDigitsForDial(dial: string): number {
  const dialLen = dial.replace(/\D/g, '').length;
  return Math.max(0, E164_MAX_DIGITS - dialLen);
}

/** Normalize stored value to readable +E.164 (Iran → +98 9xx xxx xxxx). */
export function formatInternationalPhoneDisplay(raw: string | null | undefined): string {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (!digits) return '';
  if (/^989\d{9}$/.test(digits)) {
    const n = digits.slice(2);
    return `+98 ${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`;
  }
  if (/^09\d{9}$/.test(digits)) {
    const n = digits.slice(1);
    return `+98 ${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`;
  }
  if (/^9\d{9}$/.test(digits)) {
    return `+98 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return `+${digits}`;
}

export function countryFlagEmoji(iso2: string): string {
  const code = iso2.trim().toUpperCase();
  if (code.length !== 2) return '';
  return String.fromCodePoint(...[...code].map((c) => 127397 + c.charCodeAt(0)));
}

/**
 * Default dial country for UI locale.
 * fa → IR; ar → AE; Western European locales match themselves; en → US.
 * Users can always change via the country picker — this is only the initial default.
 */
export function defaultCountryIso2ForLocale(locale?: string | null): string {
  if (locale === 'fa') return 'IR';
  if (locale === 'ar') return 'AE';
  if (locale === 'tr') return 'TR';
  if (locale === 'de') return 'DE';
  if (locale === 'fr') return 'FR';
  return 'US';
}

/**
 * Map a Cloudflare / Vercel IP country code to a dial-list ISO2.
 * Returns null when unknown / anonymized / not in our picker list.
 */
export function dialCountryIso2FromIpCountry(country?: string | null): string | null {
  if (!country) return null;
  const iso2 = country.trim().toUpperCase();
  if (!iso2 || iso2 === 'XX' || iso2 === 'T1') return null;
  // Shared +1: prefer the exact ISO when present (US/CA), else US
  if (iso2 === 'CA' || iso2 === 'US') {
    return findCountryByIso2(iso2)?.iso2 ?? 'US';
  }
  return findCountryByIso2(iso2)?.iso2 ?? null;
}

/** Soft client fallback when edge geo headers are missing. */
const TIMEZONE_TO_DIAL_ISO2: Record<string, string> = {
  'Asia/Tehran': 'IR',
  'Asia/Dubai': 'AE',
  'Asia/Riyadh': 'SA',
  'Asia/Kuwait': 'KW',
  'Asia/Qatar': 'QA',
  'Asia/Bahrain': 'BH',
  'Asia/Muscat': 'OM',
  'Asia/Baghdad': 'IQ',
  'Asia/Amman': 'JO',
  'Asia/Beirut': 'LB',
  'Europe/Istanbul': 'TR',
  'Europe/Berlin': 'DE',
  'Europe/Paris': 'FR',
  'Europe/London': 'GB',
  'Europe/Stockholm': 'SE',
  'America/New_York': 'US',
  'America/Los_Angeles': 'US',
  'America/Chicago': 'US',
  'America/Toronto': 'CA',
  'Australia/Sydney': 'AU',
};

export function dialCountryIso2FromTimezone(timezone?: string | null): string | null {
  if (!timezone?.trim()) return null;
  const iso2 = TIMEZONE_TO_DIAL_ISO2[timezone.trim()];
  if (!iso2) return null;
  return findCountryByIso2(iso2)?.iso2 ?? null;
}

export function findCountryByIso2(iso2: string): CountryDialOption | undefined {
  return COUNTRY_DIAL_OPTIONS.find((c) => c.iso2 === iso2.toUpperCase());
}

/** Longest-prefix match of dial code against a digit string. */
export function matchCountryFromDigits(
  digits: string,
  preferredIso2?: string,
): { country: CountryDialOption; national: string } | null {
  if (!digits) return null;
  const sorted = [...COUNTRY_DIAL_OPTIONS].sort((a, b) => b.dial.length - a.dial.length);
  const matches = sorted.filter(
    (c) => digits.startsWith(c.dial) && digits.length > c.dial.length,
  );
  if (!matches.length) return null;
  if (preferredIso2) {
    const preferred = matches.find((c) => c.iso2 === preferredIso2.toUpperCase());
    if (preferred) {
      return { country: preferred, national: digits.slice(preferred.dial.length) };
    }
  }
  // Prefer US over CA when both share +1
  const us = matches.find((c) => c.iso2 === 'US');
  const pick = us ?? matches[0]!;
  return { country: pick, national: digits.slice(pick.dial.length) };
}
