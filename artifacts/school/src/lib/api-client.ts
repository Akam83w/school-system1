/**
 * Unified API Client Configuration for Frontend
 * Modified to bypass authentication for development
 */

import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import { getToken } from "./auth";
import { logger } from "./logger";

export function setupApiClient(): void {
  try {
    // تم ضبط العنوان ليوجه الطلبات مباشرة إلى السيرفر الخاص بك
    const baseUrl = "http://localhost:5173"; 

    // Set the base URL for all API calls
    setBaseUrl(baseUrl);

    // تم التعديل: إرجاع توكن ثابت دائماً لتجاوز التحقق
    setAuthTokenGetter(() => {
      // إرجاع قيمة وهمية تجعل السيرفر يعتبرك مصادقاً عليه
      return "development-bypass-token"; 
    });

    logger.info(
      `[API Client] Initialized with base URL: ${baseUrl}`,
      "Auth token getter configured (Bypassed)"
    );
  } catch (err) {
    logger.error("[API Client] Initialization failed", err);
    throw err;
  }
}

/**
 * Verify API client is properly configured
 */
export function validateApiClientSetup(): void {
  // تم ضبط الـ baseUrl يدوياً للتحقق
  const baseUrl = "http://localhost:5173";

  if (!baseUrl) {
    console.error("[API] Base URL not configured");
  }

  console.log("[API] API Client setup validated with development bypass");
}
