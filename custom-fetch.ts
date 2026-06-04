import type { RequestConfig } from './types';

let _baseUrl: string | null =
  import.meta.env.VITE_API_URL || "http://localhost:3000";

let _authTokenGetter: (() => string | null) | null = null;

export const setBaseUrl = (url: string) => {
  _baseUrl = url;
};

export const setAuthTokenGetter = (getter: () => string | null) => {
  _authTokenGetter = getter;
};

export type AuthTokenGetter = () => string | null;

export const customFetch = async <T>(config: RequestConfig): Promise<T> => {
  const url = (_baseUrl || "") + config.url;

  const response = await fetch(url, {
    method: config.method,
    headers: {
      'Content-Type': 'application/json',
      ...(config.headers || {}),
      ...( _authTokenGetter?.() ? {
        Authorization: `Bearer ${_authTokenGetter()}`
      } : {})
    },
    body: config.data ? JSON.stringify(config.data) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error || `HTTP error ${response.status}`);
  }

  return response.json();
};
