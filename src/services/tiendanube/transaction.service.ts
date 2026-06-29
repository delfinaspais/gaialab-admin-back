import { z } from "zod";
import { createTiendanubeClient } from "./api.service";

const moneySchema = z.object({
  value: z.string(),
  currency: z.string().optional(),
});

const merchantChargeSchema = z.object({
  type: z.string(),
  amount: moneySchema,
  description: z.string().optional(),
});

export const tiendanubeTransactionSchema = z.object({
  id: z.string(),
  payment_method: z
    .object({
      type: z.string().optional(),
      id: z.string().optional(),
    })
    .optional(),
  info: z
    .object({
      card: z
        .object({
          brand: z.string().optional(),
          last_digits: z.string().optional(),
        })
        .optional(),
      installments: z
        .object({
          quantity: z.coerce.number().optional(),
          interest: z.string().optional(),
        })
        .optional(),
      external_id: z.string().optional(),
    })
    .optional(),
  merchant_charges: z.array(merchantChargeSchema).optional(),
  captured_amount: moneySchema.optional(),
});

export const tiendanubeTransactionsSchema = z.array(tiendanubeTransactionSchema);

export type TiendanubeTransaction = z.infer<typeof tiendanubeTransactionSchema>;

export async function fetchOrderTransactions(
  storeId: string,
  accessToken: string,
  orderId: string
): Promise<TiendanubeTransaction[]> {
  const client = createTiendanubeClient(storeId, accessToken);

  try {
    const response = await client.get(`/orders/${orderId}/transactions`);
    return tiendanubeTransactionsSchema.parse(response.data);
  } catch {
    return [];
  }
}
