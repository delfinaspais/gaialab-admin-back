import { Request, Response } from "express";
import { listPersonalProducts } from "../services/personalProduct.service";

export async function getPersonalProducts(req: Request, res: Response): Promise<void> {
  const q = typeof req.query.q === "string" ? req.query.q : undefined;
  const limitParam = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;
  const limit = Number.isFinite(limitParam) ? limitParam : undefined;

  const products = await listPersonalProducts({ q, limit });
  res.json({ data: products });
}
