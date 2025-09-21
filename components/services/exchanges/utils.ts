// components/services/exchanges/utils.ts

/**
 * Builds an absolute URL for backend proxy endpoints, supporting both
 * production (same-origin) and local development where the Vite dev server
 * runs on port 5173 while the Express backend listens on 8080.
 */
export const buildProxyUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  const env = (import.meta as any)?.env ?? {};
  const configuredBase =
    env.VITE_BACKEND_URL ||
    env.VITE_API_BASE_URL ||
    env.VITE_SERVER_URL ||
    env.VITE_BACKEND_BASE_URL;

  if (configuredBase) {
    const trimmedBase = configuredBase.replace(/\/?$/, '');
    return `${trimmedBase}${normalizedPath}`;
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    const devPorts = new Set(['5173', '4173']);
    if (devPorts.has(port)) {
      return `${protocol}//${hostname}:8080${normalizedPath}`;
    }
  }

  return normalizedPath;
};

const parseNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    const normalized = trimmed
      .replace(/[,\s]+/g, '')
      .replace(/[%％]/g, '')
      .replace(/[₩$€£¥₫]/g, '')
      .replace(/_/g, '');

    if (!normalized || normalized === '-' || normalized === '+') {
      return undefined;
    }

    const num = Number(normalized);
    return Number.isFinite(num) ? num : undefined;
  }

  const coerced = Number(value);
  return Number.isFinite(coerced) ? coerced : undefined;
};

export const safeParseNumber = (value: unknown): number | undefined => {
  return parseNumber(value);
};

export const safeMultiply = (
  left: unknown,
  right: unknown
): number | undefined => {
  const a = parseNumber(left);
  const b = parseNumber(right);
  if (a === undefined || b === undefined) {
    return undefined;
  }
  const product = a * b;
  return Number.isFinite(product) ? product : undefined;
};

export interface ChangePercentInput {
  percent?: unknown;
  ratio?: unknown;
  priceChange?: unknown;
  openPrice?: unknown;
  lastPrice?: unknown;
}

export const deriveChangePercent = (
  input: ChangePercentInput
): number | undefined => {
  const { percent, ratio, priceChange, openPrice, lastPrice } = input;

  const last = safeParseNumber(lastPrice);
  const open = safeParseNumber(openPrice);
  if (last !== undefined && open !== undefined && Math.abs(open) > 1e-12) {
    return ((last - open) / open) * 100;
  }

  const change = safeParseNumber(priceChange);
  if (change !== undefined && last !== undefined) {
    const base = last - change;
    if (Math.abs(base) > 1e-12) {
      return (change / base) * 100;
    }
  }

  const percentValue = safeParseNumber(percent);
  if (percentValue !== undefined) {
    const percentText = typeof percent === 'string' ? percent : undefined;
    const hasPercentSymbol = percentText ? percentText.includes('%') : false;

    if (hasPercentSymbol) {
      return percentValue;
    }

    if (Math.abs(percentValue) >= 1) {
      return percentValue;
    }

    return percentValue * 100;
  }

  const ratioValue = safeParseNumber(ratio);
  if (ratioValue !== undefined) {
    if (Math.abs(ratioValue) <= 1) {
      return ratioValue * 100;
    }
    return ratioValue;
  }

  return undefined;
};

export const deriveQuoteVolume = (
  quoteVolume: unknown,
  baseVolume: unknown,
  lastPrice: unknown
): number | undefined => {
  const direct = safeParseNumber(quoteVolume);
  if (direct !== undefined) {
    return direct;
  }

  const base = safeParseNumber(baseVolume);
  const price = safeParseNumber(lastPrice);

  if (base !== undefined && price !== undefined) {
    const derived = base * price;
    return Number.isFinite(derived) ? derived : undefined;
  }

  return undefined;
};
