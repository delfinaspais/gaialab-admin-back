import { prisma } from "../lib/prisma";

export interface PersonalProductSummary {
  id: string;
  name: string;
  categoria: string | null;
  costoUnitario: string | null;
  precioVenta: string | null;
}

export interface PersonalSaleItemResolveInput {
  productoId?: string;
  producto?: string;
  categoria?: string;
  precioUnitario: number;
  costoUnitario?: number;
}

function toSummary(product: {
  id: string;
  name: string;
  categoria: string | null;
  costoUnitario: { toString(): string } | null;
  precioVenta: { toString(): string } | null;
}): PersonalProductSummary {
  return {
    id: product.id,
    name: product.name,
    categoria: product.categoria,
    costoUnitario: product.costoUnitario?.toString() ?? null,
    precioVenta: product.precioVenta?.toString() ?? null,
  };
}

export async function listPersonalProducts(options?: {
  q?: string;
  limit?: number;
}): Promise<PersonalProductSummary[]> {
  const limit = Math.min(options?.limit ?? 50, 100);
  const query = options?.q?.trim();

  const products = await prisma.personalProduct.findMany({
    where: {
      activo: true,
      ...(query
        ? {
            name: {
              contains: query,
              mode: "insensitive",
            },
          }
        : {}),
    },
    orderBy: { name: "asc" },
    take: limit,
  });

  return products.map(toSummary);
}

export async function resolvePersonalProductForSale(
  item: PersonalSaleItemResolveInput
): Promise<PersonalProductSummary> {
  const precioVenta = item.precioUnitario.toFixed(2);
  const costoUnitario =
    item.costoUnitario !== undefined ? item.costoUnitario.toFixed(2) : undefined;

  if (item.productoId) {
    const existing = await prisma.personalProduct.findFirst({
      where: { id: item.productoId, activo: true },
    });

    if (!existing) {
      throw new Error(`Personal product not found: ${item.productoId}`);
    }

    const updated = await prisma.personalProduct.update({
      where: { id: existing.id },
      data: {
        ...(item.categoria !== undefined ? { categoria: item.categoria || null } : {}),
        precioVenta,
        ...(costoUnitario !== undefined ? { costoUnitario } : {}),
      },
    });

    return toSummary(updated);
  }

  const name = item.producto?.trim();
  if (!name) {
    throw new Error("Each item must include productoId or producto");
  }

  const byName = await prisma.personalProduct.findFirst({
    where: {
      activo: true,
      name: { equals: name, mode: "insensitive" },
    },
  });

  if (byName) {
    const updated = await prisma.personalProduct.update({
      where: { id: byName.id },
      data: {
        ...(item.categoria !== undefined ? { categoria: item.categoria || null } : {}),
        precioVenta,
        ...(costoUnitario !== undefined ? { costoUnitario } : {}),
      },
    });

    return toSummary(updated);
  }

  const created = await prisma.personalProduct.create({
    data: {
      name,
      categoria: item.categoria ?? null,
      precioVenta,
      costoUnitario: costoUnitario ?? null,
    },
  });

  return toSummary(created);
}

export function personalProductVariantId(productId: string): string {
  return `personal-${productId}`;
}
