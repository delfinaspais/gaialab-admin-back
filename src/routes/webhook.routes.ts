import { Router } from "express";
import { handleTiendanubeWebhook } from "../controllers/webhook.controller";
import { verifyTiendanubeWebhook } from "../middleware/webhookVerification";

const router = Router();

router.post("/", verifyTiendanubeWebhook, handleTiendanubeWebhook);

export default router;
