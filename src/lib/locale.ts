/** HTML lang: español latinoamericano (BCP 47). */
export const SITE_LANG = "es-419";

/** Fechas, moneda y números: Honduras (organización local). */
export const SITE_LOCALE = "es-HN";

/** Zona horaria fija para evitar mismatches de hidratación SSR/cliente. */
export const SITE_TIMEZONE = "America/Tegucigalpa";

function withSiteTimezone(options?: Intl.DateTimeFormatOptions): Intl.DateTimeFormatOptions {
  return { timeZone: SITE_TIMEZONE, ...options };
}

export function formatSiteDate(
  value: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Date(value).toLocaleDateString(SITE_LOCALE, withSiteTimezone(options));
}

export function formatSiteDateTime(
  value: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Date(value).toLocaleString(SITE_LOCALE, withSiteTimezone(options));
}

export function formatSiteTime(
  value: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Date(value).toLocaleTimeString(SITE_LOCALE, withSiteTimezone(options));
}

export function formatSiteNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return value.toLocaleString(SITE_LOCALE, options);
}

export function formatSiteCurrency(value: number): string {
  return new Intl.NumberFormat(SITE_LOCALE, {
    style: "currency",
    currency: "HNL",
    maximumFractionDigits: 0,
  }).format(value);
}

export function compareSiteText(a: string, b: string): number {
  return a.localeCompare(b, SITE_LOCALE, { sensitivity: "base" });
}
