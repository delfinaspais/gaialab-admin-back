import { Router } from "express";
import { installTiendanube, tiendanubeCallback } from "../controllers/auth.controller";

const router = Router();

router.get("/install", installTiendanube);
router.get("/callback", tiendanubeCallback);

export default router;
