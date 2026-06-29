import { Router } from "express";
import authRoutes from "./auth.routes";
import ordersRoutes from "./orders.routes";
import productsRoutes from "./products.routes";

const router = Router();

router.get("/", (_req, res) => {
  res.send("Gaia Lab API running");
});

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.use("/auth/tiendanube", authRoutes);
router.use("/orders", ordersRoutes);
router.use("/products", productsRoutes);

export default router;
