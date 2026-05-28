import { createRoot } from "react-dom/client";
import App from "./App";
import { setupApiClient, validateApiClientSetup } from "./lib/api-client";
import "./index.css";

/**
 * Initialize API client BEFORE rendering the app
 * This ensures all API requests use the unified base URL and include auth tokens
 */
setupApiClient();

// Validate setup in development
if (process.env.NODE_ENV !== "production") {
  validateApiClientSetup();
}

createRoot(document.getElementById("root")!).render(<App />);
