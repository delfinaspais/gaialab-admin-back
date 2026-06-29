import { createTiendanubeClient } from "./api.service";
import { tiendanubeOrderListSchema, tiendanubeOrderSchema } from "../../types/tiendanube";

const PAID_ORDERS_PER_PAGE = 50;

export async function fetchOrder(storeId: string, accessToken: string, orderId: string) {
  const client = createTiendanubeClient(storeId, accessToken);
  const response = await client.get(`/orders/${orderId}`);
  return tiendanubeOrderSchema.parse(response.data);
}

export async function fetchPaidOrderIds(
  storeId: string,
  accessToken: string,
  page: number
): Promise<string[]> {
  const client = createTiendanubeClient(storeId, accessToken);
  const response = await client.get("/orders", {
    params: {
      payment_status: "paid",
      per_page: PAID_ORDERS_PER_PAGE,
      page,
    },
  });

  const orders = tiendanubeOrderListSchema.parse(response.data);
  return orders.map((order) => String(order.id));
}

export async function fetchAllPaidOrderIds(
  storeId: string,
  accessToken: string
): Promise<string[]> {
  const orderIds: string[] = [];
  let page = 1;

  while (true) {
    const pageOrderIds = await fetchPaidOrderIds(storeId, accessToken, page);
    orderIds.push(...pageOrderIds);

    if (pageOrderIds.length < PAID_ORDERS_PER_PAGE) {
      break;
    }

    page += 1;
  }

  return orderIds;
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
