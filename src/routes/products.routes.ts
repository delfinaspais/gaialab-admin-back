import { Router } from "express";
import { getProducts, patchProductCost } from "../controllers/products.controller";

const router = Router();

router.get("/", getProducts);
router.patch("/:id/cost", patchProductCost);

export default router;
