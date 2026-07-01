import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma";

const PERSONAL_STORE_ID = "personal";

function toNumber(value: { toString(): string } | string | number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function toFixed(value: number | null, digits = 2): string | null {
  return value === null ? null : value.toFixed(digits);
}

function formatChannel(source: string): string {
  if (source === "tiendanube") {
    return "Tienda Nube";
  }
  if (source === "personal") {
    return "Personal";
  }
  return source;
}

function getCanalKey(source: string): "tiendanube" | "personal" {
  return source === "personal" ? "personal" : "tiendanube";
}

function getMonthKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export interface SaleItemDetail {
  id: string;
  producto: string;
  categoria: string | null;
  cantidad: number;
  precioUnitario: string;
  costoUnitario: string | null;
  ingresoBruto: string;
  costoVariableTotal: string | null;
  margenBruto: string | null;
  margenPorcentaje: string | null;
  sku: string | null;
}

export interface SalePaymentDetail {
  subtotal: string | null;
  costoEnvio: string | null;
  metodoEnvio: string | null;
  totalPagadoCliente: string | null;
  costoProcesamiento: string | null;
  costoCuotas: string | null;
  totalNeto: string | null;
  installments: number | null;
  installmentsInterestFree: boolean | null;
  cardBrand: string | null;
  cardLastDigits: string | null;
  transactionId: string | null;
}

export interface SaleSummary {
  id: string;
  orderId: string;
  nroOrden: string;
  fecha: string;
  canal: string;
  canalKey: "tiendanube" | "personal";
  cliente: string | null;
  cantidadItems: number;
  cantidadUnidades: number;
  ingresoBruto: string;
  ingresoNeto: string;
  descuentoOrden: string | null;
  costoVariableTotal: string | null;
  margenBruto: string | null;
  margenPorcentaje: string | null;
  cobrado: boolean;
  currency: string | null;
  paymentMethod: string | null;
  paymentGateway: string | null;
  pago: SalePaymentDetail | null;
  items: SaleItemDetail[];
}

export interface ListSalesFilters {
  mes?: string;
  canal?: "tiendanube" | "personal" | "all";
}

export interface PersonalSaleItemInput {
  producto: string;
  categoria?: string;
  cantidad: number;
  precioUnitario: number;
  costoUnitario?: number;
}

export interface CreatePersonalSaleInput {
  fecha: string;
  cliente: string;
  cobrado?: boolean;
  descuento?: number;
  items: PersonalSaleItemInput[];
}

function buildItemDetail(
  item: {
    id: string;
    name: string;
    categoria: string | null;
    quantity: number;
    price: { toString(): string };
    sku: string | null;
    variantId: string;
  },
  product: {
    costoUnitario: { toString(): string } | null;
    categoria: string | null;
    sku: string | null;
  } | null
): SaleItemDetail {
  const precioUnitario = toNumber(item.price) ?? 0;
  const cantidad = item.quantity;
  const ingresoBruto = precioUnitario * cantidad;
  const costoUnitario = toNumber(product?.costoUnitario ?? null);
  const costoVariableTotal = costoUnitario !== null ? costoUnitario * cantidad : null;
  const margenBruto = costoVariableTotal !== null ? ingresoBruto - costoVariableTotal : null;
  const margenPorcentaje =
    margenBruto !== null && ingresoBruto > 0 ? (margenBruto / ingresoBruto) * 100 : null;

  return {
    id: item.id,
    producto: item.name,
    categoria: item.categoria ?? product?.categoria ?? null,
    cantidad,
    precioUnitario: precioUnitario.toFixed(2),
    costoUnitario: toFixed(costoUnitario),
    ingresoBruto: ingresoBruto.toFixed(2),
    costoVariableTotal: toFixed(costoVariableTotal),
    margenBruto: toFixed(margenBruto),
    margenPorcentaje: toFixed(margenPorcentaje, 1),
    sku: item.sku ?? product?.sku ?? null,
  };
}

function buildTiendanubePaymentDetail(order: {
  subtotal: { toString(): string } | null;
  shippingCost: { toString(): string } | null;
  shippingCostOwner: { toString(): string } | null;
  shippingMethod: string | null;
  totalPaidByCustomer: { toString(): string } | null;
  processingFee: { toString(): string } | null;
  installmentsFee: { toString(): string } | null;
  netTotal: { toString(): string } | null;
  installments: number | null;
  installmentsInterestFree: boolean | null;
  cardBrand: string | null;
  cardLastDigits: string | null;
  transactionId: string | null;
}): SalePaymentDetail {
  const costoEnvio =
    order.shippingCostOwner?.toString() ?? order.shippingCost?.toString() ?? null;

  return {
    subtotal: order.subtotal?.toString() ?? null,
    costoEnvio,
    metodoEnvio: order.shippingMethod,
    totalPagadoCliente: order.totalPaidByCustomer?.toString() ?? null,
    costoProcesamiento: order.processingFee?.toString() ?? null,
    costoCuotas: order.installmentsFee?.toString() ?? null,
    totalNeto: order.netTotal?.toString() ?? null,
    installments: order.installments,
    installmentsInterestFree: order.installmentsInterestFree,
    cardBrand: order.cardBrand,
    cardLastDigits: order.cardLastDigits,
    transactionId: order.transactionId,
  };
}

function buildSaleSummary(
  order: {
    id: string;
    orderId: string;
    orderDate: Date;
    source: string;
    customerName: string | null;
    subtotal: { toString(): string } | null;
    shippingCost: { toString(): string } | null;
    shippingCostOwner: { toString(): string } | null;
    shippingMethod: string | null;
    discount: { toString(): string } | null;
    total: { toString(): string };
    totalPaidByCustomer: { toString(): string } | null;
    processingFee: { toString(): string } | null;
    installmentsFee: { toString(): string } | null;
    netTotal: { toString(): string } | null;
    installments: number | null;
    installmentsInterestFree: boolean | null;
    cardBrand: string | null;
    cardLastDigits: string | null;
    transactionId: string | null;
    currency: string | null;
    paymentStatus: string;
    paymentMethod: string | null;
    paymentGateway: string | null;
    items: Array<{
      id: string;
      name: string;
      categoria: string | null;
      quantity: number;
      price: { toString(): string };
      sku: string | null;
      variantId: string;
      storeId?: string;
    }>;
    storeId: string;
  },
  productByVariant: Map<string, { costoUnitario: { toString(): string } | null; categoria: string | null; sku: string | null }>
): SaleSummary {
  const items = order.items.map((item) => {
    const product = productByVariant.get(`${order.storeId}:${item.variantId}`) ?? null;
    return buildItemDetail(item, product);
  });

  const ingresoItems = items.reduce((sum, item) => sum + parseFloat(item.ingresoBruto), 0);
  const costoVariableTotal = items.every((item) => item.costoVariableTotal !== null)
    ? items.reduce((sum, item) => sum + parseFloat(item.costoVariableTotal!), 0)
    : null;

  const isTiendanube = order.source === "tiendanube";
  const pago = isTiendanube ? buildTiendanubePaymentDetail(order) : null;

  const totalPagado = toNumber(order.totalPaidByCustomer) ?? toNumber(order.total);
  const ingresoBruto = isTiendanube && totalPagado !== null ? totalPagado : ingresoItems;

  const netTotal = toNumber(order.netTotal);
  const descuentoOrden = order.discount?.toString() ?? null;
  const descuento = descuentoOrden ? parseFloat(descuentoOrden) : 0;
  const ingresoNeto =
    isTiendanube && netTotal !== null
      ? netTotal
      : Math.max(ingresoBruto - descuento, 0);

  const margenBruto =
    costoVariableTotal !== null ? ingresoNeto - costoVariableTotal : null;
  const margenPorcentaje =
    margenBruto !== null && ingresoNeto > 0 ? (margenBruto / ingresoNeto) * 100 : null;

  return {
    id: order.id,
    orderId: order.orderId,
    nroOrden: order.orderId,
    fecha: order.orderDate.toISOString(),
    canal: formatChannel(order.source),
    canalKey: getCanalKey(order.source),
    cliente: order.customerName,
    cantidadItems: items.length,
    cantidadUnidades: items.reduce((sum, item) => sum + item.cantidad, 0),
    ingresoBruto: ingresoBruto.toFixed(2),
    ingresoNeto: ingresoNeto.toFixed(2),
    descuentoOrden,
    costoVariableTotal: toFixed(costoVariableTotal),
    margenBruto: toFixed(margenBruto),
    margenPorcentaje: toFixed(margenPorcentaje, 1),
    cobrado: order.paymentStatus === "paid",
    currency: order.currency,
    paymentMethod: order.paymentMethod,
    paymentGateway: order.paymentGateway,
    pago,
    items,
  };
}

function buildOrderDateFilter(mes?: string) {
  if (!mes || !/^\d{4}-\d{2}$/.test(mes)) {
    return undefined;
  }

  const [year, month] = mes.split("-").map(Number);
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 1));

  return {
    gte: from,
    lt: to,
  };
}

export async function listSales(filters?: ListSalesFilters): Promise<SaleSummary[]> {
  const canal = filters?.canal ?? "all";
  const orderDateFilter = buildOrderDateFilter(filters?.mes);

  const orders = await prisma.order.findMany({
    where: {
      ...(canal !== "all" ? { source: canal } : {}),
      ...(orderDateFilter ? { orderDate: orderDateFilter } : {}),
    },
    include: { items: true },
    orderBy: { orderDate: "desc" },
  });

  const products = await prisma.product.findMany();
  const productByVariant = new Map(
    products.map((product) => [
      `${product.storeId}:${product.variantId}`,
      {
        costoUnitario: product.costoUnitario,
        categoria: product.categoria,
        sku: product.sku,
      },
    ])
  );

  return orders.map((order) => buildSaleSummary(order, productByVariant));
}

export async function createPersonalSale(input: CreatePersonalSaleInput): Promise<SaleSummary> {
  const orderDate = new Date(input.fecha);
  if (Number.isNaN(orderDate.getTime())) {
    throw new Error("Invalid sale date");
  }

  const orderId = `P-${Date.now()}`;
  const descuento = input.descuento ?? 0;
  const subtotal = input.items.reduce(
    (sum, item) => sum + item.precioUnitario * item.cantidad,
    0
  );
  const total = Math.max(subtotal - descuento, 0);

  const order = await prisma.order.create({
    data: {
      orderId,
      storeId: PERSONAL_STORE_ID,
      customerName: input.cliente,
      subtotal: subtotal.toFixed(2),
      discount: descuento.toFixed(2),
      total: total.toFixed(2),
      totalPaidByCustomer: input.cobrado === false ? null : total.toFixed(2),
      currency: "ARS",
      paymentStatus: input.cobrado === false ? "pending" : "paid",
      paymentMethod: "Personal",
      paymentGateway: "Personal",
      orderDate,
      source: "personal",
      items: {
        create: await Promise.all(
          input.items.map(async (item) => {
            const variantId = `manual-${randomUUID()}`;

            if (item.costoUnitario !== undefined) {
              await prisma.product.upsert({
                where: {
                  storeId_variantId: {
                    storeId: PERSONAL_STORE_ID,
                    variantId,
                  },
                },
                create: {
                  storeId: PERSONAL_STORE_ID,
                  productId: "manual",
                  variantId,
                  name: item.producto,
                  categoria: item.categoria ?? null,
                  costoUnitario: item.costoUnitario,
                  precioVenta: item.precioUnitario.toFixed(2),
                  activo: true,
                  status: "active",
                },
                update: {
                  name: item.producto,
                  categoria: item.categoria ?? null,
                  costoUnitario: item.costoUnitario,
                  precioVenta: item.precioUnitario.toFixed(2),
                  status: "active",
                },
              });
            }

            return {
              productId: "manual",
              variantId,
              name: item.producto,
              categoria: item.categoria ?? null,
              quantity: item.cantidad,
              price: item.precioUnitario.toFixed(2),
            };
          })
        ),
      },
    },
    include: { items: true },
  });

  const products = await prisma.product.findMany({ where: { storeId: PERSONAL_STORE_ID } });
  const productByVariant = new Map(
    products.map((product) => [
      `${product.storeId}:${product.variantId}`,
      {
        costoUnitario: product.costoUnitario,
        categoria: product.categoria,
        sku: product.sku,
      },
    ])
  );

  return buildSaleSummary(order, productByVariant);
}

export function getAvailableSaleMonths(sales: SaleSummary[]): string[] {
  const months = new Set(
    sales.map((sale) => getMonthKey(new Date(sale.fecha)))
  );
  return Array.from(months).sort((a, b) => b.localeCompare(a));
}
