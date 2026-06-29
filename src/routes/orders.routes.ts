import { Router } from "express";
import { listOrders, syncOrderById, syncOrders } from "../controllers/orders.controller";

const router = Router();

router.get("/", listOrders);
router.post("/sync", syncOrders);
router.post("/sync/:orderId", syncOrderById);

export default router;
