import { createTiendanubeClient } from "./api.service";
import { tiendanubeOrderSchema } from "../../types/tiendanube";

export async function fetchOrder(storeId: string, accessToken: string, orderId: string) {
  const client = createTiendanubeClient(storeId, accessToken);
  const response = await client.get(`/orders/${orderId}`);
  return tiendanubeOrderSchema.parse(response.data);
}

export async function fetchVariantSku(
  storeId: string,
  accessToken: string,
  productId: string,
  variantId: string
): Promise<string | null> {
  const client = createTiendanubeClient(storeId, accessToken);

  try {
    const response = await client.get(`/products/${productId}/variants/${variantId}`);
    const sku = response.data?.sku;
    return typeof sku === "string" && sku.length > 0 ? sku : null;
  } catch {
    return null;
  }
}
