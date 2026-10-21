import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { requestLogPath, careLinkSecurityHeaders } from "./lib/request-log-path";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost, parsePublishableKey } from "@clerk/shared/keys";
import { CLERK_PROXY_PATH, clerkProxyMiddleware, getClerkProxyHost } from "./middlewares/clerkProxyMiddleware";

const app: Express = express();

app.use((req, res, next) => {
  const clerkHost = parsePublishableKey(process.env.CLERK_PUBLISHABLE_KEY)?.frontendApi;
  for (const [name, value] of Object.entries(careLinkSecurityHeaders(req.url, clerkHost))) res.setHeader(name, value);
  next();
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: requestLogPath(req.url),
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use(cors());
app.use(express.json({ limit: "64kb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use("/api", router);

app.use(((error, req, res, next) => {
  if (res.headersSent) { next(error); return; }
  // Do not put medical records, validation input, or SQL parameter values in logs.
  req.log.error({ errorType: error instanceof Error ? error.name : "Error" }, "API request failed");
  res.status(500).json({ error: "Unable to complete this request. Please try again." });
}) as express.ErrorRequestHandler);

export default app;
