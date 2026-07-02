import { Request, Response } from "express";
import { z } from "zod";
import { syncPaidOrders } from "../services/orderProcessor.service";
import {
  createPersonalSale,
  getAvailableSaleMonths,
  listSales,
} from "../services/sales.service";

const canalSchema = z.enum(["tiendanube", "personal", "all"]);

const personalSaleItemSchema = z
  .object({
    productoId: z.string().min(1).optional(),
    producto: z.string().min(1).optional(),
    categoria: z.string().optional(),
    cantidad: z.number().positive(),
    precioUnitario: z.number().nonnegative(),
    costoUnitario: z.number().nonnegative().optional(),
  })
  .refine((item) => item.productoId || item.producto, {
    message: "Each item must include productoId or producto",
  });

const personalSaleSchema = z.object({
  fecha: z.string().min(1),
  cliente: z.string().min(1),
  cobrado: z.boolean().optional(),
  descuento: z.number().nonnegative().optional(),
  items: z.array(personalSaleItemSchema).min(1),
});

export async function getSales(req: Request, res: Response): Promise<void> {
  const mes = typeof req.query.mes === "string" ? req.query.mes : undefined;
  const canalParam = typeof req.query.canal === "string" ? req.query.canal : "all";
  const canalParsed = canalSchema.safeParse(canalParam);

  if (!canalParsed.success) {
    res.status(400).json({ error: "Invalid canal filter. Use tiendanube, personal or all." });
    return;
  }

  if (req.query.sync === "true") {
    try {
      await syncPaidOrders({ updateExisting: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to sync orders";
      res.status(500).json({ error: message });
      return;
    }
  }

  const sales = await listSales({ mes, canal: canalParsed.data });
  const allSales = await listSales();

  res.json({
    data: sales,
    meta: {
      total: sales.length,
      meses: getAvailableSaleMonths(allSales),
    },
  });
}

export async function createPersonalSaleHandler(req: Request, res: Response): Promise<void> {
  const parsed = personalSaleSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    return;
  }

  try {
    const sale = await createPersonalSale(parsed.data);
    res.status(201).json({ data: sale });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create personal sale";
    res.status(500).json({ error: message });
  }
}
