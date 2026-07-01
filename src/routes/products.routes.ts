import { Router } from "express";
import { getProducts, patchProductCost, syncProducts } from "../controllers/products.controller";

const router = Router();

router.get("/", getProducts);
router.post("/sync", syncProducts);
router.patch("/:id/cost", patchProductCost);

export default router;
