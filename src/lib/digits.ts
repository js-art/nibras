const map = (value: string | number, digits: string) =>
  String(value).replace(/\d/g, (digit) => digits[Number(digit)] ?? digit);

export function toPersianDigits(value: string | number) {
  return map(value, "۰۱۲۳۴۵۶۷۸۹");
}

export function toArabicDigits(value: string | number) {
  return map(value, "٠١٢٣٤٥٦٧٨٩");
}

/** Convert Persian/Arabic-Indic digits (and keep ASCII) to English 0–9. */
export function toEnglishDigits(value: string | number) {
  return String(value)
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}
