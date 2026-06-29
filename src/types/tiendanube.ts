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
  quantity: z.coerce.number(),
  sku: z.string().nullable().optional(),
});

export const tiendanubePaymentDetailsSchema = z
  .object({
    method: z.string().optional(),
    credit_card_company: z.string().optional(),
    installments: z.coerce.number().optional(),
  })
  .passthrough();

export const tiendanubeOrderSchema = z.object({
  id: z.union([z.string(), z.number()]),
  store_id: z.union([z.string(), z.number()]).optional(),
  number: z.union([z.string(), z.number()]).optional(),
  subtotal: z.union([z.string(), z.number()]).optional(),
  discount: z.union([z.string(), z.number()]).optional(),
  shipping_cost_customer: z.union([z.string(), z.number()]).optional(),
  shipping_option: z.string().nullable().optional(),
  total: z.union([z.string(), z.number()]),
  total_paid_by_customer: z.union([z.string(), z.number()]).optional(),
  total_paid_by_customer_including_fees: z.union([z.string(), z.number()]).optional(),
  currency: z.string().optional(),
  gateway_name: z.string().nullable().optional(),
  gateway_id: z.union([z.string(), z.number()]).nullable().optional(),
  payment_status: z.string(),
  created_at: z.string(),
  paid_at: z.string().nullable().optional(),
  billing_name: z.string().nullable().optional(),
  payment_details: tiendanubePaymentDetailsSchema.nullable().optional(),
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
