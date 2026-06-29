import { z } from "zod";

export const tiendanubeTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  scope: z.string(),
  user_id: z.union([z.string(), z.number()]),
});

export const tiendanubeWebhookPayloadSchema = z.object({
  store_id: z.union([z.string(), z.number()]),
  event: z.string(),
  id: z.union([z.string(), z.number()]),
});

export const tiendanubeOrderProductSchema = z.object({
  id: z.union([z.string(), z.number()]),
  product_id: z.union([z.string(), z.number()]),
  variant_id: z.union([z.string(), z.number()]),
  name: z.string(),
  price: z.union([z.string(), z.number()]),
  quantity: z.number(),
  sku: z.string().nullable().optional(),
});

export const tiendanubeOrderSchema = z.object({
  id: z.union([z.string(), z.number()]),
  store_id: z.union([z.string(), z.number()]).optional(),
  number: z.union([z.string(), z.number()]).optional(),
  total: z.union([z.string(), z.number()]),
  payment_status: z.string(),
  created_at: z.string(),
  paid_at: z.string().nullable().optional(),
  billing_name: z.string().nullable().optional(),
  customer: z
    .object({
      name: z.string().optional(),
      first_name: z.string().optional(),
      last_name: z.string().optional(),
    })
    .nullable()
    .optional(),
  products: z.array(tiendanubeOrderProductSchema),
});

export type TiendanubeTokenResponse = z.infer<typeof tiendanubeTokenResponseSchema>;
export type TiendanubeWebhookPayload = z.infer<typeof tiendanubeWebhookPayloadSchema>;
export type TiendanubeOrder = z.infer<typeof tiendanubeOrderSchema>;
export type TiendanubeOrderProduct = z.infer<typeof tiendanubeOrderProductSchema>;
