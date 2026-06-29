import "dotenv/config";
import express from "express";
import routes from "./routes";
import webhookRoutes from "./routes/webhook.routes";
import { errorHandler } from "./middleware/errorHandler";
import { env } from "./config/env";

const app = express();

app.use(
  "/webhooks/tiendanube",
  express.raw({ type: "application/json" }),
  webhookRoutes
);

app.use(express.json());
app.use(routes);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Gaia Lab API listening on port ${env.PORT}`);
});
