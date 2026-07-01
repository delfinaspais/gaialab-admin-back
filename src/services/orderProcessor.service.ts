import { prisma } from "../lib/prisma";
import { mapOrderPaymentData, type OrderPaymentData } from "./orderPayment.mapper";
import { fetchAllPaidOrderIds, fetchOrder, fetchVariantSku } from "./tiendanube/order.service";
import { fetchOrderTransactions } from "./tiendanube/transaction.service";
import type { TiendanubeOrder, TiendanubeOrderProduct } from "../types/tiendanube";

export type OrderSyncAction = "created" | "updated" | "skipped";

export interface OrderSyncResult {
  orderId: string;
  action: OrderSyncAction;
  error?: string;
}

export interface SyncPaidOrdersResult {
  storeId: string;
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  results: OrderSyncResult[];
}

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

function buildOrderPaymentFields(order: TiendanubeOrder, payment: OrderPaymentData) {
  return {
    customerName: resolveCustomerName(order),
    subtotal: payment.subtotal,
    shippingCost: payment.shippingCost,
    shippingMethod: payment.shippingMethod,
    discount: payment.discount,
    total: toDecimalString(order.total),
    totalPaidByCustomer: payment.totalPaidByCustomer,
    processingFee: payment.processingFee,
    installmentsFee: payment.installmentsFee,
    netTotal: payment.netTotal,
    currency: payment.currency,
    paymentMethod: payment.paymentMethod,
    paymentGateway: payment.paymentGateway,
    cardBrand: payment.cardBrand,
    cardLastDigits: payment.cardLastDigits,
    installments: payment.installments,
    installmentsInterestFree: payment.installmentsInterestFree,
    transactionId: payment.transactionId,
    paymentStatus: order.payment_status,
    orderDate: new Date(order.paid_at ?? order.created_at),
  };
}

async function ensureProduct(
  storeId: string,
  accessToken: string,
  item: TiendanubeOrderProduct
) {
  const productId = toStringId(item.product_id);
  const variantId = toStringId(item.variant_id);
  const precioVenta = toDecimalString(item.price);

  let sku = item.sku ?? null;
  if (!sku) {
    sku = await fetchVariantSku(storeId, accessToken, productId, variantId);
  }

  return prisma.product.upsert({
    where: {
      storeId_variantId: {
        storeId,
        variantId,
      },
    },
    create: {
      storeId,
      productId,
      variantId,
      sku,
      name: item.name,
      precioVenta,
      costoUnitario: null,
      status: "pending_cost",
    },
    update: {
      name: item.name,
      sku,
      precioVenta,
    },
  });
}

async function buildOrderItems(
  storeId: string,
  accessToken: string,
  products: TiendanubeOrderProduct[]
) {
  return Promise.all(
    products.map(async (item) => {
      await ensureProduct(storeId, accessToken, item);

      let sku = item.sku ?? null;
      if (!sku) {
        sku = await fetchVariantSku(
          storeId,
          accessToken,
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
  );
}

export async function syncPaidOrder(
  storeId: string,
  orderId: string,
  options?: { updateIfExists?: boolean }
): Promise<OrderSyncAction> {
  const storeIdStr = toStringId(storeId);
  const orderIdStr = toStringId(orderId);
  const updateIfExists = options?.updateIfExists ?? false;

  const credential = await prisma.storeCredential.findUnique({
    where: { storeId: storeIdStr },
  });

  if (!credential) {
    throw new Error(`No credentials found for store ${storeIdStr}`);
  }

  const order = await fetchOrder(storeIdStr, credential.accessToken, orderIdStr);

  if (order.payment_status !== "paid") {
    return "skipped";
  }

  const transactions = await fetchOrderTransactions(
    storeIdStr,
    credential.accessToken,
    orderIdStr
  );
  const payment = mapOrderPaymentData(order, transactions);
  const orderFields = buildOrderPaymentFields(order, payment);

  const existingOrder = await prisma.order.findUnique({
    where: {
      storeId_orderId: {
        storeId: storeIdStr,
        orderId: orderIdStr,
      },
    },
  });

  if (existingOrder) {
    if (!updateIfExists) {
      return "skipped";
    }

    await prisma.order.update({
      where: { id: existingOrder.id },
      data: orderFields,
    });

    return "updated";
  }

  await prisma.order.create({
    data: {
      orderId: orderIdStr,
      storeId: storeIdStr,
      source: "tiendanube",
      ...orderFields,
      items: {
        create: await buildOrderItems(storeIdStr, credential.accessToken, order.products),
      },
    },
  });

  return "created";
}

export async function processPaidOrder(storeId: string, orderId: string): Promise<void> {
  await syncPaidOrder(storeId, orderId, { updateIfExists: false });
}

export async function syncPaidOrders(options?: {
  storeId?: string;
  updateExisting?: boolean;
}): Promise<SyncPaidOrdersResult[]> {
  const updateExisting = options?.updateExisting ?? true;

  const credentials = options?.storeId
    ? await prisma.storeCredential.findMany({ where: { storeId: options.storeId } })
    : await prisma.storeCredential.findMany();

  if (credentials.length === 0) {
    throw new Error("No store credentials found. Run OAuth install first.");
  }

  const summaries: SyncPaidOrdersResult[] = [];

  for (const credential of credentials) {
    const orderIds = await fetchAllPaidOrderIds(credential.storeId, credential.accessToken);
    const results: OrderSyncResult[] = [];

    for (const orderId of orderIds) {
      try {
        const action = await syncPaidOrder(credential.storeId, orderId, {
          updateIfExists: updateExisting,
        });
        results.push({ orderId, action });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        results.push({ orderId, action: "skipped", error: message });
      }
    }

    summaries.push({
      storeId: credential.storeId,
      total: orderIds.length,
      created: results.filter((result) => result.action === "created").length,
      updated: results.filter((result) => result.action === "updated").length,
      skipped: results.filter((result) => result.action === "skipped" && !result.error).length,
      failed: results.filter((result) => !!result.error).length,
      results,
    });
  }

  return summaries;
}
