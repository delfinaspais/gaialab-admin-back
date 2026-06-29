import { Router } from "express";
import { listOrders } from "../controllers/orders.controller";

const router = Router();

router.get("/", listOrders);

export default router;
