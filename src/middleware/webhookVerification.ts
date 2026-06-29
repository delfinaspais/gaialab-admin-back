import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";

export function verifyTiendanubeWebhook(req: Request, res: Response, next: NextFunction): void {
  if (!env.TIENDANUBE_CLIENT_SECRET) {
    next();
    return;
  }

  const hmacHeader = req.headers["x-linkedstore-hmac-sha256"];

  if (!hmacHeader || typeof hmacHeader !== "string") {
    res.status(401).json({ error: "Missing webhook signature" });
    return;
  }

  const rawBody = req.body;

  if (!Buffer.isBuffer(rawBody)) {
    res.status(400).json({ error: "Invalid webhook body" });
    return;
  }

  const expectedSignature = crypto
    .createHmac("sha256", env.TIENDANUBE_CLIENT_SECRET)
    .update(rawBody)
    .digest("hex");

  const receivedBuffer = Buffer.from(hmacHeader, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    res.status(401).json({ error: "Invalid webhook signature" });
    return;
  }

  next();
}
