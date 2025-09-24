// components/services/exchanges/utils.ts

/**
 * Builds an absolute URL for backend proxy endpoints, supporting both
 * production (same-origin) and local development where the Vite dev server
 * runs on port 5173 while the Express backend listens on 8080.
 */
export const buildProxyUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  const env = (typeof process !== 'undefined' ? process.env : {}) as Record<string, string | undefined>;
  const configuredBase =
    env.REACT_APP_BACKEND_URL ||
    env.REACT_APP_API_BASE_URL ||
    env.REACT_APP_SERVER_URL ||
    env.REACT_APP_BACKEND_BASE_URL ||
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

  const num = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(num) ? num : undefined;
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

const normalizePercentValue = (value: number): number => {
  if (!Number.isFinite(value)) {
    return value;
  }

  const absolute = Math.abs(value);

  if (absolute === 0) {
    return value;
  }

  if (absolute <= 1) {
    return value * 100;
  }

  return value;
};

type ChangePercentArgs = {
  percent?: unknown;
  ratio?: unknown;
  priceChange?: unknown;
  openPrice?: unknown;
  lastPrice?: unknown;
};

export const deriveChangePercent = ({
  percent,
  ratio,
  priceChange,
  openPrice,
  lastPrice,
}: ChangePercentArgs): number | undefined => {
  const open = safeParseNumber(openPrice);
  const last = safeParseNumber(lastPrice);
  if (open !== undefined && last !== undefined && open !== 0) {
    const derived = ((last - open) / open) * 100;
    if (Number.isFinite(derived)) {
      return derived;
    }
  }

  const delta = safeParseNumber(priceChange);
  if (delta !== undefined && open !== undefined && open !== 0) {
    const derived = (delta / open) * 100;
    if (Number.isFinite(derived)) {
      return derived;
    }
  }

  const percentValue = safeParseNumber(percent);
  if (percentValue !== undefined) {
    const normalized = normalizePercentValue(percentValue);
    return Number.isFinite(normalized) ? normalized : undefined;
  }

  const ratioValue = safeParseNumber(ratio);
  if (ratioValue !== undefined) {
    const normalized = normalizePercentValue(ratioValue);
    return Number.isFinite(normalized) ? normalized : undefined;
  }

  return undefined;
};

export const deriveQuoteVolume = (
  quoteVolumeInput: unknown,
  baseVolumeInput: unknown,
  price: unknown
): number | undefined => {
  const quoteVolume = safeParseNumber(quoteVolumeInput);
  if (quoteVolume !== undefined && Number.isFinite(quoteVolume) && quoteVolume > 0) {
    return quoteVolume;
  }

  const volumeFromBase = safeMultiply(baseVolumeInput, price);
  if (volumeFromBase !== undefined && Number.isFinite(volumeFromBase) && volumeFromBase > 0) {
    return volumeFromBase;
  }

  return undefined;
};
