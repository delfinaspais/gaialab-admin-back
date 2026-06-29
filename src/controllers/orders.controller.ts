import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

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
