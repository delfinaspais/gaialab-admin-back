import { prisma } from "../lib/prisma";

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

function formatMonth(date: Date): string {
  const month = date.toLocaleString("es-AR", { month: "short" }).replace(".", "");
  const year = date.getFullYear().toString().slice(-2);
  return `${month}-${year}`;
}

function formatChannel(source: string): string {
  if (source === "tiendanube") {
    return "Tienda Nube";
  }
  return source;
}

export interface SalesLine {
  id: string;
  fecha: string;
  mes: string;
  producto: string;
  categoria: string | null;
  canal: string;
  cliente: string | null;
  cantidad: number;
  precioUnitario: string;
  precioVentaCatalogo: string | null;
  descuentoLinea: string | null;
  descuentoOrden: string | null;
  ingresoBruto: string;
  ingresoNeto: string;
  costoUnitario: string | null;
  costoVariableTotal: string | null;
  margenBruto: string | null;
  margenPorcentaje: string | null;
  cobrado: boolean;
  orderId: string;
  storeId: string;
  variantId: string;
  productId: string;
  sku: string | null;
  currency: string | null;
  paymentMethod: string | null;
  paymentGateway: string | null;
}

export async function listSalesLines(): Promise<SalesLine[]> {
  const orders = await prisma.order.findMany({
    include: { items: true },
    orderBy: { orderDate: "desc" },
  });

  const products = await prisma.product.findMany();
  const productByVariant = new Map(
    products.map((product) => [`${product.storeId}:${product.variantId}`, product])
  );

  const lines: SalesLine[] = [];

  for (const order of orders) {
    const descuentoOrden = order.discount?.toString() ?? null;

    for (const item of order.items) {
      const product = productByVariant.get(`${order.storeId}:${item.variantId}`);
      const precioUnitario = toNumber(item.price) ?? 0;
      const cantidad = item.quantity;
      const ingresoBruto = precioUnitario * cantidad;
      const costoUnitario = toNumber(product?.costoUnitario ?? null);
      const costoVariableTotal =
        costoUnitario !== null ? costoUnitario * cantidad : null;
      const margenBruto =
        costoVariableTotal !== null ? ingresoBruto - costoVariableTotal : null;
      const margenPorcentaje =
        margenBruto !== null && ingresoBruto > 0
          ? (margenBruto / ingresoBruto) * 100
          : null;

      lines.push({
        id: item.id,
        fecha: order.orderDate.toISOString(),
        mes: formatMonth(order.orderDate),
        producto: item.name,
        categoria: product?.categoria ?? null,
        canal: formatChannel(order.source),
        cliente: order.customerName,
        cantidad,
        precioUnitario: precioUnitario.toFixed(2),
        precioVentaCatalogo: product?.precioVenta?.toString() ?? null,
        descuentoLinea: null,
        descuentoOrden,
        ingresoBruto: ingresoBruto.toFixed(2),
        ingresoNeto: ingresoBruto.toFixed(2),
        costoUnitario: toFixed(costoUnitario),
        costoVariableTotal: toFixed(costoVariableTotal),
        margenBruto: toFixed(margenBruto),
        margenPorcentaje: toFixed(margenPorcentaje, 1),
        cobrado: order.paymentStatus === "paid",
        orderId: order.orderId,
        storeId: order.storeId,
        variantId: item.variantId,
        productId: item.productId,
        sku: item.sku ?? product?.sku ?? null,
        currency: order.currency,
        paymentMethod: order.paymentMethod,
        paymentGateway: order.paymentGateway,
      });
    }
  }

  return lines;
}
