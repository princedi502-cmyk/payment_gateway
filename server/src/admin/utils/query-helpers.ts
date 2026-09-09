export function getQueryParam(params: Record<string, any>, key: string, defaultValue?: string): string {
  const value = params[key];
  if (Array.isArray(value)) return value[0] || defaultValue || '';
  if (value === undefined) return defaultValue || '';
  return String(value);
}

export function getQueryParamAsInt(params: Record<string, any>, key: string, defaultValue: number): number {
  const value = getQueryParam(params, key);
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

export function getQueryParamAsBool(params: Record<string, any>, key: string): boolean | undefined {
  const value = getQueryParam(params, key);
  if (value === '') return undefined;
  return value === 'true';
}

export function getRouteParam(params: Record<string, string>, key: string): string {
  const value = params[key];
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
}
