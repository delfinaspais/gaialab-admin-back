import { Router } from "express";
import { createPersonalSaleHandler, getSales } from "../controllers/sales.controller";

const router = Router();

router.get("/", getSales);
router.post("/personal", createPersonalSaleHandler);

export default router;
