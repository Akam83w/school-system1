import express, { type Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();
const frontendDist = path.resolve(process.cwd(), "artifacts/school/dist");

/* =========================
   LOGGING MIDDLEWARE
   ========================= */
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  })
);

/* =========================
   CORS & BODY PARSING
   ========================= */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   API ROUTES
   ========================= */
app.use("/api", router);

/* =========================
   FRONTEND STATIC FILES + SPA FALLBACK
   Keep this before the 404 handler so the web app can load.
   ========================= */
app.use(express.static(frontendDist));
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method !== "GET" || req.path.startsWith("/api")) {
    return next();
  }

  res.sendFile(path.join(frontendDist, "index.html"), (err) => {
    if (err) next();
  });
});

/* =========================
   ERROR HANDLING MIDDLEWARE
   ========================= */
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error({ err, path: req.path }, "Unhandled error in request");
  res.status(500).json({ error: "حدث خطأ داخلي في الخادم" });
});

/* =========================
   404 NOT FOUND HANDLER
   ========================= */
app.use((req: Request, res: Response) => {
  logger.warn({ method: req.method, path: req.path }, "Route not found");
  res.status(404).json({ error: "المسار غير موجود" });
});

export default app;
