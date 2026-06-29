import { Request, Response } from "express";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { exchangeCodeForToken, getInstallUrl } from "../services/tiendanube/auth.service";
import { env } from "../config/env";

export async function installTiendanube(_req: Request, res: Response): Promise<void> {
  const state = crypto.randomBytes(16).toString("hex");
  res.redirect(getInstallUrl(state));
}

export async function tiendanubeCallback(req: Request, res: Response): Promise<void> {
  const code = req.query.code;

  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "Missing authorization code" });
    return;
  }

  const tokenData = await exchangeCodeForToken(code);
  const storeId = String(tokenData.user_id);

  await prisma.storeCredential.upsert({
    where: { storeId },
    create: {
      storeId,
      accessToken: tokenData.access_token,
      scope: tokenData.scope,
    },
    update: {
      accessToken: tokenData.access_token,
      scope: tokenData.scope,
    },
  });

  res.json({
    success: true,
    message: "Tienda Nube connected successfully",
    storeId,
    appUrl: env.APP_URL,
  });
}
