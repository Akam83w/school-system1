import app from "./app";
import { logger } from "./lib/logger";
import { seedDatabase } from "./seed";

/* =========================
   STARTUP VALIDATION
   ========================= */

/**
 * Validate critical environment variables BEFORE server starts
 * This ensures the server fails fast with clear error messages
 * if configuration is incomplete
 */
function validateEnvironment() {
  const required = [
    { key: "DATABASE_URL", purpose: "Database connection string" },
    { key: "SESSION_SECRET", purpose: "JWT/session signing secret" },
    { key: "PORT", purpose: "Server port" },
  ];

  const missing = required.filter(({ key }) => !process.env[key]);

  if (missing.length > 0) {
    const missingList = missing
      .map((m) => `  ✗ ${m.key}: ${m.purpose}`)
      .join("\n");
    const errorMsg =
      `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `FATAL: Missing required environment variables:\n` +
      `${missingList}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Please ensure all variables are set in your .env file.\n` +
      `Use .env.example as a template.\n\n`;
    console.error(errorMsg);
    process.exit(1);
  }

  const rawPort = process.env["PORT"];
  const port = Number(rawPort);
  if (Number.isNaN(port) || port <= 0 || port > 65535) {
    const errorMsg =
      `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `FATAL: Invalid PORT value: "${rawPort}"\n` +
      `PORT must be a valid port number (1-65535)\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    console.error(errorMsg);
    process.exit(1);
  }

  logger.info(
    { env: process.env.NODE_ENV || "development", port },
    "✓ Environment validation passed"
  );
}

validateEnvironment();

/* =========================
   ROOT HEALTH ROUTE
   ========================= */
app.get("/", (req, res) => {
  res.status(200).send("School System API is running 🚀");
});

const rawPort = process.env["PORT"]!;
const port = Number(rawPort);

/* =========================
   DATABASE INITIALIZATION
   ========================= */
async function startServer() {
  try {
    logger.info("Starting database initialization...");
    await seedDatabase();
    logger.info("✓ Database initialization complete");
  } catch (err) {
    logger.error(
      { err },
      "⚠ Database seed encountered an error. " +
        "This may indicate a connection issue or missing schema. " +
        "Server will still start, but some data may be missing. " +
        "Please review the logs and consider running: pnpm db:push"
    );
    // Non-blocking: server continues but logs issue clearly
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "✗ Error listening on port");
      process.exit(1);
    }

    logger.info(
      { port, env: process.env.NODE_ENV || "development" },
      `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `✓ School System API Server listening on port ${port}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    );
  });
}

startServer();
