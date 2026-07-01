import { Request, Response } from "express";
import { listSalesLines } from "../services/sales.service";

export async function getSales(_req: Request, res: Response): Promise<void> {
  const sales = await listSalesLines();
  res.json({ data: sales });
}
