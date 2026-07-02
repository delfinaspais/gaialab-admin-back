import { Router } from "express";
import {
  getProductCategories,
  getProducts,
  patchProductCost,
  syncProducts,
} from "../controllers/products.controller";
import { cacheShortPublic } from "../middleware/cacheHeaders";

const router = Router();

router.get("/", cacheShortPublic(60), getProducts);
router.get("/categories", cacheShortPublic(300), getProductCategories);
router.post("/sync", syncProducts);
router.patch("/:id/cost", patchProductCost);

export default router;
