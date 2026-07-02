import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { syncPaidOrder, syncPaidOrders } from "../services/orderProcessor.service";

const syncOrdersSchema = z.object({
  storeId: z.string().optional(),
  updateExisting: z.boolean().optional(),
});

export async function listOrders(_req: Request, res: Response): Promise<void> {
  const orders = await prisma.order.findMany({
    include: {
      items: true,
    },
    orderBy: {
      orderDate: "desc",
    },
  });

  res.json({ data: orders });
}

export async function getOrderById(req: Request, res: Response): Promise<void> {
  const orderIdParam = req.params.orderId;
  const orderId = typeof orderIdParam === "string" ? orderIdParam : undefined;
  const storeId = typeof req.query.storeId === "string" ? req.query.storeId : undefined;

  if (!orderId) {
    res.status(400).json({ error: "Missing order id" });
    return;
  }

  const order = await prisma.order.findFirst({
    where: {
      ...(storeId ? { storeId } : {}),
      OR: [{ id: orderId }, { orderId }],
    },
    include: { items: true },
  });

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json({ data: order });
}

export async function syncOrders(req: Request, res: Response): Promise<void> {
  const parsed = syncOrdersSchema.safeParse(req.body ?? {});

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    return;
  }

  try {
    const summaries = await syncPaidOrders({
      storeId: parsed.data.storeId,
      updateExisting: parsed.data.updateExisting ?? true,
    });

    res.json({ data: summaries });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to sync orders";
    res.status(500).json({ error: message });
  }
}

export async function syncOrderById(req: Request, res: Response): Promise<void> {
  const orderIdParam = req.params.orderId;
  const orderId = typeof orderIdParam === "string" ? orderIdParam : undefined;
  const storeId = typeof req.query.storeId === "string" ? req.query.storeId : undefined;
  const updateExisting = req.query.updateExisting !== "false";

  if (!orderId) {
    res.status(400).json({ error: "Missing order id" });
    return;
  }

  const credentials = storeId
    ? await prisma.storeCredential.findMany({ where: { storeId } })
    : await prisma.storeCredential.findMany();

  if (credentials.length === 0) {
    res.status(404).json({ error: "No store credentials found" });
    return;
  }

  if (credentials.length > 1 && !storeId) {
    res.status(400).json({
      error: "Multiple stores connected. Pass storeId query param.",
    });
    return;
  }

  try {
    const action = await syncPaidOrder(credentials[0].storeId, orderId, {
      updateIfExists: updateExisting,
    });

    res.json({
      data: {
        storeId: credentials[0].storeId,
        orderId,
        action,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to sync order";
    res.status(500).json({ error: message });
  }
}
