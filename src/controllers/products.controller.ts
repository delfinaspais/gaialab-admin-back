import { Request, Response } from "express";
import { z } from "zod";
import { listProducts, updateProductCost } from "../services/product.service";

const updateCostSchema = z.object({
  costoUnitario: z.number().nonnegative(),
});

export async function getProducts(_req: Request, res: Response): Promise<void> {
  const products = await listProducts();
  res.json({ data: products });
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
