/**
 * src/utils/terbilang.ts
 *
 * Converts numeric currency amounts to Indonesian words in UPPERCASE with RUPIAH suffix.
 * Zero-dependency pure function per ADR-0007.
 */

const DIGIT_WORDS = [
  '',
  'SATU',
  'DUA',
  'TIGA',
  'EMPAT',
  'LIMA',
  'ENAM',
  'TUJUH',
  'DELAPAN',
  'SEMBILAN',
];

function convertInteger(n: number): string {
  if (n <= 0) return '';
  if (n < 10) return DIGIT_WORDS[n];
  if (n === 10) return 'SEPULUH';
  if (n === 11) return 'SEBELAS';
  if (n < 20) return convertInteger(n % 10) + ' BELAS';

  if (n < 100) {
    const tens = Math.floor(n / 10);
    const rem = n % 10;
    return (convertInteger(tens) + ' PULUH' + (rem > 0 ? ' ' + convertInteger(rem) : '')).trim();
  }

  if (n < 1000) {
    const hundreds = Math.floor(n / 100);
    const rem = n % 100;
    const prefix = hundreds === 1 ? 'SERATUS' : convertInteger(hundreds) + ' RATUS';
    return (prefix + (rem > 0 ? ' ' + convertInteger(rem) : '')).trim();
  }

  if (n < 1_000_000) {
    const thousands = Math.floor(n / 1000);
    const rem = n % 1000;
    const prefix = thousands === 1 ? 'SERIBU' : convertInteger(thousands) + ' RIBU';
    return (prefix + (rem > 0 ? ' ' + convertInteger(rem) : '')).trim();
  }

  if (n < 1_000_000_000) {
    const millions = Math.floor(n / 1_000_000);
    const rem = n % 1_000_000;
    const prefix = convertInteger(millions) + ' JUTA';
    return (prefix + (rem > 0 ? ' ' + convertInteger(rem) : '')).trim();
  }

  if (n < 1_000_000_000_000) {
    const billions = Math.floor(n / 1_000_000_000);
    const rem = n % 1_000_000_000;
    const prefix = convertInteger(billions) + ' MILIAR';
    return (prefix + (rem > 0 ? ' ' + convertInteger(rem) : '')).trim();
  }

  const trillions = Math.floor(n / 1_000_000_000_000);
  const rem = n % 1_000_000_000_000;
  const prefix = convertInteger(trillions) + ' TRILIUN';
  return (prefix + (rem > 0 ? ' ' + convertInteger(rem) : '')).trim();
}

/**
 * Converts a numeric amount to Indonesian words (UPPERCASE).
 * Zero-dependency implementation adhering to Indonesian currency conventions.
 *
 * @param amount - Numeric amount, can include decimals up to 2 decimal places
 * @returns Uppercase string ending with "RUPIAH"
 *
 * @example
 * terbilang(50000000) -> "LIMA PULUH JUTA RUPIAH"
 * terbilang(50000000.75) -> "LIMA PULUH JUTA KOMA TUJUH PULUH LIMA RUPIAH"
 * terbilang(0) -> "NOL RUPIAH"
 * terbilang(-100) -> "MINUS SERATUS RUPIAH"
 */
export function terbilang(amount: number): string {
  if (isNaN(amount) || !isFinite(amount)) {
    return 'NOL RUPIAH';
  }

  const isNegative = amount < 0;
  const abs = Math.abs(amount);

  const intPart = Math.floor(abs);
  const normalizedStr = Number(abs.toFixed(2)).toString();
  const hasDecimal = normalizedStr.includes('.');

  let words = intPart === 0 ? 'NOL' : convertInteger(intPart);

  if (hasDecimal) {
    const decStr = normalizedStr.split('.')[1] || '';
    if (decStr.length === 1) {
      const decVal = parseInt(decStr, 10);
      words += ' KOMA ' + (decVal === 0 ? 'NOL' : convertInteger(decVal));
    } else if (decStr.length === 2) {
      if (decStr.startsWith('0')) {
        const decVal = parseInt(decStr.slice(1), 10);
        words += ' KOMA NOL ' + convertInteger(decVal);
      } else {
        const decVal = parseInt(decStr, 10);
        words += ' KOMA ' + convertInteger(decVal);
      }
    }
  }

  if (isNegative && (intPart > 0 || hasDecimal)) {
    words = 'MINUS ' + words;
  }

  return `${words.trim()} RUPIAH`.toUpperCase();
}
