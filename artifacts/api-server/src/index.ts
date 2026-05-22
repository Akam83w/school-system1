import app from "./app";
import { logger } from "./lib/logger";
import { seedDatabase } from "./seed";

/* =========================
   ROOT HEALTH ROUTE
   ========================= */
app.get("/", (req, res) => {
  res.status(200).send("School System API is running 🚀");
});

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

/* =========================
   SAFE SEED STARTUP
   ========================= */
async function startServer() {
  try {
    await seedDatabase();
  } catch (err) {
    logger.warn({ err }, "Seed failed (non-blocking)");
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}

startServer();
