import { Router } from "express";
import {
  createPersonalSaleHandler,
  getSaleByIdHandler,
  getSales,
  getSalesStatsHandler,
  updatePersonalSaleHandler,
} from "../controllers/sales.controller";

const router = Router();

router.get("/stats", getSalesStatsHandler);
router.get("/", getSales);
router.get("/:id", getSaleByIdHandler);
router.post("/personal", createPersonalSaleHandler);
router.patch("/personal/:id", updatePersonalSaleHandler);

export default router;
