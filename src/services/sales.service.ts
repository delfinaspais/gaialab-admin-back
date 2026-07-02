import { prisma } from "../lib/prisma";
import {
  personalProductVariantId,
  resolvePersonalProductForSale,
} from "./personalProduct.service";

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

export interface ListSalesOptions extends ListSalesFilters {
  page?: number;
  limit?: number;
  export?: boolean;
}

export interface PaginatedSalesResult {
  data: SaleSummary[];
  total: number;
  page: number;
  limit: number;
}

export interface SalesStats {
  totalVentas: number;
  ventasPersonal: number;
  ventasTiendaNube: number;
  productosVendidos: number;
  productosPersonal: number;
  productosTiendaNube: number;
  ingresoBruto: string;
  ingresoNeto: string;
}

export interface PersonalSaleItemInput {
  productoId?: string;
  producto?: string;
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

export type UpdatePersonalSaleInput = CreatePersonalSaleInput;

async function buildProductByVariantMap() {
  const products = await prisma.product.findMany({ where: { storeId: PERSONAL_STORE_ID } });
  const personalProducts = await prisma.personalProduct.findMany();
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

  for (const personalProduct of personalProducts) {
    productByVariant.set(
      `${PERSONAL_STORE_ID}:${personalProductVariantId(personalProduct.id)}`,
      {
        costoUnitario: personalProduct.costoUnitario,
        categoria: personalProduct.categoria,
        sku: null,
      }
    );
  }

  return productByVariant;
}

async function buildPersonalOrderItems(items: PersonalSaleItemInput[]) {
  return Promise.all(
    items.map(async (item) => {
      const personalProduct = await resolvePersonalProductForSale(item);
      const variantId = personalProductVariantId(personalProduct.id);

      return {
        productId: personalProduct.id,
        variantId,
        name: personalProduct.name,
        categoria: item.categoria ?? personalProduct.categoria,
        quantity: item.cantidad,
        price: item.precioUnitario.toFixed(2),
      };
    })
  );
}

function calculatePersonalSaleTotals(items: PersonalSaleItemInput[], descuento = 0) {
  const subtotal = items.reduce(
    (sum, item) => sum + item.precioUnitario * item.cantidad,
    0
  );
  const total = Math.max(subtotal - descuento, 0);

  return { subtotal, total };
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
  productByVariant: Map<string, { costoUnitario: { toString(): string } | null; categoria: string | null; sku: string | null }>,
  options?: { includeItems?: boolean; includePago?: boolean }
): SaleSummary {
  const includeItems = options?.includeItems ?? true;
  const includePago = options?.includePago ?? true;

  const items = order.items.map((item) => {
    const product = productByVariant.get(`${order.storeId}:${item.variantId}`) ?? null;
    return buildItemDetail(item, product);
  });

  const ingresoItems = items.reduce((sum, item) => sum + parseFloat(item.ingresoBruto), 0);
  const costoVariableTotal = items.every((item) => item.costoVariableTotal !== null)
    ? items.reduce((sum, item) => sum + parseFloat(item.costoVariableTotal!), 0)
    : null;

  const isTiendanube = order.source === "tiendanube";
  const pago = isTiendanube && includePago ? buildTiendanubePaymentDetail(order) : null;

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
    items: includeItems ? items : [],
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

function buildSalesWhere(filters?: ListSalesFilters) {
  const canal = filters?.canal ?? "all";
  const orderDateFilter = buildOrderDateFilter(filters?.mes);

  return {
    ...(canal !== "all" ? { source: canal } : {}),
    ...(orderDateFilter ? { orderDate: orderDateFilter } : {}),
  };
}

type OrderWithItems = {
  id: string;
  orderId: string;
  orderDate: Date;
  source: string;
  storeId: string;
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
  }>;
};

async function buildProductByVariantMapForOrders(orders: OrderWithItems[]) {
  const variantFilters = new Map<string, Set<string>>();

  for (const order of orders) {
    if (!variantFilters.has(order.storeId)) {
      variantFilters.set(order.storeId, new Set());
    }
    for (const item of order.items) {
      variantFilters.get(order.storeId)!.add(item.variantId);
    }
  }

  const productOr: Array<{ storeId: string; variantId: string }> = [];
  for (const [storeId, variantIds] of variantFilters) {
    for (const variantId of variantIds) {
      productOr.push({ storeId, variantId });
    }
  }

  const products =
    productOr.length > 0
      ? await prisma.product.findMany({
          where: { OR: productOr },
        })
      : [];

  const personalIds = new Set<string>();
  for (const order of orders) {
    if (order.storeId !== PERSONAL_STORE_ID) {
      continue;
    }
    for (const item of order.items) {
      if (item.variantId.startsWith("personal-")) {
        personalIds.add(item.variantId.slice("personal-".length));
      }
    }
  }

  const personalProducts =
    personalIds.size > 0
      ? await prisma.personalProduct.findMany({
          where: { id: { in: Array.from(personalIds) } },
        })
      : [];

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

  for (const personalProduct of personalProducts) {
    productByVariant.set(
      `${PERSONAL_STORE_ID}:${personalProductVariantId(personalProduct.id)}`,
      {
        costoUnitario: personalProduct.costoUnitario,
        categoria: personalProduct.categoria,
        sku: null,
      }
    );
  }

  return productByVariant;
}

function mapOrdersToSummaries(
  orders: OrderWithItems[],
  productByVariant: Map<string, { costoUnitario: { toString(): string } | null; categoria: string | null; sku: string | null }>,
  options?: { includeItems?: boolean; includePago?: boolean }
): SaleSummary[] {
  return orders.map((order) => buildSaleSummary(order, productByVariant, options));
}

function computeIngresosFromOrderFields(order: {
  source: string;
  total: { toString(): string };
  totalPaidByCustomer: { toString(): string } | null;
  netTotal: { toString(): string } | null;
  discount: { toString(): string } | null;
  items: Array<{ quantity: number; price: { toString(): string } }>;
}): { ingresoBruto: number; ingresoNeto: number } {
  const ingresoItems = order.items.reduce(
    (sum, item) => sum + (toNumber(item.price) ?? 0) * item.quantity,
    0
  );

  const isTiendanube = order.source === "tiendanube";
  const totalPagado = toNumber(order.totalPaidByCustomer) ?? toNumber(order.total);
  const ingresoBruto = isTiendanube && totalPagado !== null ? totalPagado : ingresoItems;

  const netTotal = toNumber(order.netTotal);
  const descuento = toNumber(order.discount?.toString() ?? null) ?? 0;
  const ingresoNeto =
    isTiendanube && netTotal !== null ? netTotal : Math.max(ingresoBruto - descuento, 0);

  return { ingresoBruto, ingresoNeto };
}

const orderWithItemsInclude = {
  items: {
    select: {
      id: true,
      name: true,
      categoria: true,
      quantity: true,
      price: true,
      sku: true,
      variantId: true,
    },
  },
} as const;

export async function listSalesPaginated(options?: ListSalesOptions): Promise<PaginatedSalesResult> {
  const where = buildSalesWhere(options);
  const isExport = options?.export === true;
  const page = Math.max(options?.page ?? 1, 1);
  const limit = isExport ? undefined : Math.min(Math.max(options?.limit ?? 15, 1), 100);
  const skip = isExport || limit === undefined ? undefined : (page - 1) * limit;

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: orderWithItemsInclude,
      orderBy: { orderDate: "desc" },
      ...(skip !== undefined ? { skip, take: limit } : {}),
    }),
  ]);

  const productByVariant = await buildProductByVariantMapForOrders(orders);
  const includeItems = isExport;
  const includePago = true;

  return {
    data: mapOrdersToSummaries(orders, productByVariant, { includeItems, includePago }),
    total,
    page: isExport ? 1 : page,
    limit: isExport ? total : (limit ?? total),
  };
}

export async function getSaleById(id: string): Promise<SaleSummary | null> {
  const order = await prisma.order.findUnique({
    where: { id },
    include: orderWithItemsInclude,
  });

  if (!order) {
    return null;
  }

  const productByVariant = await buildProductByVariantMapForOrders([order]);
  return buildSaleSummary(order, productByVariant, { includeItems: true, includePago: true });
}

export async function getSalesStats(filters?: ListSalesFilters): Promise<SalesStats> {
  const where = buildSalesWhere(filters);

  const orders = await prisma.order.findMany({
    where,
    select: {
      source: true,
      total: true,
      totalPaidByCustomer: true,
      netTotal: true,
      discount: true,
      items: { select: { quantity: true, price: true } },
    },
  });

  let ventasPersonal = 0;
  let ventasTiendaNube = 0;
  let productosPersonal = 0;
  let productosTiendaNube = 0;
  let ingresoBruto = 0;
  let ingresoNeto = 0;

  for (const order of orders) {
    const units = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const { ingresoBruto: bruto, ingresoNeto: neto } = computeIngresosFromOrderFields(order);

    ingresoBruto += bruto;
    ingresoNeto += neto;

    if (order.source === "personal") {
      ventasPersonal += 1;
      productosPersonal += units;
    } else {
      ventasTiendaNube += 1;
      productosTiendaNube += units;
    }
  }

  return {
    totalVentas: orders.length,
    ventasPersonal,
    ventasTiendaNube,
    productosVendidos: productosPersonal + productosTiendaNube,
    productosPersonal,
    productosTiendaNube,
    ingresoBruto: ingresoBruto.toFixed(2),
    ingresoNeto: ingresoNeto.toFixed(2),
  };
}

export async function getAvailableSaleMonthsFromDb(): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ month: string }>>`
    SELECT DISTINCT to_char("orderDate" AT TIME ZONE 'UTC', 'YYYY-MM') AS month
    FROM "Order"
    ORDER BY month DESC
  `;

  return rows.map((row) => row.month);
}

export async function listSales(filters?: ListSalesFilters): Promise<SaleSummary[]> {
  const result = await listSalesPaginated({ ...filters, export: true });
  return result.data;
}

export async function createPersonalSale(input: CreatePersonalSaleInput): Promise<SaleSummary> {
  const orderDate = new Date(input.fecha);
  if (Number.isNaN(orderDate.getTime())) {
    throw new Error("Invalid sale date");
  }

  const orderId = `P-${Date.now()}`;
  const descuento = input.descuento ?? 0;
  const { subtotal, total } = calculatePersonalSaleTotals(input.items, descuento);

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
        create: await buildPersonalOrderItems(input.items),
      },
    },
    include: { items: true },
  });

  const productByVariant = await buildProductByVariantMap();
  return buildSaleSummary(order, productByVariant);
}

export async function updatePersonalSale(
  id: string,
  input: UpdatePersonalSaleInput
): Promise<SaleSummary | null> {
  const existing = await prisma.order.findFirst({
    where: { id, source: "personal" },
  });

  if (!existing) {
    return null;
  }

  const orderDate = new Date(input.fecha);
  if (Number.isNaN(orderDate.getTime())) {
    throw new Error("Invalid sale date");
  }

  const descuento = input.descuento ?? 0;
  const { subtotal, total } = calculatePersonalSaleTotals(input.items, descuento);
  const items = await buildPersonalOrderItems(input.items);

  const order = await prisma.$transaction(async (tx) => {
    await tx.orderItem.deleteMany({
      where: { orderDbId: existing.id },
    });

    return tx.order.update({
      where: { id: existing.id },
      data: {
        customerName: input.cliente,
        subtotal: subtotal.toFixed(2),
        discount: descuento.toFixed(2),
        total: total.toFixed(2),
        totalPaidByCustomer: input.cobrado === false ? null : total.toFixed(2),
        paymentStatus: input.cobrado === false ? "pending" : "paid",
        orderDate,
        items: {
          create: items,
        },
      },
      include: { items: true },
    });
  });

  const productByVariant = await buildProductByVariantMap();
  return buildSaleSummary(order, productByVariant);
}

export function getAvailableSaleMonths(sales: SaleSummary[]): string[] {
  const months = new Set(
    sales.map((sale) => getMonthKey(new Date(sale.fecha)))
  );
  return Array.from(months).sort((a, b) => b.localeCompare(a));
}
