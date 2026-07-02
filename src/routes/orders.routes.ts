import { Router } from "express";
import { getOrderById, listOrders, syncOrderById, syncOrders } from "../controllers/orders.controller";

const router = Router();

router.get("/", listOrders);
router.get("/:orderId", getOrderById);
router.post("/sync", syncOrders);
router.post("/sync/:orderId", syncOrderById);

export default router;
