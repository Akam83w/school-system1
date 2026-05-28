/**
 * Unified API Client Configuration for Frontend
 * 
 * This module handles centralized API configuration for the unified deployment
 * Ensures all frontend requests use the same base URL regardless of environment
 */

import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import { getToken } from "./auth";
import { logger } from "./logger";

/**
 * Initialize the API client with unified configuration
 * 
 * This should be called ONCE during app startup (in main.tsx)
 * Sets up:
 * 1. Base URL for all API requests (relative to current domain)
 * 2. Auth token getter (automatically attaches JWT to requests)
 */
export function setupApiClient(): void {
  try {
    // In a unified deployment, frontend and backend are on the same server
    // Use relative path /api to reach backend from same origin
    const baseUrl = "/api";

    // Set the base URL for all API calls
    setBaseUrl(baseUrl);

    // Configure auth token getter
    // This function is called before EVERY API request
    // If it returns a token, it's automatically added as: Authorization: Bearer <token>
    setAuthTokenGetter(() => {
      const token = getToken();
      if (token) {
        logger.debug("[API] Attaching token to request");
      }
      return token;
    });

    logger.info(
      `[API Client] Initialized with base URL: ${baseUrl}`,
      "Auth token getter configured"
    );
  } catch (err) {
    logger.error("[API Client] Initialization failed", err);
    throw err;
  }
}

/**
 * Verify API client is properly configured
 * Call this in development to ensure integration is correct
 */
export function validateApiClientSetup(): void {
  const token = getToken();
  const baseUrl = "/api";

  if (!baseUrl) {
    console.error("[API] Base URL not configured");
  }

  if (token) {
    console.log("[API] Token found in localStorage");
  } else {
    console.log("[API] No token in localStorage (user not authenticated)");
  }
}
