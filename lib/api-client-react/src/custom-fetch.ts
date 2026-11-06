export interface RequestConfig {
  url?: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  data?: unknown;
  body?: BodyInit | null;
  signal?: AbortSignal;
  [key: string]: unknown;
}

/**
 * Base URL for API calls.
 * - Empty string = same origin (recommended for unified deployment)
 * - Can be overridden at runtime via setBaseUrl()
 * Do NOT hardcode a production host here; it breaks local/dev and other deploys.
 */
let _baseUrl: string | null = "";
let _authTokenGetter: (() => string | null) | null = null;

export const setBaseUrl = (url: string) => {
  _baseUrl = url;
};

export const setAuthTokenGetter = (getter: () => string | null) => {
  _authTokenGetter = getter;
};

export type AuthTokenGetter = () => string | null;

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export const customFetch = async <T>(url: string, config: RequestConfig): Promise<T> => {
  const fullUrl = `${_baseUrl || ""}${url}`;

  const headers: Record<string, string> = {
    ...(config.headers as Record<string, string> | undefined),
  };

  // Attach JWT when available (required for all protected routes)
  const token = _authTokenGetter?.() ?? null;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Only set Content-Type when we actually send a body
  const hasBody = config.data !== undefined || (config.body !== undefined && config.body !== null);
  if (hasBody && !headers["Content-Type"] && !headers["content-type"]) {
    headers["Content-Type"] = "application/json";
  }

  let body: BodyInit | undefined | null;
  if (config.data !== undefined) {
    body = JSON.stringify(config.data);
  } else if (config.body !== undefined) {
    body = config.body;
  }

  const response = await fetch(fullUrl, {
    method: config.method,
    headers,
    body: body ?? undefined,
    signal: config.signal,
  });

  // 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json().catch(() => null) : await response.text().catch(() => null);

  if (!response.ok) {
    const message =
      (payload && typeof payload === "object" && "error" in payload && typeof (payload as any).error === "string"
        ? (payload as any).error
        : null) ||
      (typeof payload === "string" && payload.trim() ? payload : null) ||
      `HTTP error! status: ${response.status}`;

    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
};
