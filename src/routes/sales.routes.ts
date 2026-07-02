import { Router } from "express";
import {
  createPersonalSaleHandler,
  getSales,
  updatePersonalSaleHandler,
} from "../controllers/sales.controller";

const router = Router();

router.get("/", getSales);
router.post("/personal", createPersonalSaleHandler);
router.patch("/personal/:id", updatePersonalSaleHandler);

export default router;