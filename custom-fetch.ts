import type { RequestConfig } from './types'; // تأكد من المسار الصحيح

let _baseUrl: string | null = "https://school-system1-4.onrender.com";
let _authTokenGetter: (() => string | null) | null = null;

export const setBaseUrl = (url: string) => { _baseUrl = url; };
export const setAuthTokenGetter = (getter: () => string | null) => { _authTokenGetter = getter; };
export type AuthTokenGetter = () => string | null;

// التعديل هنا: الدالة تقبل (config) فقط، ولكن نجعلها متوافقة
export const customFetch = async <T>(config: RequestConfig): Promise<T> => {
  const url = (_baseUrl || "") + config.url;
  
  const response = await fetch(url, {
    method: config.method,
    headers: {
      'Content-Type': 'application/json',
      ...config.headers,
    },
    body: config.data ? JSON.stringify(config.data) : undefined,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};
