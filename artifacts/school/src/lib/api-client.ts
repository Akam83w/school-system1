/**
 * Same-origin API configuration for the unified Deplexo deployment.
 * The browser must call /api on the host serving this frontend.
 */
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import { getToken } from "./auth";

export function setupApiClient(): void {
  setBaseUrl("");
  setAuthTokenGetter(getToken);
}

export function validateApiClientSetup(): void {
  // Empty base URL intentionally means same-origin requests.
  console.log("[API] Same-origin API client configured");
}
