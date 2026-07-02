import { Request, Response } from "express";
import { z } from "zod";
import { syncPaidOrders } from "../services/orderProcessor.service";
import {
  createPersonalSale,
  getAvailableSaleMonthsFromDb,
  getSaleById,
  getSalesStats,
  listSalesPaginated,
  updatePersonalSale,
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

function parsePositiveInt(value: unknown, fallback: number): number {
  if (typeof value !== "string") {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseSalesQuery(req: Request) {
  const mes = typeof req.query.mes === "string" ? req.query.mes : undefined;
  const canalParam = typeof req.query.canal === "string" ? req.query.canal : "all";
  const canalParsed = canalSchema.safeParse(canalParam);
  const isExport = req.query.export === "true" || req.query.limit === "0";
  const page = parsePositiveInt(req.query.page, 1);
  const limit = parsePositiveInt(req.query.limit, 15);

  return { mes, canalParsed, isExport, page, limit };
}

export async function getSalesStatsHandler(req: Request, res: Response): Promise<void> {
  const { mes, canalParsed } = parseSalesQuery(req);

  if (!canalParsed.success) {
    res.status(400).json({ error: "Invalid canal filter. Use tiendanube, personal or all." });
    return;
  }

  const stats = await getSalesStats({ mes, canal: canalParsed.data });
  res.json({ data: stats });
}

export async function getSaleByIdHandler(req: Request, res: Response): Promise<void> {
  const saleId = req.params.id;
  if (typeof saleId !== "string") {
    res.status(400).json({ error: "Invalid sale id" });
    return;
  }

  const sale = await getSaleById(saleId);

  if (!sale) {
    res.status(404).json({ error: "Sale not found" });
    return;
  }

  res.json({ data: sale });
}

export async function getSales(req: Request, res: Response): Promise<void> {
  const { mes, canalParsed, isExport, page, limit } = parseSalesQuery(req);

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

  const [result, meses] = await Promise.all([
    listSalesPaginated({
      mes,
      canal: canalParsed.data,
      page,
      limit,
      export: isExport,
    }),
    getAvailableSaleMonthsFromDb(),
  ]);

  res.json({
    data: result.data,
    meta: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      meses,
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

export async function updatePersonalSaleHandler(req: Request, res: Response): Promise<void> {
  const saleId = req.params.id;
  if (typeof saleId !== "string") {
    res.status(400).json({ error: "Invalid sale id" });
    return;
  }

  const parsed = personalSaleSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    return;
  }

  try {
    const sale = await updatePersonalSale(saleId, parsed.data);

    if (!sale) {
      res.status(404).json({ error: "Personal sale not found" });
      return;
    }

    res.json({ data: sale });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update personal sale";
    res.status(500).json({ error: message });
  }
}
