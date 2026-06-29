import { prisma } from "../lib/prisma";
import { fetchOrder, fetchVariantSku } from "./tiendanube/order.service";
import type { TiendanubeOrder, TiendanubeOrderProduct } from "../types/tiendanube";

function toStringId(value: string | number): string {
  return String(value);
}

function toDecimalString(value: string | number): string {
  return String(value);
}

function resolveCustomerName(order: TiendanubeOrder): string | null {
  if (order.billing_name) {
    return order.billing_name;
  }

  const customer = order.customer;
  if (!customer) {
    return null;
  }

  if (customer.name) {
    return customer.name;
  }

  const fullName = [customer.first_name, customer.last_name].filter(Boolean).join(" ").trim();
  return fullName || null;
}

async function ensureProduct(
  storeId: string,
  accessToken: string,
  item: TiendanubeOrderProduct
) {
  const productId = toStringId(item.product_id);
  const variantId = toStringId(item.variant_id);

  const existing = await prisma.product.findUnique({
    where: {
      storeId_variantId: {
        storeId,
        variantId,
      },
    },
  });

  if (existing) {
    return existing;
  }

  let sku = item.sku ?? null;
  if (!sku) {
    sku = await fetchVariantSku(storeId, accessToken, productId, variantId);
  }

  return prisma.product.create({
    data: {
      storeId,
      productId,
      variantId,
      sku,
      name: item.name,
      costoUnitario: null,
      status: "pending_cost",
    },
  });
}

export async function processPaidOrder(storeId: string, orderId: string): Promise<void> {
  const storeIdStr = toStringId(storeId);
  const orderIdStr = toStringId(orderId);

  const existingOrder = await prisma.order.findUnique({
    where: {
      storeId_orderId: {
        storeId: storeIdStr,
        orderId: orderIdStr,
      },
    },
  });

  if (existingOrder) {
    return;
  }

  const credential = await prisma.storeCredential.findUnique({
    where: { storeId: storeIdStr },
  });

  if (!credential) {
    throw new Error(`No credentials found for store ${storeIdStr}`);
  }

  const order = await fetchOrder(storeIdStr, credential.accessToken, orderIdStr);

  await prisma.order.create({
    data: {
      orderId: orderIdStr,
      storeId: storeIdStr,
      customerName: resolveCustomerName(order),
      total: toDecimalString(order.total),
      paymentStatus: order.payment_status,
      orderDate: new Date(order.paid_at ?? order.created_at),
      source: "tiendanube",
      items: {
        create: await Promise.all(
          order.products.map(async (item) => {
            await ensureProduct(storeIdStr, credential.accessToken, item);

            let sku = item.sku ?? null;
            if (!sku) {
              sku = await fetchVariantSku(
                storeIdStr,
                credential.accessToken,
                toStringId(item.product_id),
                toStringId(item.variant_id)
              );
            }

            return {
              productId: toStringId(item.product_id),
              variantId: toStringId(item.variant_id),
              sku,
              name: item.name,
              quantity: item.quantity,
              price: toDecimalString(item.price),
            };
          })
        ),
      },
    },
  });
}
