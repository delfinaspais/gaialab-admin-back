import { Router } from "express";
import { getPersonalProducts } from "../controllers/personalProduct.controller";

const router = Router();

router.get("/", getPersonalProducts);

export default router;
