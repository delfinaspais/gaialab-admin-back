import { Request, Response } from "express";
import { tiendanubeWebhookPayloadSchema } from "../types/tiendanube";
import { processPaidOrder } from "../services/orderProcessor.service";

export async function handleTiendanubeWebhook(req: Request, res: Response): Promise<void> {
  let payload: unknown;

  try {
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";
    payload = JSON.parse(rawBody);
  } catch {
    res.status(400).json({ error: "Invalid JSON payload" });
    return;
  }

  const parsed = tiendanubeWebhookPayloadSchema.safeParse(payload);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid webhook payload" });
    return;
  }

  const { store_id, event, id } = parsed.data;

  res.status(200).json({ received: true });

  if (event !== "order/paid") {
    return;
  }

  const storeId = String(store_id);
  const orderId = String(id);

  setImmediate(() => {
    processPaidOrder(storeId, orderId).catch((error) => {
      console.error(`Failed to process order/paid webhook for order ${orderId}:`, error);
    });
  });
}
