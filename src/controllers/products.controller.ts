import { Request, Response } from "express";
import { z } from "zod";
import {
  listProducts,
  syncProductPrices,
  updateProductCost,
} from "../services/product.service";

const updateCostSchema = z.object({
  costoUnitario: z.number().nonnegative(),
});

const syncProductsSchema = z.object({
  storeId: z.string().optional(),
});

export async function getProducts(req: Request, res: Response): Promise<void> {
  const shouldSync = req.query.sync === "true";

  if (shouldSync) {
    try {
      await syncProductPrices();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to sync products";
      res.status(500).json({ error: message });
      return;
    }
  }

  const products = await listProducts();
  res.json({ data: products });
}

export async function syncProducts(req: Request, res: Response): Promise<void> {
  const parsed = syncProductsSchema.safeParse(req.body ?? {});

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    return;
  }

  try {
    const summaries = await syncProductPrices({ storeId: parsed.data.storeId });
    res.json({ data: summaries.length === 1 ? summaries[0] : summaries });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to sync product prices";
    res.status(500).json({ error: message });
  }
}

export async function patchProductCost(req: Request, res: Response): Promise<void> {
  const parsed = updateCostSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    return;
  }

  const productId = req.params.id;
  if (typeof productId !== "string") {
    res.status(400).json({ error: "Invalid product id" });
    return;
  }

  const product = await updateProductCost(productId, parsed.data.costoUnitario);

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json({ data: product });
}
