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
